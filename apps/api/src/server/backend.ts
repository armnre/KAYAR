/**
 * Endpoint runtime. Mirrors the previous platform contract:
 * `createEndpoint({ description, inputSchema, outputSchema, execute })`.
 */

export class ApiError extends Error {
  code: string;
  status: number;
  userFacingMessage: string;
  constructor(opts: { code: string; message?: string; userFacingMessage?: string; status?: number }) {
    super(opts.message ?? opts.code);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = opts.status ?? statusFor(opts.code);
    this.userFacingMessage = opts.userFacingMessage ?? opts.code;
  }
}

/** Kept under the historical name so the migrated endpoints keep working. */
export const ZiteError = ApiError;

export function statusFor(code: string): number {
  switch (code) {
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN': return 403;
    case 'NOT_FOUND': return 404;
    case 'RATE_LIMITED': return 429;
    case 'BAD_REQUEST':
    case 'CONFLICT': return 400;
    default: return 400;
  }
}

export type EndpointContext = {
  /** Raw session token (cookie). */
  token: string | null;
  ip: string;
  userAgent: string;
  /** Set by the login handler so the transport can set the cookies. */
  setSession?: (token: string, csrf: string, expiresAt: string) => void;
  clearSession?: () => void;
};

export type EndpointDefinition<I = any, O = any> = {
  description: string;
  inputSchema: { safeParse: (v: unknown) => any; parse: (v: unknown) => any };
  outputSchema: { safeParse: (v: unknown) => any; parse: (v: unknown) => any };
  execute: (args: { input: I; ctx: EndpointContext }) => Promise<O>;
};

export function createEndpoint<I = any, O = any>(def: EndpointDefinition<I, O>): EndpointDefinition<I, O> {
  return def;
}
