# استقرار KAYAR روی لیارا (PaaS)

## معماری
- **فرانت‌اند** (سایت، اپ اعضا، پنل ادمین): روی لیارا با پلتفرم **Docker** (ساخت با Vite و سرو با Nginx).
- **بک‌اند** (همه‌ی `src/api/*`، دیتابیس، هوش مصنوعی، پیامک، پرداخت): روی Zite می‌ماند. Nginx همه‌ی درخواست‌های `/api/*` را به دامنه‌ی منتشرشده‌ی Zite پروکسی می‌کند، پس کاربر فقط دامنه‌ی شما را می‌بیند.

> چرا Docker؟ پلتفرم React/Static لیارا یک پروژه‌ی تک‌پوشه‌ای با خروجی build می‌خواهد. این پروژه monorepo است (`apps/` + `packages/`) و پروکسی `/api` لازم دارد؛ Docker دقیق‌ترین گزینه است. ([مستندات Docker لیارا](https://docs.liara.ir/paas/docker/getting-started/) · [CLI deploy](https://docs.liara.ir/references/cli/deploy-app/))

## فایل‌ها (همه داخل پوشه‌ی `kayar-zite/`)
| فایل | کار |
|---|---|
| `Dockerfile` | ساخت دومرحله‌ای: Node 20 → `vite build` (+ تزریق تگ‌های سئو/برند در `index.html`) → Nginx |
| `deploy/nginx.conf.template` | SPA fallback، gzip، کش، هدرهای امنیتی، `/healthz`، پروکسی `/api/` با پشتیبانی استریم |
| `deploy/head.html` | عنوان، توضیحات، Open Graph، فاوآیکن، manifest |
| `liara.json` | `platform: docker`، `port: 80`، health check |
| `apps/kayar/public/` | فاوآیکن SVG/PNG، آیکن‌های PWA، `og.png`، `manifest.webmanifest`، `robots.txt`، `sitemap.xml` |
| `deploy/github-workflow-liara.yml` | استقرار خودکار با هر push؛ یک‌بار در گیت‌هاب به مسیر `.github/workflows/liara.yml` (ریشه‌ی ریپو) منتقل کنید |

## گام‌ها
1. **انتشار بک‌اند در Zite**: اپ را Publish کنید و دامنه‌اش را یادداشت کنید (مثلاً `kayar.zite.so`).
2. **ساخت برنامه در لیارا**: console.liara.ir ← برنامه‌ها ← ایجاد برنامه ← پلتفرم **Docker** ← شناسه `kayar` (اگر نام دیگری گذاشتید، در `liara.json` هم عوض کنید). پلن حداقل ۵۱۲MB رم برای مرحله‌ی build کافی است.
3. **متغیر محیطی** (تنظیمات برنامه ← متغیرها): `BACKEND_HOST=kayar.zite.so` (بدون https و بدون `/`).
4. **استقرار**:
   - با CLI (از داخل پوشه‌ی `kayar-zite`):
     ```bash
     npm i -g @liara/cli
     liara login
     cd kayar-zite && liara deploy
     ```
   - یا خودکار با GitHub: در ریپو ← Settings ← Secrets and variables ← Actions ← `LIARA_API_TOKEN` (از کنسول لیارا ← کلیدهای API). در صورت نیاز متغیر `LIARA_APP` را هم بسازید. هر push روی `main` مستقر می‌شود.
5. **دامنه و SSL**: لیارا ← برنامه ← دامنه‌ها ← افزودن `kayar.ir` و `www.kayar.ir`؛ رکوردهای DNS را طبق راهنمای همان صفحه ثبت و SSL رایگان را فعال کنید.
6. **سئو**: اگر دامنه چیزی جز `kayar.ir` است، آن را در `apps/kayar/public/robots.txt` و `sitemap.xml` عوض کنید.
7. **درگاه پرداخت (اختیاری)**: در Zite سکرت `ZITE_ZARINPAL_MERCHANT_ID` (برای تست `ZITE_ZARINPAL_SANDBOX=1`). آدرس بازگشت `${ZITE_APP_URL}/shop/callback` است.
8. **پیامک (اختیاری)**: سکرت‌های `ZITE_SMS_PROVIDER` (`kavenegar` یا `smsir`)، `ZITE_SMS_API_KEY`، `ZITE_SMS_SENDER`.

## تست محلی
```bash
cd kayar-zite
docker build -t kayar .
docker run -p 8080:80 -e BACKEND_HOST=kayar.zite.so kayar
# http://localhost:8080  ·  http://localhost:8080/healthz
```

## نکات
- بعد از هر تغییر endpoint در Zite، کد به‌روز (شامل `apps/kayar/.zite/api.ts`) را push کنید تا لیارا نسخه‌ی جدید را بسازد.
- آپلود فایل تا ۵۰ مگابایت از پروکسی عبور می‌کند (`client_max_body_size`).
- پاسخ استریم مربی هوشمند با `proxy_buffering off` بدون تاخیر می‌رسد.
- سرور در لیارا روی پورت ۸۰ گوش می‌دهد و health check مسیر `/healthz` را می‌زند.


## رفع خطای 502 روی /api (بدون فیلترشکن)
- خطای 502 یعنی سرور لیارا نتوانسته به بک‌اند (Zite) وصل شود. آدرس `https://دامنه/__backend` را باز کنید: اگر JSON دیدید ارتباط سالم است.
- اگر `__backend` خطا داد، دامنه‌ی `zite.so` از داخل دیتاسنتر ایران در دسترس نیست. راه‌حل قطعی: یک دامنه‌ی اختصاصی (مثلاً `api.kapoosh.ir`) به اپ Zite وصل کنید و در لیارا `BACKEND_HOST=api.kapoosh.ir` بگذارید و Redeploy کنید.
- محتوای عمومی سایت روی لیارا کش می‌شود و هنگام قطعی بک‌اند هم نمایش داده می‌شود.
