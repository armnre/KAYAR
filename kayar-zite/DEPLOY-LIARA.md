# استقرار KAYAR روی لیارا (PaaS)

## معماری
- **فرانت‌اند** (سایت، اپ اعضا، پنل ادمین): روی لیارا با پلتفرم **Docker** اجرا می‌شود (ساخت با Vite + سرو با Nginx).
- **بک‌اند** (همه‌ی `src/api/*`، دیتابیس، هوش مصنوعی، پیامک، پرداخت): روی Zite می‌ماند. Nginx همه‌ی درخواست‌های `/api/*` را به دامنه‌ی منتشرشده‌ی Zite پاس می‌دهد، پس کاربر فقط دامنه‌ی شما را می‌بیند.

> چرا Docker و نه پلتفرم React؟ پلتفرم React لیارا فقط پروژه‌ی تک‌پوشه‌ای Vite/CRA با خروجی `build` را می‌پذیرد و Nginx آن قابل پروکسی کامل نیست. این پروژه monorepo است (`apps/` + `packages/`)، پس Docker دقیق‌ترین و قابل‌کنترل‌ترین گزینه است.

## فایل‌ها
| فایل | کار |
|---|---|
| `Dockerfile` | ساخت چندمرحله‌ای: Node 20 → `vite build` → Nginx |
| `deploy/nginx.conf.template` | SPA fallback، gzip، کش assets، هدرهای امنیتی، پروکسی `/api/` با پشتیبانی استریم |
| `liara.json` | `platform: docker`، `port: 80` |
| `.github/workflows/liara.yml` | استقرار خودکار با هر push روی `main` |

## گام‌ها
1. **انتشار بک‌اند در Zite**: اپ را Publish کنید و دامنه‌اش را یادداشت کنید (مثلاً `kayar.zite.so`).
2. **ساخت برنامه در لیارا**: کنسول لیارا ← ایجاد برنامه ← پلتفرم **Docker** ← شناسه `kayar` (یا هر نام دیگر و همان را در `liara.json` بگذارید).
3. **متغیر محیطی**: در تنظیمات برنامه‌ی لیارا: `BACKEND_HOST=kayar.zite.so` (دامنه‌ی مرحله ۱، بدون https).
4. **استقرار**:
   - با CLI: `npm i -g @liara/cli && liara login && liara deploy`
   - یا با GitHub: در ریپو ← Settings ← Secrets ← `LIARA_API_TOKEN` (از کنسول لیارا ← API) بسازید؛ هر push روی `main` خودکار مستقر می‌شود.
5. **دامنه**: در لیارا ← دامنه‌ها، دامنه‌ی خودتان (مثلاً `kayar.ir`) را اضافه و SSL را فعال کنید.
6. **درگاه پرداخت**: در Zite سکرت `ZITE_ZARINPAL_MERCHANT_ID` را اضافه کنید (برای تست `ZITE_ZARINPAL_SANDBOX=1`). آدرس بازگشت `${ZITE_APP_URL}/shop/callback` است؛ اگر دامنه‌ی اصلی لیاراست، دامنه‌ی سفارشی Zite را هم روی همان تنظیم کنید یا `ZITE_APP_URL` را مطابق آن بگذارید.
7. **پیامک**: سکرت‌های `ZITE_SMS_PROVIDER` (`kavenegar` یا `smsir`)، `ZITE_SMS_API_KEY`، `ZITE_SMS_SENDER`.

## تست محلی
```bash
docker build -t kayar .
docker run -p 8080:80 -e BACKEND_HOST=kayar.zite.so kayar
# http://localhost:8080
```

## نکات
- بعد از اضافه‌کردن endpoint جدید در Zite، فایل `apps/kayar/.zite/api.ts` باید به‌روز در ریپو باشد (خودکار در push انجام می‌شود).
- آپلود فایل تا ۵۰ مگابایت از طریق پروکسی مجاز است (`client_max_body_size`).
- استریم پاسخ مربی هوشمند با `proxy_buffering off` بدون تاخیر به کاربر می‌رسد.
