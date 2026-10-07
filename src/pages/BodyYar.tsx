import { ProductShell } from "../components/ProductShell";
import { ChatPanel } from "../modules/bodyyar/ChatPanel";
import { RecoCard } from "../components/cards";
import { Icon } from "../components/icons";
import { Ring, delay, useRevealOnScroll } from "../components/ui";
import { IMG, bodyyarQuick, bodyyarRecommendations } from "../lib/data";

export default function BodyYar() {
  useRevealOnScroll("bodyyar");
  return (
    <ProductShell active="bodyyar" search="جستجو در BodyYar">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* ============ right rail ============ */}
        <aside className="order-2 flex flex-col gap-4 xl:order-1 xl:w-[300px] xl:shrink-0">
          {/* today program */}
          <div className="panel reveal flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-neon/35 bg-neon/10 text-neon">
                <Icon name="bolt" size={17} />
              </span>
              <span className="label-muted">برنامه امروز شما</span>
            </div>
            <div>
              <h3 className="text-[0.95rem] font-extrabold">تمرین قدرتی — پایین‌تنه</h3>
              <p className="label-muted mt-1 num">۴۵ دقیقه · متوسط</p>
            </div>
            <button className="btn btn-neon relative w-full overflow-hidden">
              <span className="sweep" />
              مشاهده برنامه
              <Icon name="arrowLeft" size={16} />
            </button>
            <div className="flex items-center justify-center gap-1.5 pt-1" aria-hidden="true">
              <span className="h-1 w-6 rounded-full bg-neon" />
              <span className="h-1 w-3 rounded-full bg-white/15" />
              <span className="h-1 w-3 rounded-full bg-white/15" />
            </div>
          </div>

          {/* current status */}
          <div className="panel reveal flex flex-col gap-4 p-4">
            <h3 className="text-[0.95rem] font-extrabold">وضعیت فعلی شما</h3>
            <div className="flex justify-center">
              <Ring value={78} label="۴۸" sub="از ۱۰۰" />
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-[0.85rem] font-bold">وزن</span>
              <Icon name="target" size={15} className="text-neon" />
            </div>
            <ul className="flex flex-col gap-2.5">
              {[
                { k: "چربی بدن", v: "۱۴٪" },
                { k: "رکورد تمرین", v: "۳ روز" },
                { k: "کیفیت خواب", v: "۷.۵ ساعت" },
              ].map((r) => (
                <li key={r.k} className="flex items-center justify-between">
                  <span className="label-muted">{r.k}</span>
                  <span className="num text-[0.85rem] font-bold">{r.v}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* nudge */}
          <div className="panel reveal relative flex flex-col gap-3 overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <img
                src={IMG.brain}
                alt=""
                width={56}
                height={56}
                loading="lazy"
                className="float-slow h-14 w-14 rounded-2xl object-cover"
              />
              <div>
                <h3 className="text-[0.95rem] font-extrabold text-neon">هر روز بهتر از دیروز</h3>
                <p className="label-muted mt-1 leading-relaxed">
                  با BodyYar در مسیر پیشرفت خود باقی می‌مانید.
                </p>
              </div>
            </div>
            <button className="btn btn-neon w-full">شروع کنید</button>
          </div>
        </aside>

        {/* ============ main ============ */}
        <div className="order-1 min-w-0 flex-1">
          <ChatPanel />
          {/* hero */}
          <section className="panel noise relative overflow-hidden">
            <div className="relative flex flex-col lg:h-[300px] lg:flex-row lg:items-center">
              <div className="reveal order-1 flex flex-col gap-3 p-6 lg:w-[210px] lg:shrink-0 lg:p-7">
                {[
                  { l: "TRAINING", i: "dumbbell" as const },
                  { l: "NUTRITION", i: "apple" as const },
                  { l: "RECOVERY", i: "moon" as const },
                ].map((f) => (
                  <div key={f.l} className="flex items-center justify-between gap-3 lg:flex-row-reverse">
                    <span className="font-display text-[0.72rem] font-bold tracking-[0.22em] text-white/70" dir="ltr">
                      {f.l}
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-neon/30 bg-neon/8 text-neon">
                      <Icon name={f.i} size={16} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative order-2 min-h-[190px] flex-1">
                <img
                  src={IMG.hero}
                  alt="دستیار هوشمند ورزشی"
                  width={1000}
                  height={600}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-[58%_25%]"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-[#101317]/10 via-[#101317]/40 to-[#101317]" />
                <img
                  src={IMG.brain}
                  alt=""
                  width={200}
                  height={200}
                  loading="lazy"
                  className="float-slow absolute bottom-2 right-[38%] h-40 w-40 rounded-full object-cover opacity-80 mix-blend-screen blur-[1px]"
                />
                <div className="shards opacity-60" />
              </div>

              <div className="relative order-3 flex flex-col items-start gap-4 p-6 lg:w-[400px] lg:shrink-0 lg:p-8">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-lg bg-neon px-2 py-0.5 text-[0.7rem] font-black text-black">AI</span>
                  <span className="text-[1.1rem] font-extrabold text-neon">BodyYar</span>
                </span>
                <h1 className="text-[1.5rem] font-extrabold leading-[1.35] sm:text-[1.95rem]">
                  همراه هوشمند ورزشی شما
                </h1>
                <p className="text-[0.86rem] leading-[1.95] text-muted">
                  با هوش مصنوعی برنامه تمرینی، تغذیه و ریکاوری شخصی‌سازی‌شده دریافت کنید و بهترین نسخه
                  خودتان باشید.
                </p>
                <div className="flex w-full flex-wrap gap-3">
                  <a href="#/bodyyar" className="btn btn-neon relative flex-1 overflow-hidden px-5 sm:flex-none">
                    <span className="sweep" />
                    شروع کنید
                    <Icon name="arrowLeft" size={16} />
                  </a>
                  <a href="#/screens" className="btn btn-ghost flex-1 px-5 sm:flex-none">
                    <Icon name="play" size={14} className="fill-current" />
                    آشنایی بیشتر
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* quick actions */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {bodyyarQuick.map((q, i) => (
              <button
                key={q.id}
                style={delay(i)}
                className="reveal panel card-hover group flex flex-col items-start gap-3 p-5 text-right"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl border ${
                    q.tone === "neon"
                      ? "border-neon/30 bg-neon/10 text-neon"
                      : q.tone === "violet"
                        ? "border-violet/30 bg-violet/12 text-violet-2"
                        : q.tone === "cyan"
                          ? "border-cyan/30 bg-cyan/10 text-cyan"
                          : "border-gold/30 bg-gold/10 text-gold"
                  }`}
                >
                  <Icon name={q.icon} size={20} />
                </span>
                <span className="text-[0.95rem] font-extrabold">{q.title}</span>
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="label-muted text-right leading-relaxed">{q.desc}</span>
                  <Icon
                    name="chevronLeft"
                    size={16}
                    className="shrink-0 text-muted transition group-hover:-translate-x-1 group-hover:text-neon"
                  />
                </span>
              </button>
            ))}
          </div>

          {/* recommendations */}
          <section className="panel mt-5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[1.05rem] font-extrabold">
                پیشنهادات بر اساس هدفت شما
                <span className="mt-1 block h-[2px] w-10 rounded-full bg-neon" />
              </h2>
              <button className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-neon transition hover:gap-2">
                مشاهده همه
                <Icon name="chevronLeft" size={14} />
              </button>
            </div>
            <div className="rail">
              {bodyyarRecommendations.map((r) => (
                <RecoCard key={r.id} {...r} />
              ))}
            </div>
          </section>

          {/* ask bar */}
          <section className="panel relative mt-5 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(100deg,#1A0F2E_0%,#12091F_45%,#0B0D10_100%)]" />
            <img
              src={IMG.brain}
              alt=""
              width={200}
              height={200}
              loading="lazy"
              className="float-slow absolute left-6 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full object-cover opacity-70 mix-blend-screen"
            />
            <span className="absolute left-4 top-3 rounded-md border border-violet-2/40 bg-violet/20 px-2 py-0.5 text-[0.65rem] font-black text-violet-2">
              AI
            </span>
            <span className="absolute bottom-3 left-6 rounded-md border border-line bg-black/40 px-2 py-0.5 text-[0.65rem] font-bold text-white/70">
              24/7
            </span>
            <div className="relative flex flex-col gap-4 p-5 lg:flex-row-reverse lg:items-center">
              <div className="flex flex-1 flex-col gap-1.5 lg:text-left">
                <h2 className="text-[1.05rem] font-extrabold">سؤالی دارد؟</h2>
                <p className="label-muted leading-relaxed">
                  با BodyYar هر سوالی درباره تمرین، تغذیه، ریکاوری یا سبک زندگی داشتی، بپرس.
                </p>
              </div>
              <form className="field w-full lg:max-w-md" onSubmit={(e) => e.preventDefault()}>
                <input
                  className="w-full bg-transparent text-[0.85rem] placeholder:text-muted focus:outline-none"
                  placeholder="سوال خود را بنویسید..."
                  aria-label="پرسش از بدن‌یار"
                />
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-2/40 bg-violet/25 text-violet-2 transition hover:bg-violet hover:text-white"
                  aria-label="ارسال"
                >
                  <Icon name="send" size={15} />
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </ProductShell>
  );
}
