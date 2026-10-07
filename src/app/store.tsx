import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AppError } from "../lib/errors";
import { toUserMessage } from "../lib/errors";
import type { AuthGateway, RequestOtpResult, VerifyOtpResult } from "../modules/auth/contracts";
import { maskPhoneDisplay, toNational } from "../modules/auth/phone";
import { OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_SECONDS } from "../modules/auth/otp";
import {
  CAMPAIGNS,
  EMPTY,
  checkinCampaign,
  claimReward,
  currentUser,
  issueOtp,
  joinCampaign,
  loadState,
  logout,
  markNotesRead,
  pushChat,
  rememberPlay,
  requestBooking,
  reviewBooking,
  saveProfile,
  saveState,
  toggleFavorite,
  toggleTrackFav,
  toPublic,
  verifyOtp,
  type KayarState,
  type Profile,
  type UserRow,
} from "./kernel";

type Inbox = { phone: string; code: string; atMs: number } | null;

type Api = {
  state: KayarState;
  user: UserRow | null;
  inbox: Inbox;
  gateway: AuthGateway;
  error: string | null;
  clearError: () => void;
  run: (fn: (s: KayarState, user: UserRow) => KayarState) => void;
  signOut: () => void;
  saveProfile: (patch: Partial<Profile>) => void;
  toggleFav: (coachId: string) => void;
  book: (input: { coachId: string; day: string; time: string; note: string }) => void;
  review: (bookingId: string, status: "approved" | "rejected") => void;
  askBodyyar: (text: string) => void;
  join: (campaignId: string) => void;
  checkin: (campaignId: string) => void;
  claim: (campaignId: string) => void;
  favTrack: (trackId: string) => void;
  playTrack: (trackId: string) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (sec: number) => void;
  readNotes: () => void;
};

const Ctx = createContext<Api | null>(null);

export function KayarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KayarState>(() => loadState());
  const [inbox, setInbox] = useState<Inbox>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(state);
  ref.current = state;

  const commit = useCallback((next: KayarState) => {
    ref.current = next;
    setState(next);
    window.setTimeout(() => saveState(ref.current), 250);
  }, []);

  const fail = useCallback((e: unknown) => {
    const withNext = e as AppError & { nextState?: KayarState };
    if (withNext.nextState) commit(withNext.nextState);
    setError(toUserMessage(e));
  }, [commit]);

  const gateway = useMemo<AuthGateway>(
    () => ({
      async requestOtp({ phone }) {
        const issued = await issueOtp(ref.current, phone);
        commit(issued.state);
        setInbox({ phone, code: issued.code, atMs: Date.now() });
        const result: RequestOtpResult = {
          challengeId: issued.challengeId,
          maskedPhone: maskPhoneDisplay(toNational(phone)),
          expiresAtMs: Date.now() + OTP_TTL_SECONDS * 1000,
          resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
          ttlSeconds: OTP_TTL_SECONDS,
        };
        return result;
      },
      async verifyOtp({ challengeId, code }): Promise<VerifyOtpResult> {
        try {
          const verified = await verifyOtp(ref.current, challengeId, code);
          commit(verified.state);
          setInbox(null);
          return {
            user: toPublic(verified.user),
            session: {
              id: verified.state.session!.id,
              issuedAtMs: verified.state.session!.issuedAtMs,
              expiresAtMs: verified.state.session!.expiresAtMs,
            },
          };
        } catch (e) {
          const withNext = e as AppError & { nextState?: KayarState };
          if (withNext.nextState) commit(withNext.nextState);
          throw e;
        }
      },
      async resendOtp(challengeId) {
        const prev = ref.current.challenges.find((c) => c.id === challengeId);
        if (!prev) throw new AppError("OTP_EXPIRED");
        if (Date.now() - prev.issuedAtMs < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
          throw new AppError("RATE_LIMITED", "برای ارسال مجدد کمی صبر کنید.");
        }
        return this.requestOtp({ phone: prev.phone });
      },
      async session() {
        const user = currentUser(ref.current);
        return user ? toPublic(user) : null;
      },
      async logout() {
        commit(logout(ref.current));
      },
      async revokeAllSessions() {
        commit(logout(ref.current));
        return 1;
      },
    }),
    [commit],
  );

  const run = useCallback(
    (fn: (s: KayarState, user: UserRow) => KayarState) => {
      const user = currentUser(ref.current);
      if (!user) {
        setError("برای این کار وارد شوید.");
        window.location.hash = "#/login";
        return;
      }
      try {
        commit(fn(ref.current, user));
        setError(null);
      } catch (e) {
        fail(e);
      }
    },
    [commit, fail],
  );

  const api: Api = {
    state,
    user: currentUser(state),
    inbox,
    gateway,
    error,
    clearError: () => setError(null),
    run,
    signOut: () => {
      commit(logout(state));
      window.location.hash = "#/";
    },
    saveProfile: (patch) => run((s, u) => saveProfile(s, u.id, patch)),
    toggleFav: (coachId) => run((s, u) => toggleFavorite(s, u.id, coachId)),
    book: (input) => run((s, u) => requestBooking(s, u, input)),
    review: (id, status) => run((s, u) => reviewBooking(s, u, id, status)),
    askBodyyar: (text) => run((s, u) => pushChat(s, u, text)),
    join: (id) => run((s, u) => joinCampaign(s, u.id, id)),
    checkin: (id) => run((s, u) => checkinCampaign(s, u.id, id)),
    claim: (id) => run((s, u) => claimReward(s, u.id, id)),
    favTrack: (id) => run((s, u) => toggleTrackFav(s, u.id, id)),
    playTrack: (id) => {
      const user = currentUser(ref.current);
      if (!user) {
        commit({ ...ref.current, play: { trackId: id, positionSec: 0, playing: true, queue: [] } });
        return;
      }
      try {
        commit(rememberPlay(ref.current, user.id, id, 0));
        setError(null);
      } catch (e) {
        fail(e);
      }
    },
    setPlaying: (playing) => {
      const s = ref.current;
      commit({ ...s, play: { ...s.play, playing } });
    },
    setPosition: (sec) => {
      const s = ref.current;
      commit({ ...s, play: { ...s.play, positionSec: sec } });
    },
    readNotes: () => {
      const user = currentUser(state);
      if (user) commit(markNotesRead(state, user.id));
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useKayar(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useKayar outside provider");
  return ctx;
}

export { CAMPAIGNS, EMPTY };
