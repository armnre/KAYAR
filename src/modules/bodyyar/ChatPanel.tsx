import { useState } from "react";
import { useKayar } from "../../app/store";
import { Icon } from "../../components/icons";

const prompts = ["برنامه چربی‌سوزی این هفته", "برای عضله‌سازی از کجا شروع کنم؟", "خوابم کم است، ریکاوری چطور باشد؟"];

export function ChatPanel() {
  const k = useKayar();
  const [text, setText] = useState("");
  const thread = k.user ? k.state.chats[k.user.id] ?? [] : [];

  const send = (value: string) => {
    const q = value.trim();
    if (!q) return;
    k.askBodyyar(q);
    setText("");
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
          className="field flex-1"
        />
        <button type="submit" className="btn btn-neon !px-4" aria-label="ارسال">
          <Icon name="send" size={16} />
        </button>
      </form>
    </section>
  );
}
