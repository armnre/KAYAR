import { useRef, useState } from "react";
import { useKayar } from "../../app/store";
import { Icon } from "../../components/icons";
import { Spinner } from "../../components/ui/feedback";

const prompts = ["برنامه چربی‌سوزی این هفته", "برای عضله‌سازی از کجا شروع کنم؟", "خوابم کم است، ریکاوری چطور باشد؟"];

export function ChatPanel() {
  const k = useKayar();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const timer = useRef<number | null>(null);
  const thread = k.user ? k.state.chats[k.user.id] ?? [] : [];

  const send = (value: string) => {
    const q = value.trim();
    if (!q || pending) return;
    setPending(true);
    // local engine: short deterministic processing window, then the rule-based answer
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      k.askBodyyar(q);
      setPending(false);
      setText("");
    }, 550);
  };

  return (
    <section className="panel flex flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="t-label text-neon">موتور محلی</p>
          <h2 className="font-extrabold">گفتگو با بدن‌یار</h2>
        </div>
        <span className="tag">بدون اتصال به مدل ابری</span>
      </header>
      <div className="flex max-h-[420px] min-h-[220px] flex-col gap-3 overflow-y-auto p-4">
        {thread.length === 0 && (
          <p className="t-body-sm text-muted">
            هدف پروفایل‌ات را می‌خواند و برنامه می‌دهد. این پاسخ قانون‌محور است، نه یک چت‌بات نمایشی.
          </p>
        )}
        {thread.map((m) => (
          <div
            key={m.id}
            className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[0.84rem] leading-relaxed ${
              m.role === "user" ? "self-start bg-neon/12 text-white" : "self-end border border-line bg-white/[0.03] text-white/90"
            }`}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 self-end rounded-2xl border border-line bg-white/[0.03] px-3 py-2 text-[0.78rem] text-muted" aria-live="polite">
            <Spinner size={14} className="text-neon" />
            بدن‌یار پاسخ شما را از پروفایل و هدف‌تان می‌سازد…
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {prompts.map((p) => (
          <button key={p} type="button" className="chip !min-h-8 !text-[0.72rem]" onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="سوالت را بنویس..."
          aria-label="پیام به بدن‌یار"
          disabled={pending}
          className="field flex-1"
        />
        <button type="submit" className="btn btn-neon !px-4" aria-label="ارسال" disabled={pending || !text.trim()}>
          {pending ? <Spinner size={16} /> : <Icon name="send" size={16} />}
        </button>
      </form>
    </section>
  );
}
