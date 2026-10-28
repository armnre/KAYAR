# کایار (KAYAR)

PWA فارسی و موبایل‌محور برند ورزشی «کاپوش»: سایت عمومی، اپ (بدن‌یار، مرشد) و پنل ادمین.

> **دپلوی همیشه از داخل همین پوشه (`kayar-zite/`) انجام می‌شود، نه از ریشه‌ی ریپو.**
> نسخه‌ی قدیمی Next.js + Drizzle در branch `archive/nextjs-drizzle` آرشیو شده است.

## معماری
- **یک اپ Docker** (پورت `3000`): سرور Express در `standalone/server.ts` هم سایت build‌شده (Vite) و هم همه‌ی endpointهای `apps/kayar/src/api` را زیر `POST /api/*` سرو می‌کند.
- **PostgreSQL** از طریق `DATABASE_URL`. جدول‌ها هنگام بالا آمدن از روی `standalone/schema.json` ساخته/تکمیل می‌شوند (idempotent) و اگر دیتابیس خالی باشد محتوای پایه از `standalone/seed/data.json.gz` وارد می‌شود. جدول‌های داخلی سرور با پیشوند `_` (`_SystemErrors`، `_SystemMeta`، `_UploadLog`، `_Quota`) هم خودکار ساخته می‌شوند.
- **دیسک پایدار** لیارا روی `/data/uploads` (۲ گیگابایت) برای فایل‌های آپلودی.
- هیچ وابستگی runtime به Zite وجود ندارد.

## ساختار ریپو
| مسیر | نقش |
|---|---|
| `Dockerfile`، `liara.json`، `.dockerignore` | build و دپلوی روی لیارا |
| `standalone/server.ts` | سرور اصلی: هدرهای امنیتی، rate limit، endpointها، سئو، service worker |
| `standalone/uploads.ts` | آپلود امن (نشست، نقش، magic bytes، سهمیه، محافظ دیسک) و یافتن فایل‌های یتیم |
| `standalone/ratelimit.ts` | محدودیت نرخ درون‌حافظه‌ای |
| `standalone/seo.ts` | تگ‌های head سمت سرور، 404 واقعی، `sitemap.xml` و `robots.txt` پویا |
| `standalone/log.ts`، `standalone/ops.ts` | لاگ JSON، جدول خطاها، هشدار webhook، `/healthz?deep=1`، `/ops/*` (سلامت، بک‌آپ، فایل‌های یتیم) |
| `standalone/backup.ts`، `standalone/seed.ts` | بک‌آپ stream و import (seed/restore) با یک فرمت |
| `standalone/scripts/*.ts` | اسکریپت‌های CLI (بعد از build در `dist/scripts/*.mjs`؛ داخل کانتینر در `/srv/scripts`) |
| `standalone/pwa/sw.ts` | service worker (Workbox، بدون CDN) |
| `standalone/db.ts` | لایه‌ی دیتابیس (همان API `zitejs/db` روی PostgreSQL) |
| `standalone/head.html` | تگ‌های head پیش‌فرض (بلوک `<!--seo:start-->…<!--seo:end-->` را سرور برای هر صفحه جایگزین می‌کند) |
| `apps/kayar/` | کد اصلی: فرانت (`src/`) و endpointها (`src/api/`، منطق مشترک در `src/server/`) |
| `packages/components/` | کامپوننت‌های UI مشترک (shadcn) |
| `docs/members-sample.csv` | نمونه‌ی فایل ساخت گروهی مشتری |

فایل‌های `apps/kayar/.zite/*` و `.zite/db.ts` فقط برای build/تایپ‌چک لازم‌اند (به‌جای `zitejs/backend`، `zitejs/api` و تایپ‌های دیتابیس).

## متغیرهای محیطی
نمونه در `.env.example`. **هیچ مقدار واقعی را commit نکنید.**

اجباری: `DATABASE_URL`، `PUBLIC_URL`، `ZITE_AUTH_PEPPER`، `ZITE_NARAROUTER_API_KEY`، و برای اولین راه‌اندازی `ZITE_BOOTSTRAP_ADMIN_USERNAME` / `ZITE_BOOTSTRAP_ADMIN_PASSWORD`.

اختیاری (همه پیش‌فرض امن دارند؛ بدون تنظیم، دپلوی فعلی بدون تغییر بالا می‌آید):

