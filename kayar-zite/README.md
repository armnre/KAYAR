# کایار (KAYAR)

PWA فارسی و موبایل‌محور برند ورزشی «کاپوش»: سایت عمومی، اپ (بدن‌یار، مرشد) و پنل ادمین.

## معماری فعلی
- **یک اپ Docker** (پورت `3000`): سرور Express در `standalone/server.ts` هم سایت build‌شده (Vite) و هم همه‌ی endpointهای `apps/kayar/src/api` را زیر `/api/*` سرو می‌کند. `/healthz` پاسخ `ok` می‌دهد.
- **PostgreSQL** از طریق `DATABASE_URL`. جدول‌ها در اولین اجرا از روی `standalone/schema.json` ساخته می‌شوند و محتوای پایه از `standalone/seed/data.json.gz` وارد می‌شود (فقط اگر دیتابیس خالی باشد).
- **دیسک پایدار** لیارا روی `/data/uploads` (۲ گیگابایت) برای فایل‌های آپلودی ادمین.
- هیچ وابستگی runtime به Zite وجود ندارد.

## ساختار
| مسیر | نقش |
|---|---|
| `Dockerfile`، `liara.json`، `.dockerignore` | build و دپلوی روی لیارا |
| `standalone/` | سرور (`server.ts`)، لایه‌ی دیتابیس (`db.ts`)، seed، `build.mjs`، کانفیگ Vite و `head.html` (تگ‌های سئو/برند که در `index.html` تزریق می‌شوند) |
| `apps/kayar/` | کد اصلی: فرانت (`src/`) و endpointها (`src/api/`، منطق مشترک در `src/server/`) |
| `packages/components/` | کامپوننت‌های UI مشترک (shadcn) |

### فایل‌های Zite که هنوز لازم‌اند (و چرا)
- `apps/kayar/.zite/backend.ts` و `apps/kayar/.zite/api.ts`: build (`build.mjs` و `standalone/vite.config.ts`) آن‌ها را به‌جای `zitejs/backend` و `zitejs/api` استفاده می‌کند.
- پکیج `zitejs` در `package.json`: کلاینت فراخوانی endpointها و پایه‌ی `createEndpoint` از آن bundle می‌شود.
- `.zite/db.ts` (ریشه) و بقیه‌ی `apps/kayar/.zite/*`: فقط برای تایپ‌چک (`tsconfig` مسیر `zitejs/db` و … را به آن‌ها می‌دهد). در runtime، `zitejs/db` به `standalone/db.ts` وصل است.

## متغیرهای محیطی
نمونه در `.env.example`. اجباری: `DATABASE_URL`، `PUBLIC_URL`، `ZITE_BOOTSTRAP_ADMIN_USERNAME`، `ZITE_BOOTSTRAP_ADMIN_PASSWORD` (حداقل ۱۰ کاراکتر)، `ZITE_AUTH_PEPPER`، `ZITE_NARAROUTER_API_KEY`.
اختیاری: `PORT`، `UPLOAD_DIR`، `UPLOAD_LIMIT`، `DB_POOL_SIZE`، `ZITE_SMS_PROVIDER`، `ZITE_SMS_API_KEY`، `ZITE_SMS_SENDER`، `ZITE_ZARINPAL_MERCHANT_ID`، `ZITE_ZARINPAL_SANDBOX`.

## اجرای محلی
```
cd kayar-zite
npm install && cd standalone && npm install && node build.mjs
DATABASE_URL=postgres://... PUBLIC_URL=http://localhost:3000 STATIC_DIR=dist/public UPLOAD_DIR=./uploads SEED_FILE=seed/data.json.gz node dist/server.mjs
```

## دپلوی روی لیارا
از داخل پوشه‌ی `kayar-zite`:
```
liara deploy
```
تنظیمات (`liara.json`): پلتفرم Docker، پورت `3000`، دیسک `uploads` روی `/data/uploads`.

## اتصال دامنه (kayar.kapoosh.ir)
1. در پنل لیارا دامنه‌ی `kayar.kapoosh.ir` را به اپ اضافه کنید و رکورد DNS (CNAME یا A) را طبق راهنمای لیارا در DNS دامنه‌ی kapoosh.ir بسازید.
2. بعد از فعال شدن SSL، مقدار `PUBLIC_URL` را `https://kayar.kapoosh.ir` بگذارید و Redeploy کنید.
3. هیچ آدرس دامنه‌ای در کد هاردکد نیست؛ فقط `robots.txt` و `sitemap.xml` به دامنه‌ی نهایی اشاره می‌کنند.
