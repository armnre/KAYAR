import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ArrowUp, RotateCcw, Copy, Check, Trash2, Dumbbell, Salad, Flame, HeartPulse, UserRound, ChevronDown } from 'lucide-react';
import { coachChat } from 'zitejs/api';
import { Markdown } from '@project/components/markdown';
import { tok } from '../../lib/session';
import { PageHeader, errMsg } from '../../components/bkit';
import { cn } from '@project/components/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';

type Msg = { role: 'user' | 'assistant'; content: string };
const STORE = 'kayar.coach.v1';
const STARTERS = [
  { i: Dumbbell, t: 'تمرین امروز', q: 'تمرین امروزم رو چطور بهتر اجرا کنم؟' },
  { i: Salad, t: 'تغذیه', q: 'قبل و بعد از تمرین دقیقاً چی بخورم؟' },
  { i: Flame, t: 'چربی‌سوزی', q: 'برای کاهش چربی شکم بهترین روش چیه؟' },
  { i: HeartPulse, t: 'ریکاوری', q: 'بعد از تمرین عضلاتم درد می‌کنه، چیکار کنم؟' },
];
const FOLLOW = ['توضیح بیشتر بده', 'یه برنامه نمونه بنویس', 'جایگزین ساده‌تر چیه؟'];

function Dots() {
  return <span className="flex gap-1 py-1">{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}</span>;
}

