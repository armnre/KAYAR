/* ============================================================
   KAYAR — mock domain data (Phase 0 reference content)
   In production this comes from the API layer (see docs/architecture).
   ============================================================ */

export const IMG = {
  hero: "/images/hero-athlete.jpg",
  coachAli: "/images/coach-ali.jpg",
  coachSara: "/images/coach-sara.jpg",
  coachFemale: "/images/coach-female2.jpg",
  coachMale: "/images/coach-male2.jpg",
  gym: "/images/program-gym.jpg",
  morshed: "/images/morshed.jpg",
  campaign: "/images/campaign-gold.jpg",
  admin: "/images/admin-hero.jpg",
  brain: "/images/ai-brain.jpg",
};

export type Coach = {
  id: string;
  name: string;
  title: string;
  tag: string;
  rating: number;
  reviews: number;
  students: string;
  years: string;
  online: boolean;
  verified?: boolean;
  specialties: string[];
  image: string;
  featured?: boolean;
  bio?: string;
};

export const coaches: Coach[] = [
  {
    id: "sara-mohammadi",
    name: "سارا محمدی",
    title: "مربی دو و میدانی و آمادگی جسمانی",
    tag: "دو و میدانی",
    rating: 4.8,
    reviews: 192,
    students: "۵۰۰+",
    years: "۸+ سال",
    online: true,
    verified: true,
    specialties: ["دو", "تغذیه ورزشی", "انعطاف‌پذیری"],
    image: IMG.hero,
    featured: true,
    bio: "با بیش از ۸ سال تجربه در دو و میدانی و آمادگی جسمانی، به شما کمک می‌کنم به اهداف ورزشی‌تان برسید.",
  },
  {
    id: "ali-rezaei",
    name: "علی رضایی",
    title: "مربی بدنسازی و فیتنس",
    tag: "بدنسازی",
    rating: 4.9,
    reviews: 238,
    students: "۳۲۰+",
    years: "۱۰+ سال",
    online: true,
    verified: true,
    specialties: ["بدنسازی", "کاهش وزن", "افزایش انفجار"],
    image: IMG.coachAli,
    bio: "من علی رضایی هستم، مربی بدنسازی با بیش از ۱۰ سال تجربه در آموزش و برنامه‌ریزی تمرینی. تخصص اصلی من طراحی برنامه‌های شخصی‌سازی‌شده، اصلاح فرم بدن و افزایش عملکرد ورزشی است.",
  },
  {
    id: "amir-kazemi",
    name: "امیر کاظمی",
    title: "مربی بدنسازی و قدرتی",
    tag: "کراسفیت",
    rating: 4.7,
    reviews: 154,
    students: "۴۲۰+",
    years: "۶+ سال",
    online: true,
    verified: true,
    specialties: ["قدرتی", "عملکرد ورزشی", "تغذیه"],
    image: IMG.coachMale,
    featured: true,
    bio: "با بیش از ۸ سال تجربه در حوزه بدنسازی و آمادگی جسمانی، به شما کمک می‌کنم به بهترین نسخه خودتان برسید.",
  },
  {
    id: "negar-hosseini",
    name: "نگار حسینی",
    title: "مربی یوگا و انعطاف‌پذیری",
    tag: "یوگا",
    rating: 4.6,
    reviews: 120,
    students: "۲۸۰+",
    years: "۷+ سال",
    online: true,
    verified: true,
    specialties: ["یوگا", "انعطاف‌پذیری", "آرامش"],
    image: IMG.coachFemale,
    bio: "مربی یوگا و انعطاف‌پذیری با رویکرد سلامت‌محور و ذهن‌آگاهی.",
  },
  {
    id: "daniyal-shojaei",
    name: "دانیال شجاعی",
    title: "متخصص تغذیه ورزشی",
    tag: "تغذیه",
    rating: 4.8,
    reviews: 176,
    students: "۳۶۰+",
    years: "۱۰+ سال",
    online: true,
    verified: true,
    specialties: ["تغذیه", "رژیم ورزشی", "سلامت"],
    image: IMG.gym,
  },
  {
    id: "maryam-hosseini",
    name: "مریم حسینی",
    title: "مربی سلامت و یوگا",
    tag: "سلامت",
    rating: 4.5,
    reviews: 98,
    students: "۲۱۰+",
    years: "۶+ سال",
    online: true,
    verified: true,
    specialties: ["سلامت", "یوگا", "تنفس"],
    image: IMG.coachSara,
  },
  {
    id: "reza-taheri",
    name: "رضا طاهری",
    title: "مربی دو و استقامت",
    tag: "دویدن",
    rating: 4.6,
    reviews: 78,
    students: "۱۹۰+",
    years: "۵+ سال",
    online: true,
    verified: true,
    specialties: ["دویدن", "استقامت", "ماراتن"],
    image: IMG.admin,
  },
  {
    id: "mahsa-karimi",
    name: "مهسا کریمی",
    title: "مربی فیتنس و تناسب اندام",
    tag: "فیتنس و بدنسازی",
    rating: 4.9,
    reviews: 232,
    students: "۳۶۰+",
    years: "۹+ سال",
    online: true,
    verified: true,
    specialties: ["فیتنس", "کاهش وزن", "تناسب اندام"],
    image: IMG.hero,
  },
  {
    id: "sahra-ladari",
    name: "سحر لادری",
    title: "مربی قدرتی و مربی بانوان",
    tag: "تکنیک",
    rating: 4.8,
    reviews: 110,
    students: "۹۶+",
    years: "۴+ سال",
    online: false,
    verified: true,
    specialties: ["تکنیک", "قدرت", "بانوان"],
    image: IMG.coachFemale,
  },
  {
    id: "sara-karimi",
    name: "سارا کریمی",
    title: "مربی تناسب اندام و یوگا",
    tag: "فیتنس و بدنسازی",
    rating: 4.8,
    reviews: 97,
    students: "۱۴۰+",
    years: "۳+ سال",
    online: true,
    verified: true,
    specialties: ["فیتنس", "قدرتی", "یوگا"],
    image: IMG.coachSara,
  },
];

