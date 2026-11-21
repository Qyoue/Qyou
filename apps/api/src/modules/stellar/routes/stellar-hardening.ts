/**
 * Express middleware for the Stellar routes (#1151-#1154). Not yet mounted: see
 * docs/stellar-api-hardening.md for the exact wiring in `stellar.routes.ts` and `server.ts`.
 */
type Req = { user?: { id: string; lastAuthAt?: number }; ip?: string; headers: Record<string, unknown>; body?: any };
type Res = { status(code: number): Res; json(body: unknown): unknown };
type Next = (err?: unknown) => void;
type Handler = (req: Req, res: Res, next: Next) => unknown;

/** #1151: 404 for the whole router while the feature flag is off. */
export function featureGate(isEnabled: () => boolean): Handler {
  return (_req, res, next) => (isEnabled() ? next() : res.status(404).json({ error: 'Not found' }));
}

export interface LimitOptions {
  windowMs: number;
  perUser: number;
  perIp: number;
  now?: () => number;
}

/** #1153: sliding-window limits per user and per IP. Use one instance per action. */
export function rateLimit(opts: LimitOptions): Handler {
  const hits = new Map<string, number[]>();
  const now = opts.now ?? Date.now;
  const over = (key: string, limit: number): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < opts.windowMs);
    recent.push(t);
    hits.set(key, recent);
    return recent.length > limit;
  };
  return (req, res, next) => {
    if (over(`ip:${req.ip ?? 'unknown'}`, opts.perIp) || (req.user && over(`user:${req.user.id}`, opts.perUser))) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    return next();
  };
}

export interface ChallengeVerifier {
  /** Consume the challenge once; resolves true only for a valid, unexpired, unused signature. */
  verify(args: { userId: string; publicKey: string; signature: string }): Promise<boolean>;
}

/** #1152: link only with a verified signed challenge (replay/expiry live in the verifier). */
export function requireVerifiedChallenge(verifier: ChallengeVerifier): Handler {
  return async (req, res, next) => {
    const { publicKey, signature } = req.body ?? {};
    if (!req.user || !publicKey || !signature || !(await verifier.verify({ userId: req.user.id, publicKey, signature }))) {
      return res.status(401).json({ error: 'Valid signed challenge required' });
    }
    return next();
  };
}

/** #1154: unlink needs authentication within the last `maxAgeMinutes`; the audit entry is written by the handler. */
export function requireRecentAuth(maxAgeMinutes: number, now: () => number = Date.now): Handler {
  return (req, res, next) => {
    const last = req.user?.lastAuthAt;
    if (!last || now() - last > maxAgeMinutes * 60_000) {
      return res.status(401).json({ error: 'Re-authentication required' });
    }
    return next();
  };
}
