/**
 * Open-licence sources for Morshed. Every track here carries a Creative Commons / public-domain licence
 * that allows commercial use (no "NC"), with attribution stored on the track. Audio is mirrored onto
 * KAYAR's own disk after approval, so playback never depends on the foreign host being reachable from Iran.
 */
import { politeFetch } from './http';
import type { Adapter, Row } from './adapters';

/** Workout-oriented search plans: query → hint text used by the classifier. */
const WORKOUT_QUERIES = [
  'workout', 'gym', 'running', 'energetic', 'motivational', 'sport', 'electronic dance', 'hip hop beat',
  'rock energetic', 'cardio', 'upbeat', 'edm', 'drum and bass', 'trap beat', 'power', 'action',
];
const CALM_QUERIES = ['ambient', 'lofi', 'piano calm', 'meditation', 'chill', 'relax'];
const PERSIAN_QUERIES = ['persian', 'iranian', 'santur', 'setar', 'kamancheh', 'tombak', 'daf', 'oud'];

const okLicense = (l: string) => !/nc|nd/i.test(l.replace(/^cc-?/i, '')) || /^cc0|pdm|publicdomain/i.test(l);
const ccName = (l: string, v: string) => (/^cc0$/i.test(l) ? 'CC0 (مالکیت عمومی)' : /pdm/i.test(l) ? 'مالکیت عمومی' : `CC ${l.toUpperCase()} ${v}`.trim());

type OV = {
  id: string; title: string; creator: string; url: string; license: string; license_version: string; license_url: string;
  foreign_landing_url: string; thumbnail: string; tags?: { name: string }[]; genres?: string[] | null; duration?: number | null;
  mature?: boolean; source: string; filetype?: string | null; bit_rate?: number | null; audio_set?: { title?: string } | null;
};

