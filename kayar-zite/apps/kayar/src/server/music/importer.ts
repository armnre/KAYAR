/** Morshed import pipeline: enabled adapters → quality/content filters → reachability probe (from Iran) → dedupe/blocklist → Tracks (status=pending). */
import { zite } from 'zitejs/db';
import { ADAPTERS, type Row } from './adapters';
import { classify, dedupeKey, normFa, rejectReason } from './classify';
import { probeAudio, relayEnabled, relayHealth } from './http';

const PROBE_CONCURRENCY = relayEnabled ? 12 : 8;

type SourceState = { enabled: boolean; acceptedBy?: string; acceptedAt?: string };
export type Job = { running: boolean; startedAt: string; finishedAt?: string; source: string; target: number; scanned: number; added: number; rejected: number; log: string[]; error?: string };

const KEY_SOURCES = 'morshed.sources';
const KEY_BLOCK = 'morshed.blocklist';
const KEY_JOB = 'morshed.lastImport';
const KEY_AUTO = 'morshed.auto';
const KEY_MIRROR = 'morshed.mirror';

async function readJson<T>(key: string, d: T): Promise<{ v: T; id?: string }> {
  const r = await zite.siteSettings.findOne({ filters: { key } });
  try { return { v: { ...d, ...JSON.parse(r?.value || '{}') } as T, id: r?.id }; } catch { return { v: d, id: r?.id }; }
}
async function writeJson(key: string, v: unknown) {
  await zite.siteSettings.bulkCreate({ records: [{ key, value: JSON.stringify(v) }], matchOn: ['key'] });
}

export async function getSources() {
  const { v } = await readJson<Record<string, SourceState>>(KEY_SOURCES, {});
  return ADAPTERS.map((a) => ({ id: a.id, name: a.name, site: a.site, note: a.note, openLicense: a.openLicense, enabled: !!v[a.id]?.enabled, acceptedBy: v[a.id]?.acceptedBy ?? '', acceptedAt: v[a.id]?.acceptedAt ?? '' }));
}
export async function setSource(id: string, enabled: boolean, acceptedBy: string, accepted: boolean) {
  const a = ADAPTERS.find((x) => x.id === id);
  if (!a) throw new Error('unknown source');
  if (enabled && !a.openLicense && !accepted) throw new Error('license not accepted');
  const { v } = await readJson<Record<string, SourceState>>(KEY_SOURCES, {});
  v[id] = enabled ? { enabled, acceptedBy, acceptedAt: new Date().toISOString() } : { enabled: false };
  await writeJson(KEY_SOURCES, v);
}

export async function getBlocklist() {
  const { v } = await readJson<{ tracks: string[]; artists: string[] }>(KEY_BLOCK, { tracks: [], artists: [] });
  return v;
}
export async function addToBlocklist(o: { track?: string; artist?: string }) {
  const b = await getBlocklist();
  if (o.track) b.tracks = [...new Set([...b.tracks, o.track])].slice(-5000);
  if (o.artist) b.artists = [...new Set([...b.artists, normFa(o.artist)])].slice(-2000);
  await writeJson(KEY_BLOCK, b);
}

let job: Job | null = null;
export async function getJob(): Promise<Job | null> {
  if (job) return job;
  const { v, id } = await readJson<Job | Record<string, never>>(KEY_JOB, {});
  return id && 'startedAt' in v ? { ...(v as Job), running: false } : null;
}

const toRecord = (r: Row, key: string, dur: number, publish: boolean) => {
  const c = classify(`${r.text} ${r.title}`, r.lang);
  return {
    title: r.title, artist: r.artist, album: r.album, artwork: r.art, coverUrl: r.art, audioUrl: r.audioUrl,
    durationSec: dur, durationSeconds: dur, genre: c.genre, categories: c.genre, tags: [r.lang, c.style, r.sourceName.toLowerCase()].join(','),
    license: r.license, licenseUrl: '', rights: `${r.artist} — منبع: ${r.sourceName}`, source: 'external', sourceId: r.sourceId, sourceUrl: r.sourceUrl, shareUrl: r.sourceUrl,
    sourceName: r.sourceName, importedAt: new Date().toISOString(), lang: r.lang, style: c.style, dedupeKey: key, artistKey: normFa(r.artist), bitrate: r.bitrate,
    status: publish ? 'published' : 'pending', published: publish, downloadable: false, featured: false, isFeatured: false, sortOrder: 0,
  };
};

