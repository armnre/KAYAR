import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authLogin, authMe, authLogout, readCookie, type AuthMeOutputType } from 'zitejs/api';

export type Scope = 'app' | 'admin';
type Member = AuthMeOutputType['member'];
type State = { token: string | null; member: Member | null; permissions: string[]; loading: boolean };
type Ctx = State & {
  login: (username: string, password: string) => Promise<Member>;
  logout: (all?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  can: (p: string) => boolean;
};

/**
 * Session handling: the session secret lives in an httpOnly cookie that the
 * browser sends automatically — nothing is kept in localStorage any more.
 * The readable part is only the CSRF token, which is never a credential.
 */
export function readToken(_scope: Scope) {
  return readCookie('kayar_csrf');
}
const clear = (_scope: Scope) => {
  try { document.cookie = 'kayar_csrf=; Max-Age=0; path=/'; } catch { /* ignore */ }
};

/** Turns any thrown error into a friendly Persian message — never shows raw technical text. */
export function errMsg(e: unknown) {
  const x = e as { userFacingMessage?: string; message?: string; status?: number };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'اینترنتت قطعه؛ اتصال رو چک کن و دوباره امتحان کن.';
  const raw = (x?.userFacingMessage || x?.message || '').replace(/^PASSWORD_CHANGE_REQUIRED:\s*/, '').trim();
  if (/failed to fetch|networkerror|load failed|network/i.test(raw)) return 'ارتباط با سرور برقرار نشد؛ چند لحظه بعد دوباره امتحان کن.';
  if (/timeout|timed out/i.test(raw)) return 'پاسخ سرور طول کشید؛ دوباره تلاش کن.';
  if (/429|too many|rate/i.test(raw)) return 'تعداد تلاش‌ها زیاد بود؛ کمی صبر کن و دوباره امتحان کن.';
  if (/401|unauthori[sz]ed|session|expired/i.test(raw) && !/[\u0600-\u06FF]/.test(raw)) return 'نشستت تموم شده؛ لطفاً دوباره وارد شو.';
  if (/403|forbidden/i.test(raw) && !/[\u0600-\u06FF]/.test(raw)) return 'اجازه‌ی انجام این کار رو نداری.';
  // Only show server text if it's already a human Persian message
  if (raw && /[\u0600-\u06FF]/.test(raw) && raw.length < 220) return raw;
  return 'یه مشکلی پیش اومد؛ دوباره تلاش کن. اگه تکرار شد با پشتیبانی تماس بگیر.';
}
export const isPwChange = (e: unknown) => /PASSWORD_CHANGE_REQUIRED/.test(String((e as { message?: string })?.message) + String((e as { userFacingMessage?: string })?.userFacingMessage));

const contexts = { app: createContext<Ctx | null>(null), admin: createContext<Ctx | null>(null) };

export function SessionProvider({ scope, children }: { scope: Scope; children: ReactNode }) {
  const [s, setS] = useState<State>(() => ({ token: readToken(scope), member: null, permissions: [], loading: true }));
  const refresh = useCallback(async () => {
    try {
      const r = await authMe({});
      setS({ token: readToken(scope), member: r.member, permissions: r.permissions, loading: false });
    } catch {
      clear(scope);
      setS({ token: null, member: null, permissions: [], loading: false });
    }
  }, [scope]);
  useEffect(() => { void refresh(); }, [refresh]);

  const login = async (username: string, password: string) => {
    const r = await authLogin({ username, password, scope, userAgent: navigator.userAgent.slice(0, 300) });
    setS({ token: readToken(scope), member: r.member, permissions: r.permissions, loading: false });
    return r.member;
  };
  const logout = async (all?: boolean) => {
    setS({ token: null, member: null, permissions: [], loading: false });
    await authLogout({ all }).catch(() => {});
    clear(scope);
  };
  const C = contexts[scope];
  return <C.Provider value={{ ...s, login, logout, refresh, can: (p) => s.permissions.includes(p) }}>{children}</C.Provider>;
}
export const useSession = (scope: Scope) => {
  const c = useContext(contexts[scope]);
  if (!c) throw new Error('SessionProvider missing');
  return c;
};
/** Admin helper: the session travels in the httpOnly cookie. */
export const useAdmin = () => {
  const s = useSession('admin');
  return { ...s, token: s.token ?? '' };
};
