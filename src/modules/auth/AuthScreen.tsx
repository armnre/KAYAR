import { useCallback, useEffect, useState } from "react";
import { Icon, Logo } from "../../components/icons";
import { Button } from "../../components/ui/button";
import { PhoneInput, OtpInput, Checkbox } from "../../components/ui/field";
import { ErrorState, Spinner } from "../../components/ui/feedback";
import { AppError, toUserMessage } from "../../lib/errors";
import { createLogger } from "../../lib/logger";
import { parseOrThrow } from "../../lib/validation";
import {
  maskPhoneDisplay,
  normalizePhone,
  isValidIranMobile,
} from "./phone";
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  canResend,
  otpRemainingSeconds,
  resendWaitSeconds,
  sanitizeOtpInput,
} from "./otp";
import { toPersianDigits } from "./phone";
import { phoneSchema, otpCodeSchema, type AuthGateway, type RequestOtpResult } from "./contracts";
import { UnavailableAuthGateway } from "./contracts";

const log = createLogger({ service: "auth-ui" });

type Step = "phone" | "otp" | "done";

const PICTURE =
  "کایار برای ورود از رمز یک‌بارمصرف استفاده می‌کند؛ بدون رمز عبور و بدون نشت اطلاعات.";

export interface AuthScreenProps {
  /** injected in production by the app composition root */
  gateway?: AuthGateway;
  onAuthenticated?: () => void;
  /** Dev SMS port only — never part of the AuthGateway contract. */
  deliveredCode?: string | null;
}