| نام | پیش‌فرض | توضیح |
|---|---|---|
| `PORT`، `UPLOAD_DIR`، `DB_POOL_SIZE`، `DATABASE_SSL` | `3000`، `/data/uploads`، `10`، خاموش | |
| `UPLOAD_LIMIT` | `50mb` | سقف هر فایل برای کادر/ادمین |
| `UPLOAD_MEMBER_MAX_MB` | `2` | سقف هر فایل عضو (فقط JPG/PNG/WebP) |
| `UPLOAD_MEMBER_DAILY_MB` / `UPLOAD_MEMBER_DAILY_FILES` | `10` / `20` | سهمیه‌ی روزانه‌ی هر عضو |
| `UPLOAD_MAX_TOTAL_MB` | `1800` | محافظ کل دیسک: بالاتر از آن آپلود غیرادمین رد می‌شود |
| `RL_UPLOAD_PER_MIN` | `10` | آپلود در دقیقه برای هر کاربر (برای هر IP دو برابر) |
| `RL_API_PER_MIN` / `RL_PUBLIC_PER_MIN` | `120` / `600` | سقف عمومی `/api` و endpointهای خواندنی عمومی برای هر IP |
| `RL_LOGIN_PER_MIN` / `RL_LOGIN_PER_15MIN` | `10` / `30` | ورود برای هر IP (علاوه بر قفل ۵ تلاش ناموفق برای هر نام کاربری) |
| `RL_SMS_PER_HOUR` / `RL_CAMPAIGN_ACTIONS_PER_HOUR` | `30` / `20` | پنل پیامک، و ثبت‌نام/پرداخت کمپین (پیامک‌دار) برای هر IP |
| `RATE_LIMIT_DISABLED` | خاموش | `1` = خاموش کردن همه‌ی rate limitها (فقط برای اضطرار) |
| `AI_DAILY_LIMIT` / `AI_TIMEOUT_MS` | `30` / `120000` | سهمیه‌ی روزانه‌ی هر کاربر برای مربی هوشمند و ساخت برنامه، و timeout |
| `API_BODY_LIMIT` | `2mb` | سقف بدنه‌ی JSON |
| `TRUST_PROXY` | `1` | تعداد پراکسی جلوی کانتینر (لیارا = ۱). برای کلید rate limit از IP واقعی استفاده می‌شود |
| `CSP_ENFORCE` | خاموش | CSP فعلاً Report-Only است؛ `1` = اجباری |
| `HEALTH_TOKEN` | — | توکن برای `GET /healthz?deep=1` با هدر `x-health-token` |
| `ALERT_WEBHOOK_URL` | — | webhook عمومی (JSON POST) برای خطاهای بحرانی؛ حداکثر یک پیام در ۱۵ دقیقه برای هر نوع |
| `ERROR_LOG_CAP` | `500` | سقف ردیف‌های جدول خطاهای اخیر |
| `SW_DISABLED` | خاموش | `1` = kill-switch: service worker همه‌ی کاربران خودش را حذف و کش‌ها را پاک می‌کند |
| `ZITE_SMS_*`، `ZITE_ZARINPAL_*` | — | پیامک و درگاه پرداخت |

## اجرای محلی
```
cd kayar-zite
npm install && cd standalone && npm install && node build.mjs
DATABASE_URL=postgres://... PUBLIC_URL=http://localhost:3000 STATIC_DIR=dist/public UPLOAD_DIR=./uploads SEED_FILE=seed/data.json.gz node dist/server.mjs
```
تایپ‌چک: `cd apps/kayar && npx tsc --noEmit`

## دپلوی روی لیارا
```
cd kayar-zite
liara deploy
```
`liara.json`: پلتفرم Docker، پورت `3000`، دیسک `uploads` روی `/data/uploads`. merge به `main` به‌تنهایی دپلوی نمی‌کند.

## راه‌اندازی اولیه بعد از دیتابیس خالی
1. `ZITE_BOOTSTRAP_ADMIN_USERNAME` و `ZITE_BOOTSTRAP_ADMIN_PASSWORD` را تنظیم و دپلوی کنید. مدیر ارشد **فقط وقتی هیچ مدیر ارشدی وجود ندارد** ساخته می‌شود؛ رمز با ری‌استارت دوباره روی env ریست نمی‌شود.
2. در `/admin/login` وارد شوید؛ سیستم شما را **مجبور به تغییر رمز** می‌کند (حداقل ۱۰ نویسه، نه فقط عدد، نه شبیه شماره موبایل، نه رمز رایج/تکراری).
3. بعد از تغییر رمز می‌توانید متغیرهای bootstrap را پاک کنید.
4. ساخت مشتری:
   - **تکی:** پنل ادمین ← مشتریان ← افزودن (رمز موقت ساخته می‌شود و مشتری در اولین ورود باید آن را عوض کند).
   - **گروهی با CSV:** پنل ادمین ← مشتریان ← ساخت گروهی. فایل UTF-8 با ستون‌های `name,phone,orderRef` (یا سرستون فارسی `نام`، `موبایل`، `سفارش`)، حداکثر ۲۰۰ ردیف؛ نمونه: `docs/members-sample.csv`. اول «بررسی» (dry-run) خطاها را نشان می‌دهد، بعد «ساخت». ارسال دوباره‌ی همان دسته تکراری نمی‌سازد. در پایان فایل CSV نام کاربری و رمز موقت را دانلود کنید (فقط همان لحظه قابل مشاهده است).
