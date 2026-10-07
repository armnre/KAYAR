import { Icon } from "./icons";
import { Badge, Rating, StatusDot, type Tone } from "./ui";
import type { Coach } from "../lib/data";

export function CoachCard({ coach }: { coach: Coach }) {
  return (
    <article className="panel card-hover group flex flex-col overflow-hidden">
      <div className="relative h-40 overflow-hidden sm:h-44">
        <img
          src={coach.image}
          alt={coach.name}
          width={400}
          height={300}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/35 to-transparent" />
        <span className="absolute right-3 top-3">
          <Badge tone="neon">{coach.tag}</Badge>
        </span>
        <button
          className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur transition hover:border-neon/60 hover:text-neon"
          aria-label="افزودن به علاقه‌مندی‌ها"
        >
          <Icon name="heart" size={15} />
        </button>
        <h3 className="absolute inset-x-4 bottom-3 flex items-center justify-end gap-1.5 text-[0.98rem] font-extrabold">
          {coach.verified && <Icon name="check" size={13} className="rounded-full bg-cyan p-[2px] text-black" />}
          {coach.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="label-muted">{coach.title}</p>
        <Rating rating={coach.rating} reviews={coach.reviews} />
        <div className="flex flex-wrap gap-1.5">
          {coach.specialties.slice(0, 3).map((s) => (
            <span key={s} className="tag">
              {s}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="label-muted num">{coach.years}</span>
          <a href={`#/coach/${coach.id}`} className="btn btn-neon !min-h-9 !px-3 !text-[0.78rem]">
            مشاهده پروفایل
            <Icon name="arrowLeft" size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}

export function FeaturedCoach({ coach }: { coach: Coach }) {
  return (
    <aside className="panel relative flex flex-col overflow-hidden">
      <div className="relative h-56">
        <img src={coach.image} alt={coach.name} width={400} height={300} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/40 to-transparent" />
        <span className="absolute right-4 top-4">
          <Badge tone="neon">{coach.tag}</Badge>
        </span>
        <button className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur transition hover:text-neon" aria-label="علاقه‌مندی">
          <Icon name="heart" size={15} />
        </button>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold">{coach.name}</h3>
          <Rating rating={coach.rating} />
        </div>
        <div className="flex items-center gap-2 text-[0.78rem] text-muted">
          <span className="num">{coach.students}</span>
          <span className="text-line-2">|</span>
          <span className="num">{coach.years}</span>
        </div>
        <p className="label-muted">{coach.title}</p>
        <p className="text-[0.82rem] leading-relaxed text-muted">
          {coach.bio} برنامه‌های اختصاصی متناسب با اهدافتان طراحی می‌کنم و تمرین‌ها را در کمترین زمان به
          بهترین نتیجه می‌رسانم.
        </p>
        <div className="grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
          {[
            { l: "سال تجربه", v: "۸" },
            { l: "شاگرد فعال", v: coach.students },
            { l: "رضایت کاربران", v: "۹۸٪" },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center gap-1">
              <span className="num text-base font-extrabold">{s.v}</span>
              <span className="label-muted text-[0.65rem]">{s.l}</span>
            </div>
          ))}
        </div>
        <a href="#/coach/ali-rezaei" className="btn btn-neon w-full">
          شروع همکاری
          <Icon name="arrowLeft" size={16} />
        </a>
        <a href="#/coach/ali-rezaei" className="btn btn-ghost w-full">
          <Icon name="calendar" size={16} />
          مشاهده برنامه‌ها
        </a>
        <div className="mt-1 flex items-center justify-between">
          <span className="label-muted">نمونه کارها</span>
          <div className="flex -space-x-2 space-x-reverse">
            {["coach-ali", "coach-sara", "coach-female2", "coach-male2"].map((n) => (
              <img
                key={n}
                src={`/images/${n}.jpg`}
                alt=""
                width={30}
                height={30}
                loading="lazy"
                className="h-7 w-7 rounded-full object-cover ring-2 ring-surface"
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ProgramCard({
  title,
  sessions,
  level,
  image,
}: {
  title: string;
  sessions: string;
  level: string;
  image: string;
}) {
  return (
    <article className="panel card-hover group overflow-hidden">
      <div className="relative h-28 overflow-hidden">
        <img
          src={image}
          alt=""
          width={320}
          height={200}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] to-transparent" />
      </div>
      <div className="flex flex-col gap-2 p-3.5">
        <h4 className="text-[0.86rem] font-extrabold">{title}</h4>
        <div className="flex items-center gap-3 text-[0.7rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={13} />
            {sessions}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="activity" size={13} />
            {level}
          </span>
        </div>
        <span className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-neon text-black transition group-hover:-translate-x-1">
          <Icon name="arrowLeft" size={15} />
        </span>
      </div>
    </article>
  );
}

export function RecoCard({
  title,
  subtitle,
  badge,
  badgeTone,
  weeks,
  level,
  image,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: Tone;
  weeks: string;
  level: string;
  image: string;
}) {
  return (
    <article className="panel card-hover group w-[240px] overflow-hidden sm:w-[260px]">
      <div className="relative h-32 overflow-hidden">
        <img
          src={image}
          alt=""
          width={320}
          height={200}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-transparent to-transparent" />
        <span className="absolute right-3 top-3">
          <Badge tone={badgeTone}>{badge}</Badge>
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h4 className="text-[0.88rem] font-extrabold">{title}</h4>
        <p className="label-muted leading-relaxed">{subtitle}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted">
            <Icon name="calendar" size={13} />
            {weeks}
          </span>
          <span className="inline-flex items-center gap-1 text-[0.7rem] text-muted">
            <Icon name="activity" size={13} />
            {level}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-neon/12 text-neon transition group-hover:bg-neon group-hover:text-black">
            <Icon name="arrowLeft" size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function ListRow({
  coach,
  active,
}: {
  coach: Coach;
  active?: boolean;
}) {
  return (
    <article
      className={`panel card-hover flex items-center gap-3 p-3 ${active ? "border-neon/45" : ""}`}
    >
      <img
        src={coach.image}
        alt={coach.name}
        width={64}
        height={64}
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1 truncate text-[0.9rem] font-extrabold">
            {coach.verified && <Icon name="check" size={12} className="rounded-full bg-cyan p-[2px] text-black" />}
            {coach.name}
          </h3>
          <Badge tone="neon">{coach.tag}</Badge>
        </div>
        <p className="label-muted truncate">{coach.title}</p>
        <div className="flex items-center gap-3">
          <Rating rating={coach.rating} reviews={coach.reviews} />
          <StatusDot online={coach.online} />
        </div>
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-muted transition hover:bg-neon hover:text-black">
        <Icon name="chevronLeft" size={16} />
      </span>
    </article>
  );
}