export async function openverse(queries: string[], limit: number, log: (m: string) => void, hint: string): Promise<Row[]> {
  const out: Row[] = [];
  const seen = new Set<string>();
  const order = [...queries].sort(() => Math.random() - 0.5);
  for (const q of order) {
    if (out.length >= limit) break;
    for (let page = 1; page <= 1 && out.length < limit; page++) { // anonymous API: first page only, 20 per query
      const u = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&license_type=commercial&category=music&mature=false&page_size=20&page=${page}`;
      let data: { results?: OV[] };
      try { const r = await politeFetch(u, { headers: { accept: 'application/json' }, timeoutMs: 20_000 }); if (r.status === 429) { log('Openverse: سقف درخواست؛ بقیه در اجرای بعدی'); return out; } if (!r.ok) { log(`Openverse ${r.status} برای «${q}»`); break; } data = await r.json(); }
      catch (e) { log(`Openverse در دسترس نیست: ${(e as Error).message}`); return out; }
      const res = data.results ?? [];
      if (!res.length) break;
      for (const x of res) {
        if (out.length >= limit) break;
        if (seen.has(x.id) || x.mature || !x.url || !okLicense(x.license)) continue;
        if (x.filetype && !/mp3|mp32|mpeg/i.test(x.filetype)) continue;
        seen.add(x.id);
        const dur = Math.round((x.duration ?? 0) / 1000);
        const tags = [...(x.tags ?? []).map((t) => t.name), ...(x.genres ?? [])].join(' ');
        out.push({
          title: (x.title || '').slice(0, 140), artist: (x.creator || '').slice(0, 120), album: x.audio_set?.title ?? '', art: x.thumbnail || '',
          audioUrl: x.url, dur, bitrate: x.bit_rate ? Math.round(x.bit_rate / 1000) : 0, lang: 'en', text: `${hint} ${q} ${tags}`,
          sourceId: `openverse:${x.id}`, sourceName: `Openverse/${x.source}`, sourceUrl: x.foreign_landing_url || x.url,
          license: `${ccName(x.license, x.license_version)} · ${x.license_url}`,
        });
      }
    }
  }
  return out;
}

type CCM = { upload_id: number; upload_name: string; user_real_name: string; user_name: string; file_page_url: string; license_url: string; license_name: string; upload_tags: string; files?: { download_url: string; file_format_info?: { 'mime_type'?: string; ps?: string } }[] };

async function ccmixter(limit: number, log: (m: string) => void): Promise<Row[]> {
  const out: Row[] = [];
  // ccMixter sends oversized response headers for larger pages (undici rejects them), so read 5 at a time.
  const plan = ['electronic', 'hip_hop', 'dubstep', 'rock', 'funk', 'instrumental'].flatMap((t) => [0, 1, 2].map(() => t));
  for (const tags of plan) {
    if (out.length >= limit) break;
    const u = `https://ccmixter.org/api/query?f=json&tags=${tags}&lic=by&limit=5&offset=${Math.floor(Math.random() * 200)}`;
    let data: CCM[];
    try { const r = await politeFetch(u, { timeoutMs: 20_000 }); if (!r.ok) { log(`ccMixter ${r.status}`); continue; } const txt = await r.text(); data = txt.trim() ? JSON.parse(txt) : []; }
    catch (e) { log(`ccMixter (${tags}): ${(e as Error).message}`); continue; }
    for (const x of data) {
      if (out.length >= limit) break;
      if (/nc|nd|sampling/i.test(x.license_url) || /non_commercial/.test(x.upload_tags)) continue;
      const file = x.files?.find((f) => /\.mp3$/i.test(f.download_url));
      const mp3 = file?.download_url;
      if (!mp3) continue;
      const ps = (file?.file_format_info?.ps ?? '').split(':').map(Number);
      const dur = ps.length === 2 && ps.every((n) => !Number.isNaN(n)) ? ps[0] * 60 + ps[1] : 0;
      out.push({
        title: x.upload_name.slice(0, 140), artist: (x.user_real_name || x.user_name).slice(0, 120), album: '', art: '', audioUrl: mp3, dur, bitrate: 0,
        lang: 'en', text: `workout ${x.upload_tags.replace(/,/g, ' ')}`, sourceId: `ccmixter:${x.upload_id}`, sourceName: 'ccMixter',
        sourceUrl: x.file_page_url, license: `${x.license_name} · ${x.license_url}`,
      });
    }
  }
  return out;
}


/** Targeted ccMixter search by free-text tags (CC BY / CC0 only). */
export async function ccmixterSearch(query: string, limit: number, log: (m: string) => void): Promise<Row[]> {
  const out: Row[] = [];
  const tags = query.toLowerCase().split(/[,،\s]+/).map((t) => t.replace(/[^a-z0-9_]/g, '')).filter(Boolean).slice(0, 3);
  if (!tags.length) return out;
  for (let off = 0; off < 30 && out.length < limit; off += 5) {
    const u = `https://ccmixter.org/api/query?f=json&tags=${tags.join('+')}&type=any&limit=5&offset=${off}`;
    let data: CCM[];
    try { const r = await politeFetch(u, { timeoutMs: 20_000 }); if (!r.ok) { log(`ccMixter ${r.status}`); break; } const txt = await r.text(); data = txt.trim() ? JSON.parse(txt) : []; }
    catch (e) { log(`ccMixter: ${(e as Error).message}`); break; }
    if (!data.length) break;
    for (const x of data) {
      if (/nc|nd|sampling/i.test(x.license_url) || /non_commercial/.test(x.upload_tags)) continue;
      const file = x.files?.find((f) => /\.mp3$/i.test(f.download_url));
      if (!file) continue;
      const ps = (file.file_format_info?.ps ?? '').split(':').map(Number);
      const dur = ps.length === 2 && ps.every((n) => !Number.isNaN(n)) ? ps[0] * 60 + ps[1] : 0;
      out.push({
        title: x.upload_name.slice(0, 140), artist: (x.user_real_name || x.user_name).slice(0, 120), album: '', art: '', audioUrl: file.download_url, dur, bitrate: 0,
        lang: 'en', text: `${query} ${x.upload_tags.replace(/,/g, ' ')}`, sourceId: `ccmixter:${x.upload_id}`, sourceName: 'ccMixter',
        sourceUrl: x.file_page_url, license: `${x.license_name} · ${x.license_url}`,
      });
    }
  }
  return out.slice(0, limit);
}

type IAFile = { name: string; format?: string; length?: string; bitrate?: string };
/** Internet Archive audio items whose licence is CC BY / BY-SA / CC0 / public domain. */
export async function archiveSearch(query: string, limit: number, log: (m: string) => void): Promise<Row[]> {
  const lic = '(licenseurl:*creativecommons.org/licenses/by/* OR licenseurl:*creativecommons.org/licenses/by-sa/* OR licenseurl:*publicdomain*)';
  const q = `(${query.replace(/[,،]/g, ' OR ')}) AND mediatype:audio AND ${lic}`;
  const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&fl[]=subject&rows=${Math.min(limit, 25)}&output=json`;
  let docs: { identifier: string; title?: string; creator?: string | string[]; licenseurl?: string; subject?: string | string[] }[] = [];
  try { const r = await politeFetch(u, { headers: { accept: 'application/json' }, timeoutMs: 20_000 }); if (!r.ok) { log(`Archive ${r.status}`); return []; } docs = (await r.json())?.response?.docs ?? []; }
  catch (e) { log(`Archive: ${(e as Error).message}`); return []; }
  const out: Row[] = [];
  await Promise.all(docs.map(async (d) => {
    if (!d.licenseurl || /-nc|-nd/i.test(d.licenseurl)) return;
    try {
      const r = await politeFetch(`https://archive.org/metadata/${encodeURIComponent(d.identifier)}/files`, { timeoutMs: 15_000 });
      if (!r.ok) return;
      const files: IAFile[] = (await r.json())?.result ?? [];
      const f = files.find((x) => /\.mp3$/i.test(x.name) && /VBR MP3|128Kbps|320Kbps|MP3/i.test(x.format ?? ''));
      if (!f) return;
      const raw = String(f.length ?? '0');
      const dur = raw.includes(':') ? raw.split(':').map(Number).reduce((a, n) => a * 60 + (n || 0), 0) : Math.round(Number(raw) || 0);
      const creator = Array.isArray(d.creator) ? d.creator[0] : d.creator ?? 'Unknown';
      const subj = Array.isArray(d.subject) ? d.subject.join(' ') : d.subject ?? '';
      out.push({
        title: (f.name.replace(/\.mp3$/i, '').replace(/[_-]+/g, ' ') || d.title || '').slice(0, 140), artist: String(creator).slice(0, 120), album: d.title ?? '',
        art: `https://archive.org/services/img/${d.identifier}`, audioUrl: `https://archive.org/download/${d.identifier}/${encodeURIComponent(f.name)}`,
        dur, bitrate: Number(f.bitrate ?? 0) || 0, lang: 'en', text: `${query} ${subj}`, sourceId: `archive:${d.identifier}/${f.name}`, sourceName: 'Internet Archive',
        sourceUrl: `https://archive.org/details/${d.identifier}`, license: `${/publicdomain/i.test(d.licenseurl) ? 'مالکیت عمومی' : 'Creative Commons'} · ${d.licenseurl}`,
      });
    } catch { /* skip item */ }
  }));
  return out.slice(0, limit);
}