export const programs = [
  { id: "mass", title: "برنامه حجم عضلانی", sessions: "۵۰ جلسه", level: "سطح پیشرفته", image: IMG.gym },
  { id: "fatloss", title: "برنامه کاهش وزن", sessions: "۱۲ جلسه", level: "سطح متوسط", image: IMG.coachSara },
  { id: "fitness", title: "برنامه تناسب اندام", sessions: "۸ جلسه", level: "سطح مبتدی", image: IMG.coachAli },
];

export const bodyyarRecommendations = [
  {
    id: 1,
    title: "برنامه ۴ هفته‌ای چربی‌سوزی",
    subtitle: "تمرین ترکیبی + تمرین قدرتی + کاردیو",
    badge: "کاهش وزن",
    badgeTone: "violet" as const,
    weeks: "۴ هفته",
    level: "متوسط",
    image: IMG.coachSara,
  },
  {
    id: 2,
    title: "برنامه عضله‌سازی پیشرفته",
    subtitle: "تمرینات مقاومتی + مکمل‌های طبیعی",
    badge: "افزایش حجم",
    badgeTone: "neon" as const,
    weeks: "۸ هفته",
    level: "پیشرفته",
    image: IMG.coachAli,
  },
  {
    id: 3,
    title: "برنامه بهبود انعطاف‌پذیری",
    subtitle: "حرکات کششی + تمرین ذهن‌آگاهی",
    badge: "سلامت و آرامش",
    badgeTone: "cyan" as const,
    weeks: "۴ هفته",
    level: "متوسط",
    image: IMG.hero,
  },
  {
    id: 4,
    title: "برنامه آمادگی جسمانی عمومی",
    subtitle: "سه‌ماهه‌سازی + شرایط + تمرین هدفمند",
    badge: "تندرستی عمومی",
    badgeTone: "gold" as const,
    weeks: "۱۲ هفته",
    level: "پیشرفته",
    image: IMG.admin,
  },
];

export const bodyyarQuick = [
  { id: "plan", icon: "brain" as const, tone: "neon" as const, title: "برنامه تمرینی شخصی", desc: "متناسب با هدفت، سطح و شرایط شما" },
  { id: "food", icon: "apple" as const, tone: "violet" as const, title: "برنامه تغذیه هوشمند", desc: "بر اساس سبک زندگی و هدفت شما" },
  { id: "recovery", icon: "moon" as const, tone: "cyan" as const, title: "راهنمای ریکاوری", desc: "بهبود عملکرد و کاهش آسیب" },
  { id: "analysis", icon: "chart" as const, tone: "gold" as const, title: "تحلیل پیشرفت", desc: "با داده‌ها و هوش مصنوعی" },
];