export function AuthScreen({ gateway = new UnavailableAuthGateway(), onAuthenticated, deliveredCode }: AuthScreenProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<RequestOtpResult | null>(null);
  const [requestedAtMs, setRequestedAtMs] = useState<number>(Date.now());
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // countdown ticker only while the OTP step is active
  useEffect(() => {
    if (step !== "otp") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const phoneError = phone.length > 0 && !isValidIranMobile(phone) ? "شماره موبایل معتبر نیست." : undefined;

  const submitPhone = useCallback(async () => {
    setError(null);
    try {
      const canonical = parseOrThrow(phoneSchema, phone);
      if (!consent) {
        setError("برای ادامه، قوانین و حریم خصوصی را بپذیرید.");
        return;
      }
      setBusy(true);
      const res = await gateway.requestOtp({ phone: canonical, ip: undefined });
      setChallenge(res);
      setRequestedAtMs(Date.now());
      setStep("otp");
      setCode("");
      log.info("auth.otp_requested", { phone: canonical });
    } catch (e) {
      const message = toUserMessage(e);
      setError(message);
      log.warn("auth.otp_request_failed", { reason: e instanceof AppError ? e.code : "unknown" });
    } finally {
      setBusy(false);
    }
  }, [phone, consent, gateway]);

  const submitCode = useCallback(async () => {
    setError(null);
    try {
      const verified = parseOrThrow(otpCodeSchema, code);
      if (!challenge) return;
      setBusy(true);
      await gateway.verifyOtp({ challengeId: challenge.challengeId, code: verified });
      setStep("done");
      onAuthenticated?.();
      log.info("auth.otp_verify_success", {});
    } catch (e) {
      setError(toUserMessage(e));
      log.warn("auth.otp_verify_failed", { reason: e instanceof AppError ? e.code : "unknown" });
    } finally {
      setBusy(false);
    }
  }, [code, challenge, gateway, onAuthenticated]);

  const resend = useCallback(async () => {
    if (!challenge) return;
    setError(null);
    try {
      setBusy(true);
      const res = await gateway.resendOtp(challenge.challengeId);
      setChallenge(res);
      setRequestedAtMs(Date.now());
      setCode("");
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }, [challenge, gateway]);

  const resendIn = challenge
    ? resendWaitSeconds(requestedAtMs, now, challenge.resendAfterSeconds)
    : 0;
  const canResendNow = challenge ? canResend(requestedAtMs, now, challenge.resendAfterSeconds) : false;
  const otpExpiresIn = challenge ? otpRemainingSeconds(requestedAtMs, now) : 0;

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-base">
      {/* background */}
      <div className="absolute inset-0">
        <img
          src="/images/admin-hero.jpg"
          alt=""
          width={1600}
          height={900}
          className="h-full w-full object-cover object-[65%_center] opacity-70"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_70%_30%,transparent_10%,#0A0C0E_72%)]" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0A0C0E]/70 to-[#0A0C0E]" />
        <div className="shards" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-5 py-12">
        <div className="mb-7 flex items-center justify-between">
          <a href="#/" className="btn btn-ghost !min-h-10 !px-3 !text-[0.78rem]">
            <Icon name="arrowRight" size={15} />
            بازگشت
          </a>
          <Logo size="md" />
        </div>

        <div className="panel p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <span className="tag mb-3 inline-flex border-neon/30 bg-neon/10 text-neon">
                {step === "phone" ? "ورود امن" : step === "otp" ? "تایید شماره" : "ورود موفق"}
              </span>
              <h1 className="t-h1">
                {step === "phone" ? "به کایار خوش آمدید" : step === "otp" ? "کد تایید را وارد کنید" : "وارد شدید"}
              </h1>
            </div>
            {busy && <Spinner size={20} className="mt-2 text-neon" />}
          </div>

          {step === "phone" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitPhone();
              }}
            >
              <p className="t-body-sm text-muted">{PICTURE}</p>

              <PhoneInput
                value={phone}
                onChange={setPhone}
                error={phoneError}
                disabled={busy}
                loading={busy}
              />

              <Checkbox label="قوانین و حریم خصوصی کایار را می‌پذیرم" checked={consent} onChange={setConsent} />

              {error && <ErrorState title="ارسال کد تایید" description={error} />}

              <Button type="submit" size="lg" block loading={busy} endIcon="arrowLeft" disabled={!isValidIranMobile(phone)}>
                دریافت کد تایید
              </Button>

              <ul className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: "shield" as const, t: "کد ۶ رقمی" },
                  { icon: "clock" as const, t: `اعتبار ${OTP_TTL_SECONDS} ثانیه` },
                  { icon: "target" as const, t: `حداکثر ${OTP_MAX_ATTEMPTS} تلاش` },
                ].map((i) => (
                  <li key={i.t} className="tag !py-1.5">
                    <Icon name={i.icon} size={12} className="text-neon" />
                    {i.t}
                  </li>
                ))}
              </ul>
            </form>
          )}

          {step === "otp" && challenge && (
            <div className="flex flex-col gap-4">
              <p className="t-body-sm text-muted">
                کد شش‌رقمی به شماره‌ی <span className="num font-bold text-white">{maskPhoneDisplay(challenge.maskedPhone)}</span> پیامک شد.
              </p>

              <div className="py-1">
                <OtpInput value={code} onChange={(v) => setCode(sanitizeOtpInput(v))} error={error ? " " : undefined} disabled={busy} autoFocus />
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-neon transition hover:gap-2"
                    onClick={() => {
                      setStep("phone");
                      setCode("");
                      setError(null);
                    }}
                  >
                    <Icon name="arrowRight" size={14} />
                    ویرایش شماره
                  </button>
                  <span className="num inline-flex items-center gap-1.5 text-[0.75rem] text-muted">
                    <Icon name="clock" size={13} />
                    {canResendNow
                      ? "ارسال مجدد آماده است"
                      : `ارسال مجدد تا ${toPersianDigits(resendIn)} ثانیه`}
                    <span className="text-line-2">·</span>
                    <span className={otpExpiresIn <= 20 ? "text-gold" : ""}>
                      اعتبار کد: {toPersianDigits(otpExpiresIn)} ثانیه
                    </span>
                  </span>
                </div>
              </div>

              {error && <ErrorState title="تایید کد" description={error} onRetry={() => setError(null)} />}

              <Button size="lg" block loading={busy} disabled={code.length !== 6} onClick={() => void submitCode()} endIcon="arrowLeft">
                تایید و ورود
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="text" disabled={!canResendNow || busy} onClick={() => void resend()} icon="send">
                  ارسال مجدد کد
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep("phone")} icon="edit">
                  شماره دیگر
                </Button>
              </div>

              {/* Honest preview affordance: the UI can be reviewed without a server. */}
              {deliveredCode && (
                <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-[0.78rem] leading-relaxed text-gold">
                  کانال پیامک توسعه (سرویس کاوه‌نگار وصل نیست): کد{" "}
                  <span className="num font-black text-white">{deliveredCode}</span>
                </p>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col gap-4 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-neon/35 bg-neon/10 text-neon">
                <Icon name="check" size={30} strokeWidth={2.5} />
              </span>
              <p className="t-body-sm text-muted">نشست دستگاه ساخته شد. در استقرار سرور، همین جریان کوکی HttpOnly می‌گیرد.</p>
              <Button variant="ghost" block onClick={() => setStep("phone")}>
                بازگشت به ابتدای جریان
              </Button>
            </div>
          )}
        </div>

        {/* Explicit environment notice — this build ships no auth server. */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-line-2 bg-surface/70 p-4">
          <Icon name="bolt" size={16} className="mt-0.5 shrink-0 text-gold" />
          <p className="text-[0.76rem] leading-relaxed text-muted">
            <strong className="text-gold">نشست دستگاه:</strong> کد واقعاً ساخته، هش و منقضی می‌شود. چون
            پیامک تجاری وصل نیست، کد از کانال توسعه نشان داده می‌شود. مدیر: ۰۹۱۲۱۱۱۱۱۱۱ · مربی: ۰۹۱۲۲۲۲۲۲۲۲.
          </p>
        </div>

        <p className="mt-4 text-center text-[0.72rem] text-muted">
          نیاز به راهنمایی دارید؟{" "}
          <a href="#/" className="font-bold text-neon hover:underline">
            پشتیبانی کایار
          </a>
        </p>
      </div>

      {/* canonical phone echo for assistive tech */}
      <span className="sr-only" aria-live="polite">
        {phone && normalizePhone(phone) ? "شماره معتبر" : ""}
      </span>
    </div>
  );
}

export default AuthScreen;