5. **ساخت/بازنشانی ادمین از CLI** (مثلاً اگر رمز مدیر ارشد گم شد) — در کنسول اپ لیارا:
   ```
   node scripts/create-admin.mjs <username> [--role superadmin|admin|editor|support] [--name "نام"]
   ```
   رمز را مخفی می‌پرسد (یا از `ADMIN_PASSWORD`). اگر کاربر وجود داشته باشد رمزش بازنشانی و همه‌ی نشست‌هایش باطل می‌شود. حساب در ورود بعدی مجبور به تغییر رمز است. به `DATABASE_URL` و همان `ZITE_AUTH_PEPPER` محیط تولید نیاز دارد.

## بک‌آپ و بازیابی
- **خودکار (پیشنهادی):** بک‌آپ خودکار PostgreSQL در کنسول لیارا (پایین: کارهای دستی).
- **از پنل:** داشبورد ادمین ← «سلامت سیستم» ← «دانلود بک‌آپ» (فقط مدیر ارشد). فایل `kayar-backup-*.json.gz` به‌صورت stream ساخته می‌شود و روی دیسک سرور ذخیره نمی‌شود.
- **از CLI:** `node scripts/backup.mjs [file.json.gz]` (یا `-` برای stdout).
- فرمت همان فرمت seed است: `{ tables, links, uploadsManifest, counts }`. نشست‌ها و تلاش‌های ورود خارج نمی‌شوند (بعد از بازیابی همه دوباره وارد می‌شوند). رمزها به‌صورت هش (PBKDF2) هستند و **فقط با همان `ZITE_AUTH_PEPPER`** کار می‌کنند — pepper را جای امنی جدا نگه دارید.
- **بازیابی:** `node scripts/restore.mjs <file.json.gz>` — فقط روی دیتابیس خالی. برای بازنویسی دیتابیس پر: `--force --yes-i-understand` (اول بک‌آپ بگیرید). خروجی، تعداد رکوردها را با `counts` داخل فایل مقایسه می‌کند.
- **فایل‌های آپلودی:** بک‌آپ شامل `uploadsManifest` (نام، حجم، sha256 هر فایل) است، نه خود فایل‌ها. برای کپی فایل‌ها از بخش «دیسک‌ها» ← `uploads` ← مدیریت فایل/دانلود در کنسول لیارا استفاده کنید و بعد از بازیابی با manifest مقایسه کنید. این مرحله خودکار نیست.
- **فایل‌های یتیم و مصرف دیسک:** پنل «سلامت سیستم» ← «بررسی فایل‌های یتیم» (dry-run؛ حذف فقط با تأیید دوباره)، یا `node scripts/uploads-report.mjs [--delete-orphans --yes]`.

## لاگ و مانیتورینگ
- همه‌ی لاگ‌ها JSON یک‌خطی روی stdout هستند (`level`، `time`، `msg`، `requestId`، `path`، `status`، `ms`) و در لاگ‌های لیارا قابل جست‌وجو؛ مثلاً `"level":"error"` یا یک `requestId` (هدر `X-Request-Id` پاسخ).
- `GET /healthz` ← `ok` یا `503 db down`. `GET /healthz?deep=1` (هدر `x-health-token: $HEALTH_TOKEN` یا نشست ادمین) ← وضعیت دیتابیس، مصرف دیسک، نسخه، خطاهای ۲۴ ساعت و آخرین بک‌آپ.
- **مانیتور ساده:** در Uptime Kuma (یا هر سرویس ping) یک مانیتور HTTP روی `https://kayar.kapoosh.ir/healthz` با فاصله‌ی ۶۰ ثانیه و «کلمه‌ی کلیدی» `ok` بسازید. برای جزئیات، مانیتور «HTTP(s) - Json Query» روی `/healthz?deep=1` با هدر `x-health-token` و شرط `db == "ok"`.

