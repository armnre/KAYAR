import { createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Pluggable media storage. `local` keeps the files on a docker volume,
 * `s3` talks to any S3-compatible endpoint (MinIO, Arvan, R2, …).
 */
export type StoredObject = { key: string; url: string; size: number };

export interface Storage {
  readonly driver: string;
  save(buf: Buffer, ext: string): Promise<StoredObject>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

const publicBase = () => (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');

class LocalStorage implements Storage {
  readonly driver = 'local';
  private dir = resolve(process.env.MEDIA_DIR ?? './storage/uploads');
  async save(buf: Buffer, ext: string): Promise<StoredObject> {
    const key = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${ext}`;
    const path = join(this.dir, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buf);
    return { key, url: this.urlFor(key), size: buf.byteLength };
  }
  async read(key: string): Promise<Buffer> {
    return readFile(this.safePath(key));
  }
  async remove(key: string): Promise<void> {
    await rm(this.safePath(key), { force: true });
  }
  urlFor(key: string): string {
    return `${publicBase()}/media/${key}`;
  }
  /** Rejects path traversal — the key must be a plain file name. */
  private safePath(key: string) {
    if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error('invalid storage key');
    const path = resolve(this.dir, key);
    if (!path.startsWith(resolve(this.dir))) throw new Error('invalid storage key');
    return path;
  }
}

/* ---------- S3 compatible (SigV4, no extra dependency) ---------- */
const sha256hex = (d: Buffer | string) => createHash('sha256').update(d).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

class S3Storage implements Storage {
  readonly driver = 's3';
  private endpoint = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
  private bucket = process.env.S3_BUCKET ?? '';
  private region = process.env.S3_REGION ?? 'us-east-1';
  private accessKey = process.env.S3_ACCESS_KEY_ID ?? '';
  private secretKey = process.env.S3_SECRET_ACCESS_KEY ?? '';
  private basePath = process.env.S3_BASE_PATH ?? '';

  private sign(method: string, path: string, payload: Buffer, extraHeaders: Record<string, string> = {}) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256hex(payload);
    const headers: Record<string, string> = {
      host: new URL(this.endpoint).host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders,
    };
    const signedHeaders = Object.keys(headers).map((h) => h.toLowerCase()).sort();
    const canonicalHeaders = signedHeaders.map((h) => `${h}:${(headers as any)[h] ?? (headers as any)[Object.keys(headers).find((k) => k.toLowerCase() === h)!] ?? ''}\n`).join('');
    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders.join(';'), payloadHash].join('\n');
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
    const kDate = hmac(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, this.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
    return headers;
  }

  private objectPath(key: string) {
    return `/${this.basePath ? this.basePath.replace(/^\//, '') + '/' : ''}${this.bucket}/${key}`.replace(/\/{2,}/g, '/');
  }

  async save(buf: Buffer, ext: string): Promise<StoredObject> {
    const key = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${ext}`;
    const path = this.objectPath(key);
    const headers = this.sign('PUT', path, buf, { 'content-type': 'application/octet-stream' });
    const res = await fetch(`${this.endpoint}${path}`, { method: 'PUT', headers, body: buf });
    if (!res.ok) throw new Error(`s3 upload failed: ${res.status}`);
    return { key, url: this.urlFor(key), size: buf.byteLength };
  }
  async read(key: string): Promise<Buffer> {
    const path = this.objectPath(key);
    const headers = this.sign('GET', path, Buffer.alloc(0));
    const res = await fetch(`${this.endpoint}${path}`, { method: 'GET', headers });
    if (!res.ok) throw new Error(`s3 read failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  async remove(key: string): Promise<void> {
    const path = this.objectPath(key);
    const headers = this.sign('DELETE', path, Buffer.alloc(0));
    await fetch(`${this.endpoint}${path}`, { method: 'DELETE', headers });
  }
  urlFor(key: string): string {
    const base = (process.env.S3_PUBLIC_URL ?? `${this.endpoint}/${this.bucket}`).replace(/\/$/, '');
    return `${base}/${key}`;
  }
}

let storage: Storage | null = null;
export function getStorage(): Storage {
  if (storage) return storage;
  const driver = (process.env.MEDIA_STORAGE ?? 'local').toLowerCase();
  if (driver === 's3') {
    if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error('MEDIA_STORAGE=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    }
    storage = new S3Storage();
  } else {
    storage = new LocalStorage();
  }
  return storage;
}

/** Detects the real image type from magic bytes — the file extension is never trusted. */
export function sniffImage(b: Uint8Array): { mime: string; ext: string; w?: number; h?: number } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png', w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return { mime: 'image/gif', ext: 'gif', w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: 'image/webp', ext: 'webp' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { mime: 'image/jpeg', ext: 'jpg', h: u16(i + 5), w: u16(i + 7) };
      i += 2 + u16(i + 2);
    }
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  return null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const cleanName = (s: string) => s.normalize('NFKC').replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim().slice(0, 120) || 'image';