export const OPEN_ADAPTERS: Adapter[] = [
  {
    id: 'openverse-workout', name: 'Openverse · ورزشی', site: 'api.openverse.org', openLicense: true,
    note: 'موتور جست‌وجوی رسمی آثار Creative Commons (Jamendo، Freesound، Wikimedia و…). فقط مجوزهای مجاز برای استفاده‌ی تجاری. فایل بعد از تأیید روی سرور خود کایار ذخیره می‌شود.',
    discover: (limit, log) => openverse(WORKOUT_QUERIES, limit, log, 'workout energetic'),
  },
  {
    id: 'openverse-persian', name: 'Openverse · ایرانی و بی‌کلام', site: 'api.openverse.org', openLicense: true,
    note: 'موسیقی آزاد با سازهای ایرانی (سنتور، سه‌تار، کمانچه، دف…) برای بخش سنتی و تلفیقی.',
    discover: (limit, log) => openverse(PERSIAN_QUERIES, limit, log, 'persian traditional'),
  },
  {
    id: 'openverse-calm', name: 'Openverse · آرام و تمرکز', site: 'api.openverse.org', openLicense: true,
    note: 'موسیقی آزاد آرام برای ریکاوری، کشش و تمرکز.',
    discover: (limit, log) => openverse(CALM_QUERIES, limit, log, 'ambient calm'),
  },
  {
    id: 'ccmixter', name: 'ccMixter', site: 'ccmixter.org', openLicense: true,
    note: 'بی‌کلام‌های الکترونیک/هیپ‌هاپ/راک با مجوز CC BY (بدون NC).',
    discover: (limit, log) => ccmixter(limit, log),
  },
];