export const notifications = [
  { id: 1, icon: "brain" as const, tone: "violet" as const, title: "پیام جدید از مربی", desc: "سارا محمدی برایتان پیامی ارسال کرد.", time: "۲ ساعت پیش", unread: true },
  { id: 2, icon: "gift" as const, tone: "gold" as const, title: "کمپین جدید", desc: "کمپین ۳۰ روزه سلامت آغاز شد.", time: "۴ ساعت پیش", unread: true },
  { id: 3, icon: "trophy" as const, tone: "violet" as const, title: "چالش جدید منتشر شد", desc: "یک چالش جدید در پلتفرم منتشر شد.", time: "۱ روز پیش", unread: true },
  { id: 4, icon: "shield" as const, tone: "violet" as const, title: "اطلاعیه سیستم", desc: "برنامه‌ریزی نگهداری سرور برای امشب.", time: "۲ روز پیش", unread: false },
];

export const navItems = [
  { id: "dashboard", label: "خانه", icon: "home" as const, href: "#/app" },
  { id: "coaches", label: "مربی‌ها", icon: "dumbbell" as const, href: "#/coaches" },
  { id: "bodyyar", label: "BodyYar", icon: "brain" as const, href: "#/bodyyar" },
  { id: "morshed", label: "مرشد", icon: "mic" as const, href: "#/morshed" },
  { id: "campaigns", label: "کمپین‌ها", icon: "trophy" as const, href: "#/campaigns" },
  { id: "profile", label: "پروفایل", icon: "user" as const, href: "#/profile" },
];

export const adminNav = [
  { id: "dash", label: "داشبورد", icon: "home" as const, href: "#/admin" },
  { id: "manage", label: "مربیان", icon: "dumbbell" as const, href: "#/manage" },
  { id: "requests", label: "درخواست‌ها", icon: "clipboard" as const, href: "#/admin", badge: "۱۲" },
  { id: "services", label: "خدمات", icon: "shield" as const, href: "#/admin", chevron: true },
  { id: "profiles", label: "پروفایل‌ها", icon: "file" as const, href: "#/admin", chevron: true },
  { id: "articles", label: "مقالات", icon: "edit" as const, href: "#/admin", chevron: true },
  { id: "faq", label: "سوالات متداول", icon: "message" as const, href: "#/admin", chevron: true },
  { id: "media", label: "رسانه", icon: "layers" as const, href: "#/admin", chevron: true },
  { id: "settings", label: "تنظیمات", icon: "settings" as const, href: "#/admin" },
  { id: "users", label: "کاربران", icon: "users" as const, href: "#/admin", chevron: true },
  { id: "reports", label: "گزارش فعالیت", icon: "activity" as const, href: "#/admin", chevron: true },
  { id: "account", label: "حساب من", icon: "user" as const, href: "#/admin" },
];

export const adminStats = [
  { id: 1, label: "کاربران کل", value: "۲,۴۸۲", trend: "۱۲٪", tone: "neon" as const, icon: "users" as const },
  { id: 2, label: "درخواست‌ها", value: "۳۶۷", trend: "۱۸٪", tone: "violet" as const, icon: "file" as const },
  { id: 3, label: "پروفایل‌ها", value: "۱۴۲", trend: "۹٪", tone: "gold" as const, icon: "wallet" as const },
  { id: 4, label: "خدمات", value: "۲۴", trend: "۴٪", tone: "cyan" as const, icon: "target" as const },
];

export const traffic = [
  { label: "جستجوی گوگل", value: 42, color: "#D7FF1F" },
  { label: "مستقیم", value: 28, color: "#6A3DFF" },
  { label: "شبکه‌های اجتماعی", value: 18, color: "#3B82F6" },
  { label: "ارجاعی", value: 8, color: "#22D3EE" },
  { label: "سایر", value: 4, color: "#A7ABB6" },
];

export const visitSeries = [
  { label: "شنبه", v: 620 },
  { label: "یکشنبه", v: 880 },
  { label: "دوشنبه", v: 760 },
  { label: "سه‌شنبه", v: 940 },
  { label: "چهارشنبه", v: 1180 },
  { label: "پنج‌شنبه", v: 830 },
  { label: "جمعه", v: 1290 },
];

