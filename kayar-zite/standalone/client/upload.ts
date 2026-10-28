// Standalone replacement for `zitejs/upload`: stores files on the KAYAR server (/upload → /uploads/...).
// Sends the signed-in session token (admin pages use the admin session, everything else the app session).
import { useState } from 'react';

export class FileUploadError extends Error {}

function toBlob(data: File | Blob | ArrayBuffer | string): Blob {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data]);
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(data);
  if (m) {
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] || 'application/octet-stream' });
  }
  return new Blob([data], { type: 'text/plain' });
}

function sessionToken() {
  const scopes = window.location.pathname.startsWith('/admin') ? ['admin', 'app'] : ['app', 'admin'];
  for (const s of scopes) {
    try {
      const raw = localStorage.getItem(`kayar.session.${s}`);
      if (!raw) continue;
      const { token, expiresAt } = JSON.parse(raw) as { token: string; expiresAt: string };
      if (token && new Date(expiresAt).getTime() > Date.now()) return token;
    } catch { /* ignore */ }
  }
  return '';
}

export async function uploadFile({ data, filename }: { data: File | Blob | ArrayBuffer | string; filename: string }) {
  const blob = toBlob(data);
  const token = sessionToken();
  if (!token) throw new FileUploadError('برای آپلود فایل ابتدا وارد حساب خود شوید.');
  const res = await fetch(`/upload?name=${encodeURIComponent(filename)}`, {
    method: 'POST', body: blob,
    headers: { 'Content-Type': blob.type || 'application/octet-stream', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new FileUploadError((await res.json().catch(() => ({}))).message || 'آپلود فایل ناموفق بود؛ دوباره تلاش کنید.');
  const { url } = await res.json();
  return { fileUrl: url as string };
}

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  const upload = async (file: File | Blob | ArrayBuffer | string, filename?: string) => {
    setUploading(true);
    try {
      const name = filename || (file instanceof File ? file.name : 'file.bin');
      const { fileUrl } = await uploadFile({ data: file, filename: name });
      return { url: fileUrl };
    } finally { setUploading(false); }
  };
  return { upload, isUploading };
}