/** Starts a background import (one at a time). Returns immediately; poll getJob(). */
export async function startImport(sourceIds: string[], target: number, opts: { autoPublishOpen?: boolean; by?: string } = {}) {
  if (job?.running) throw new Error('busy');
  const state = await getSources();
  const adapters = ADAPTERS.filter((a) => sourceIds.includes(a.id) && state.find((s) => s.id === a.id)?.enabled);
  if (!adapters.length) throw new Error('no enabled source');
  const j: Job = { running: true, startedAt: new Date().toISOString(), source: (opts.by ? `${opts.by}: ` : '') + adapters.map((a) => a.name).join('، '), target, scanned: 0, added: 0, rejected: 0, log: [] };
  job = j;
  const log = (m: string) => { j.log.push(`${new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' })} — ${m}`); if (j.log.length > 300) j.log.shift(); };
  void (async () => {
    try {
      const { rows } = await zite.sql({ query: `SELECT "sourceId","audioUrl","dedupeKey","artist","title" FROM "Tracks"` });
      const seen = new Set(rows.flatMap((r) => [String(r.sourceId ?? ''), String(r.audioUrl ?? ''), String(r.dedupeKey || dedupeKey(String(r.artist ?? ''), String(r.title ?? '')))]).filter(Boolean));
      const block = await getBlocklist();
      log(await relayHealth());
      let perSource = 0;
      for (const [ai, a] of adapters.entries()) {
        // Unused quota from earlier sources flows to the remaining ones.
        perSource = Math.ceil((target - j.added) / (adapters.length - ai));
        if (perSource <= 0) break;
        log(`شروع ${a.name}…`);
        let candidates: Row[] = [];
        try { candidates = await a.discover(Math.min(perSource * 4, 200), log); } catch (e) { log(`${a.name} در دسترس نیست: ${(e as Error).message}`); continue; }
        log(`${a.name}: ${candidates.length} ترک پیدا شد`);
        let added = 0;
        const queue: { r: Row; key: string }[] = [];
        for (const r of candidates) {
          j.scanned++;
          const key = dedupeKey(r.artist, r.title);
          if (seen.has(r.sourceId) || seen.has(r.audioUrl) || seen.has(key)) continue;
          if (block.tracks.includes(key) || block.artists.includes(normFa(r.artist))) { j.rejected++; continue; }
          const reason = rejectReason({ title: r.title, artist: r.artist, text: r.text, bitrate: r.bitrate, lang: r.lang });
          if (reason) { j.rejected++; log(`رد: ${r.artist} - ${r.title} (${reason})`); continue; }
          seen.add(key); queue.push({ r, key });
        }
        let i = 0; let unreachable = 0;
        const worker = async () => {
          while (i < queue.length && added < perSource && j.added < target) {
            const { r, key } = queue[i++];
            const probe = await probeAudio(r.audioUrl);
            if (!probe) { j.rejected++; if (++unreachable <= 3) log(`رد: ${r.title} (فایل از سرور در دسترس نیست)`); continue; }
            const dur = r.dur || (probe.bytes && r.bitrate ? Math.round((probe.bytes * 8) / (r.bitrate * 1000)) : 0);
            const late = rejectReason({ title: r.title, artist: r.artist, text: r.text, dur: dur || undefined, lang: r.lang });
            if (late) { j.rejected++; log(`رد: ${r.title} (${late})`); continue; }
            if (added >= perSource || j.added >= target) return;
            added++; j.added++;
            seen.add(r.sourceId); seen.add(r.audioUrl);
            await zite.tracks.create({ record: toRecord(r, key, dur, !!opts.autoPublishOpen && a.openLicense) as never })
              .catch((e) => { added--; j.added--; log(`خطای ذخیره: ${r.title} (${(e as Error).message})`); });
          }
        };
        await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, worker));
        if (unreachable > 3) log(`${a.name}: ${unreachable} فایل از سرور در دسترس نبود${relayEnabled ? '' : ' — برای منابع خارجی، رله (MEDIA_RELAY_URL) را تنظیم کن'}`);
        log(`${a.name}: ${added} ترک جدید در صف بررسی`);
      }
    } catch (e) { j.error = (e as Error).message; log(`خطا: ${j.error}`); }
    finally {
      j.running = false; j.finishedAt = new Date().toISOString();
      log(`پایان: ${j.added} ترک افزوده شد، ${j.rejected} رد شد.`);
      await writeJson(KEY_JOB, j).catch(() => {});
    }
  })();
  return j;
}

/* ---------- Nightly auto-import ---------- */
export type AutoSettings = { enabled: boolean; hour: number; target: number; autoPublishOpen: boolean; lastRun: string };
const AUTO_DEFAULT: AutoSettings = { enabled: false, hour: 3, target: 40, autoPublishOpen: false, lastRun: '' };
export async function getAuto() { return (await readJson<AutoSettings>(KEY_AUTO, AUTO_DEFAULT)).v; }
export async function setAuto(p: Partial<Omit<AutoSettings, 'lastRun'>>) {
  const cur = await getAuto();
  const next = { ...cur, ...p, hour: Math.max(0, Math.min(23, Math.round(p.hour ?? cur.hour))), target: Math.max(5, Math.min(300, Math.round(p.target ?? cur.target))) };
  await writeJson(KEY_AUTO, next);
  return next;
}
const tehran = () => { const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const g = (t: string) => f.find((x) => x.type === t)?.value ?? ''; return { day: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) }; };
/** Called every few minutes by the server; runs at most once per Tehran day at the chosen hour. */
export async function autoTick() {
  const a = await getAuto();
  if (!a.enabled || job?.running) return;
  const now = tehran();
  if (now.hour !== a.hour || a.lastRun === now.day) return;
  await writeJson(KEY_AUTO, { ...a, lastRun: now.day });
  const ids = (await getSources()).filter((s) => s.enabled).map((s) => s.id);
  if (ids.length) await startImport(ids, a.target, { autoPublishOpen: a.autoPublishOpen, by: 'خودکار' }).catch(() => {});
}

/* ---------- Mirror status (written by the server's mirror worker) ---------- */
export type MirrorStatus = { files: number; mb: number; budgetMb: number; pending: number; failed: number; at: string };
export async function getMirror() { return (await readJson<MirrorStatus>(KEY_MIRROR, { files: 0, mb: 0, budgetMb: 0, pending: 0, failed: 0, at: '' })).v; }
export async function saveMirror(m: MirrorStatus) { await writeJson(KEY_MIRROR, m); }