export const recentAdmins = [
  { name: "علی محمدی", role: "درخواست مشاوره", date: "۱۴۰۴/۰۷/۱۴", status: "جدید" },
  { name: "سارا احمدی", role: "ثبت‌نام دوره", date: "۱۴۰۴/۰۷/۱۳", status: "در حال بررسی" },
  { name: "کاوه رضایی", role: "همکاری", date: "۱۴۰۴/۰۷/۱۲", status: "پیش‌نویس ذخیره شد" },
  { name: "مهدی کریمی", role: "درخواست دهنده", date: "۱۴۰۴/۰۷/۱۱", status: "جدید" },
  { name: "نگار شریفی", role: "پشتیبانی", date: "۱۴۰۴/۰۷/۱۰", status: "بسته شده" },
];

export const recentPrograms = [
  { title: "برنامه ترکیبی کاربر", meta: "ورزشی / آمادگی", views: "۱۲۰", status: "در حال بررسی", image: IMG.gym },
  { title: "کمپین برند ورزشی", meta: "تغذیه / کمپین", views: "۱۴۰", status: "در حال بررسی", image: IMG.admin },
  { title: "پرونده وسایل جدید", meta: "تجهیزات / فروشگاه", views: "۸۴", status: "تکمیل شده", image: IMG.campaign },
];

export const recentUsers = [
  { name: "محمد حسینی", role: "کاربر عادی", date: "۱۴۰۴/۰۷/۱۴" },
  { name: "سارا احمدی", role: "کاربر عادی", date: "۱۴۰۴/۰۷/۱۳" },
  { name: "علی رضایی", role: "مربی", date: "۱۴۰۴/۰۷/۱۳" },
  { name: "نیما شریفی", role: "کاربر عادی", date: "۱۴۰۴/۰۷/۱۱" },
  { name: "کاوه رضایی", role: "کاربر عادی", date: "۱۴۰۴/۰۷/۱۰" },
];

export const activityFeed = [
  { title: "درخواست جدید ثبت شد", meta: "از طریق علی محمدی", time: "۵ دقیقه پیش", tone: "neon" as const, icon: "settings" as const },
  { title: "پرونده جدید اضافه شد", meta: "پرونده «پیکربندی موبایل»", time: "۳ ساعت پیش", tone: "violet" as const, icon: "brain" as const },
  { title: "مقاله جدید منتشر شد", meta: "مقاله «آدینه ورزشی و تغذیه»", time: "۳ ساعت پیش", tone: "cyan" as const, icon: "file" as const },
  { title: "کاربر جدید ثبت‌نام کرد", meta: "sara_gh@gmail.com", time: "۵ ساعت پیش", tone: "violet" as const, icon: "user" as const },
  { title: "سوال جدید از بخش FAQ", meta: "موضوع: نحوه ثبت‌نام در دوره‌ها", time: "۶ ساعت پیش", tone: "gold" as const, icon: "message" as const },
];

export const homeModules = [
  { id: "workouts", title: "ورزشکاران", desc: "مسیر تمرین، پیشرفت و تجهیزات متنوع", tone: "neon" as const, icon: "users" as const },
  { id: "coaches", title: "مربیان", desc: "مربیان حرفه‌ای، برنامه‌های اختصاصی و نتایج واقعی", tone: "neon" as const, icon: "user" as const },
  { id: "bodyyar", title: "بدن‌یار", desc: "دستیار هوشمند ورزشی با فناوری هوش مصنوعی", tone: "cyan" as const, icon: "brain" as const },
  { id: "morshed", title: "مرشد", desc: "پادکست‌ها و محتوای صوتی برای رشد ذهن و بدن", tone: "violet" as const, icon: "mic" as const },
  { id: "sponsorship", title: "حامیان مالی", desc: "همکاری با برندها و فرصت‌های اسپانسری برای ورزشکاران", tone: "gold" as const, icon: "trophy" as const },
];

export const brandLogos = ["KAPOOSH", "NIKE", "adidas", "UNDER ARMOUR", "GYMSHARK", "MYPROTEIN"];

export const specialties = ["همه", "بدنسازی", "فیتنس و تناسب اندام", "دویدن", "تغذیه و سبک زندگی", "ورزش‌های رزمی", "یوگا"];

export const coachFilters = ["همه مربیان", "مردان", "زنان", "همه تخصص‌ها"];
