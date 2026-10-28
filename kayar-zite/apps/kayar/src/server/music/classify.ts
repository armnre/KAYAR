/** Morshed music classification: styles, content filters, Persian detection, workout genre mapping, dedupe keys. */

export type Genre = 'workout' | 'running' | 'walking' | 'focus' | 'recovery';
export type Lang = 'fa' | 'en';

/** Styles shown in the app. Persian music is the core; non-Persian is a small supplement. */
export const STYLES: { key: string; lang: Lang; title: string; genre: Genre; words: RegExp }[] = [
  { key: 'fa-energy', lang: 'fa', title: 'شاد و پرانرژی', genre: 'workout', words: /شاد|رقص|بندری|ریمیکس|remix|dance|party|energy|انرژی/i },
  { key: 'fa-rap', lang: 'fa', title: 'رپ و هیپ‌هاپ', genre: 'workout', words: /رپ|rap|hip.?hop|هیپ.?هاپ|ترپ|trap/i },
  { key: 'fa-pop', lang: 'fa', title: 'پاپ', genre: 'running', words: /پاپ|pop|جدید|عاشقانه/i },
  { key: 'fa-rock', lang: 'fa', title: 'راک و آلترناتیو', genre: 'workout', words: /راک|rock|آلترناتیو|alternative|متال|metal/i },
  { key: 'fa-traditional', lang: 'fa', title: 'سنتی و تلفیقی', genre: 'recovery', words: /سنتی|تلفیقی|محلی|traditional|کردی|لری|مقامی/i },
  { key: 'fa-instrumental', lang: 'fa', title: 'بی‌کلام و آرام', genre: 'focus', words: /بی.?کلام|instrumental|پیانو|piano|گیتار|آرام|ملایم|lofi|lo-fi|ambient/i },
  { key: 'fa-classic', lang: 'fa', title: 'قدیمی و نوستالژی', genre: 'walking', words: /قدیمی|نوستالژی|خاطره|دهه|retro|classic/i },
  { key: 'en-workout', lang: 'en', title: 'تکمیلی خارجی', genre: 'workout', words: /./ },
];
export const STYLE_TITLES: Record<string, string> = Object.fromEntries(STYLES.map((s) => [s.key, s.title]));

/** Religious recitation / eulogy / sermon — never imported. */
export const RELIGIOUS = /quran|qur'an|koran|surah|sura\b|ayat|qari|recit|tilawa|tajweed|azan|adhan|athan|dua\b|du'a|munajat|nasheed|noha|nohe|nowhe|marsiya|madah|maddah|rowze|rawza|sermon|lecture|islamic|muharram|ashura|karbala|zikr|dhikr|قرآن|قران|سوره|آیه|تلاوت|قاری|اذان|دعای|مناجات|نوحه|مداحی|مداح|روضه|محرم|عاشورا|کربلا|ذکر|سخنرانی|موعظه|مولودی|شور حسینی|زمینه/i;
/** Explicit / inappropriate content — never imported. */
export const UNSUITABLE = /\b(sex|sexy|nsfw|porn|nude|naked|fuck|f\*ck|shit|bitch|nigg|xxx|drug|weed|cocaine|suicide|explicit|18\+)\b|سکس|لخت|مستهجن|فحش|مواد مخدر|\+۱۸|بی.?ادبی|شیشه|خودکشی/i;
/** Low-value items: teasers, ringtones, low quality remixes, ads, albums/playlists, video-only. */
export const JUNK = /تیزر|teaser|پیش.?نمایش|preview|زنگ.?خور|ringtone|آلبوم کامل|full album|پلی.?لیست|playlist|موزیک.?ویدیو|music video|تبلیغ|\bad\b|karaoke|کارائوکه|tribute|cover version|اجرای زنده.*کم.?کیفیت|8d|slowed|sped up/i;

export const PERSIAN_CHARS = /[پچژگکیآ]/; // letters that exist in Persian but not English (and mostly not Arabic-only)
export const isPersian = (s: string) => PERSIAN_CHARS.test(s) || /[\u0600-\u06FF]{3,}/.test(s);

/** Normalizes Persian/Arabic variants + spacing for dedupe and search. */
export function normFa(s: string) {
  return s.toLowerCase()
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀة]/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/\u200c/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, '').replace(/\b(official|audio|remix|ریمیکس|ورژن|version|new|جدید)\b/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');
}
export const dedupeKey = (artist: string, title: string) => `${normFa(artist)}|${normFa(title)}`;

/** Picks style + workout genre from the source's categories/tags and the text. */
export function classify(text: string, lang: Lang): { style: string; genre: Genre } {
  if (lang === 'en') return { style: 'en-workout', genre: /ambient|chill|lofi|piano|sleep/i.test(text) ? 'focus' : 'workout' };
  for (const s of STYLES) if (s.lang === 'fa' && s.words.test(text)) return { style: s.key, genre: s.genre };
  return { style: 'fa-pop', genre: 'running' };
}

/** Quality gate shared by every adapter. Returns a rejection reason or null. */
export function rejectReason(o: { title: string; artist: string; text: string; dur?: number; bitrate?: number; lang: Lang }): string | null {
  const t = `${o.title} ${o.artist} ${o.text}`;
  if (!o.title.trim() || !o.artist.trim()) return 'متادیتای ناقص';
  if (RELIGIOUS.test(t)) return 'محتوای مذهبی/مداحی';
  if (UNSUITABLE.test(t)) return 'محتوای نامناسب';
  if (JUNK.test(o.title)) return 'تیزر/آلبوم/کیفیت پایین';
  if (o.lang === 'fa' && !isPersian(`${o.title} ${o.artist} ${o.text}`)) return 'غیرفارسی';
  if (o.bitrate && o.bitrate < 128) return 'کیفیت زیر ۱۲۸kbps';
  if (o.dur && (o.dur < 90 || o.dur > 480)) return 'مدت خارج از ۱:۳۰ تا ۸ دقیقه';
  return null;
}