## امنیت (خلاصه)
- آپلود فقط با نشست معتبر؛ عضو فقط تصویر ۲ مگابایتی با سهمیه‌ی روزانه؛ بررسی magic bytes؛ svg کلاً ممنوع؛ `/uploads` با `nosniff` و برای هر نوع غیررسانه‌ای با CSP sandbox.
- هدرها: `X-Content-Type-Options`، `Referrer-Policy`، `X-Frame-Options: DENY`، `Permissions-Policy`، HSTS فقط روی https، CSP به‌صورت Report-Only.
- خطاهای ۵۰۰ فقط پیام عمومی فارسی به کلاینت می‌دهند؛ جزئیات فقط در لاگ و جدول خطاها.

## کارهای دستی لیارا (بعد از هر تغییر مهم)
1. فعال‌سازی **بک‌آپ خودکار PostgreSQL** در کنسول لیارا (دیتابیس ← بک‌آپ) با برنامه‌ی روزانه و نگهداری حداقل ۷ نسخه.
2. تنظیم متغیرهای اختیاری دلخواه (جدول بالا)؛ پیشنهادی: `HEALTH_TOKEN`، و در صورت نیاز `ALERT_WEBHOOK_URL`.
3. `liara deploy` از داخل پوشه‌ی `kayar-zite`.
4. اگر دیتابیس تازه است: ورود اول مدیر و تغییر رمز.
5. راه‌اندازی مانیتور ping روی `/healthz`.

## اتصال دامنه (kayar.kapoosh.ir)
1. در پنل لیارا دامنه را به اپ اضافه کنید و رکورد DNS را طبق راهنمای لیارا بسازید.
2. بعد از فعال شدن SSL، `PUBLIC_URL=https://kayar.kapoosh.ir` بگذارید و Redeploy کنید.
3. canonical، og:image و sitemap بر پایه‌ی `PUBLIC_URL` ساخته می‌شوند (اگر تنظیم نشده باشد، از آدرس درخواست)؛ هیچ دامنه‌ای در کد هاردکد نیست.

## مرشد (موزیک) — نسخه ۴

- **جریان کار ادمین:** پنل ادمین ← مرشد ← «منابع و import» (فعال‌سازی منبع با پذیرش صریح مسئولیت مجوز) ← اجرای import با نوار پیشرفت و لاگ ← «بررسی ترک‌ها» (تأیید گروهی / رد / حذف فوری ترک یا همه‌ی آثار یک هنرمند) ← انتشار.
- **منابع:** `apps/kayar/src/server/music/adapters.ts` (Musicdel از RSS ریشه، Nex1Music و Musics-Fa از sitemap). robots.txt رعایت می‌شود، حداکثر ۱ درخواست در ثانیه به هر سایت، User-Agent شفاف، retry با backoff.
- **پخش:** مرورگر فقط با دامنه‌ی خود کایار حرف می‌زند: `GET /media/stream/:id` (با Range) و `GET /media/cover/:id` (`standalone/media.ts`). کش LRU روی دیسک با سقف `MEDIA_CACHE_MB` (پیش‌فرض ۵۰۰ مگابایت) که با پر شدن آپلودها خودکار کوچک می‌شود.
- **منابع آزاد (Openverse: Jamendo/Freesound/Wikimedia، و ccMixter):** فقط مجوزهای CC بدون NC/ND؛ نام اثر، هنرمند و مجوز روی هر ترک ذخیره می‌شود.
- **آینه‌ی دائمی:** هر ترک منتشرشده (و کاورش) هر ۵ دقیقه به‌تدریج در `UPLOAD_DIR/.media-library` کپی می‌شود (سقف `MEDIA_LIBRARY_MB`، پیش‌فرض ۱۲۰۰). بعد از آن پخش کاملاً از دیسک خود کایار است و به دسترس‌پذیری منبع یا فیلترینگ وابسته نیست.
- **import شبانه:** در ادمین ← مرشد ← منابع، ساعت (به وقت تهران)، سقف ترک و «انتشار خودکار ترک‌های مجوز آزاد» قابل تنظیم است.
- **فیلترها:** مذهبی/مداحی، محتوای نامناسب، تیزر/آلبوم/پلی‌لیست، زیر ۱۲۸kbps، مدت خارج از ۱:۳۰ تا ۸ دقیقه، غیرفارسی؛ dedupe با نرمال‌سازی فارسی؛ فهرست سیاه برای Takedown.
- **پاک‌سازی ترک‌های قدیمی:** خودکار و یک‌باره هنگام بالا آمدن سرور (`migration.morshed-v4` در SiteSettings؛ ترک‌های آپلودی دست نمی‌خورند). برای حذف کامل همه‌ی ترک‌ها + فایل‌های صوتی یتیم: `node scripts/purge-tracks.mjs --yes` داخل کانتینر، یا دکمه‌ی «حذف همه…» در ادمین.