function Bubble({ m, streaming, last, onRetry }: { m: Msg; streaming: boolean; last: boolean; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);
  if (m.role === 'user') return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-ss-md bg-primary px-4 py-2.5 text-[15px] leading-7 text-primary-foreground">{m.content}</div>
    </motion.div>
  );
  const copy = async () => { await navigator.clipboard.writeText(m.content); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Bot className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="rounded-[22px] rounded-se-md border border-border bg-card px-4 py-3 text-[15px] leading-7">
          {m.content ? <Markdown className="prose prose-sm prose-invert max-w-none break-words leading-7 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-primary">{m.content}</Markdown> : <Dots />}
          {streaming && m.content && <span className="ms-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />}
        </div>
        {!streaming && m.content && (
          <div className="mt-1 flex gap-1 text-muted-foreground">
            <button onClick={copy} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs hover:bg-secondary hover:text-foreground" aria-label="کپی">{copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'کپی شد' : 'کپی'}</button>
            {last && <button onClick={onRetry} className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs hover:bg-secondary hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" />پاسخ دیگر</button>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Coach() {
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(localStorage.getItem(STORE) ?? '[]'); } catch { return []; } });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [useProfile, setUseProfile] = useState(true);
  const [failed, setFailed] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (!busy) localStorage.setItem(STORE, JSON.stringify(msgs.slice(-40))); }, [msgs, busy]);
  const follow = useRef(true);
  // Only follow new content while the user is already at the bottom — never yank them back up/down otherwise.
  useEffect(() => { if (follow.current) end.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [msgs]);
  useEffect(() => {
    const onScroll = () => { const b = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120; follow.current = b; setAtBottom(b); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 140)}px`; } }, [text]);

  const send = async (content: string, history = msgs) => {
    const t = content.trim();
    if (!t || busy) return;
    const next: Msg[] = [...history, { role: 'user', content: t.slice(0, 2000) }];
    setMsgs([...next, { role: 'assistant', content: '' }]); setText(''); setBusy(true); setFailed(false); follow.current = true;
    try {
      const s = coachChat({ token: tok(), messages: next.slice(-12), useProfile });
      let acc = '';
      for await (const chunk of s) { acc += chunk; setMsgs([...next, { role: 'assistant', content: acc }]); }
      const r = await s.result;
      setMsgs([...next, { role: 'assistant', content: r.reply }]);
    } catch (e) { setMsgs(next); setFailed(true); toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const retry = () => {
    const lastUser = [...msgs].reverse().findIndex((m) => m.role === 'user');
    if (lastUser < 0) return;
    const idx = msgs.length - 1 - lastUser;
    send(msgs[idx].content, msgs.slice(0, idx));
  };
  const last = msgs.at(-1);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <PageHeader title="مربی هوشمند" subtitle={busy ? 'در حال نوشتن…' : 'آنلاین · تمرین و تغذیه'} back="/app/bodyyar"
        action={msgs.length > 0 ? <button onClick={() => setConfirm(true)} className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-secondary" aria-label="پاک کردن گفتگو"><Trash2 className="h-4 w-4" /></button> : undefined} />

      <div className="flex-1 space-y-5 pb-6">
        {msgs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-4 text-center">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-primary text-primary-foreground shadow-[0_20px_50px_-15px_hsl(var(--primary)/.6)]"><Bot className="h-9 w-9" /><span className="absolute -bottom-1 -end-1 h-4 w-4 rounded-full border-4 border-background bg-primary" /></div>
            <h2 className="mt-4 text-xl font-black">سلام! من بدن‌یارم 👋</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-muted-foreground">برنامه، تغذیه و جلسه‌هات رو می‌شناسم. هر سؤالی داری بپرس.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 text-start">
              {STARTERS.map((s) => (
                <button key={s.t} onClick={() => send(s.q)} className="press rounded-[22px] border border-border bg-card p-3.5 transition hover:border-primary/50">
                  <s.i className="h-5 w-5 text-primary" /><div className="mt-2 text-sm font-bold">{s.t}</div><div className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{s.q}</div>
                </button>
              ))}
            </div>
            <p className="mt-5 text-[11px] text-muted-foreground">مربی هستم، نه پزشک — برای درد یا بیماری با پزشک مشورت کن.</p>
          </motion.div>
        )}
        {msgs.map((m, i) => <Bubble key={i} m={m} streaming={busy && i === msgs.length - 1} last={i === msgs.length - 1} onRetry={retry} />)}
        {failed && !busy && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <span>پاسخ دریافت نشد.</span>
            <button onClick={retry} className="flex items-center gap-1 rounded-xl bg-background px-3 py-1.5 text-xs font-bold"><RotateCcw className="h-3.5 w-3.5" />تلاش دوباره</button>
          </div>
        )}
        {!busy && last?.role === 'assistant' && last.content && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 ps-[3.25rem]">{FOLLOW.map((f) => <button key={f} onClick={() => send(f)} className="shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs hover:border-primary/50 hover:text-primary">{f}</button>)}</div>
        )}
        <div ref={end} className="h-px scroll-mb-[calc(env(safe-area-inset-bottom,0px)+13rem)] md:scroll-mb-40" />
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] z-10 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pb-2 pt-4 md:bottom-0 md:pb-4">
        <AnimatePresence>
          {!atBottom && msgs.length > 2 && (
            <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => { follow.current = true; end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }}
              className="absolute -top-8 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-card shadow-lg" aria-label="رفتن به آخر"><ChevronDown className="h-4 w-4" /></motion.button>
          )}
        </AnimatePresence>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="rounded-[26px] border border-border bg-card p-1.5 shadow-[0_10px_40px_-15px_rgb(0_0_0/.6)] focus-within:border-primary/60">
          <div className="flex items-end gap-1.5">
            <textarea ref={ta} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={1} placeholder="از مربی بپرس…" enterKeyHint="send"
              className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] leading-6 outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(text); } }} />
            <button type="submit" disabled={!text.trim() || busy} aria-label="ارسال" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-30"><ArrowUp className="h-5 w-5" /></button>
          </div>
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <button type="button" onClick={() => setUseProfile((v) => !v)} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition', useProfile ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
              <UserRound className="h-3.5 w-3.5" />{useProfile ? 'پاسخ شخصی‌سازی‌شده' : 'بدون اطلاعات من'}
            </button>
            {text.length > 1500 && <span className="text-[11px] text-muted-foreground">{text.length}/2000</span>}
          </div>
        </form>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent dir="rtl" className="rounded-[28px]">
          <AlertDialogHeader><AlertDialogTitle>پاک کردن گفتگو؟</AlertDialogTitle><AlertDialogDescription>همه پیام‌های این گفتگو حذف می‌شوند.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="gap-2"><AlertDialogCancel>انصراف</AlertDialogCancel><AlertDialogAction onClick={() => { setMsgs([]); setFailed(false); }}>پاک کن</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
