/**
 * Chef withdrawals. Flow: the chef raises a request here → it appears in the
 * admin portal → admin checks, pays manually and changes the status → the chef
 * sees PENDING / APPROVED / PAID / REJECTED in the app.
 *
 * Until the backend ships these routes they answer 404, which every helper here
 * reports as `unavailable` so the UI can say "open soon" instead of failing.
 */

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export type Withdrawal = {
  id: string;
  reference?: string;
  amount: number;
  status: WithdrawalStatus;
  account_label?: string;
  created_at?: string;
  reviewed_at?: string | null;
  paid_at?: string | null;
  utr?: string | null;
  rejection_reason?: string | null;
  rejection_details?: string | null;
};

export type WalletInfo = {
  wallet_balance?: number;
  pending_balance?: number;
  month_earnings?: number;
  platform_fee_flat?: number;
};

type Result<T> = { ok: true; data: T } | { ok: false; unavailable?: boolean; status?: number; message?: string };

const base = () => process.env.EXPO_PUBLIC_API_URL;

const call = async <T>(path: string, token: string | null, init?: RequestInit): Promise<Result<T>> => {
  try {
    const res = await fetch(`${base()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => undefined);
    if (res.status === 404) return { ok: false, unavailable: true, status: 404 };
    if (!res.ok) {
      return { ok: false, status: res.status, message: typeof body?.message === 'string' ? body.message : undefined };
    }
    return { ok: true, data: (body?.data ?? body) as T };
  } catch {
    return { ok: false, message: 'No internet connection.' };
  }
};

/** GET chefs/wallet — real balances once the backend has them. */
export const fetchWallet = async (token: string | null) => {
  const r = await call<WalletInfo>('chefs/wallet', token);
  // Today "chefs/wallet" hits the public chefs/:id route ("Chef not found"),
  // so only trust a body that actually carries wallet fields.
  return r.ok && r.data && typeof r.data.wallet_balance === 'number' ? r.data : undefined;
};

/** GET chefs/withdrawals — newest first. */
export const fetchWithdrawals = async (token: string | null) => {
  const r = await call<Withdrawal[]>('chefs/withdrawals', token);
  return r.ok && Array.isArray(r.data) ? r.data : undefined;
};

/** POST chefs/withdrawals. The idempotency key stops a double tap creating two requests. */
export const requestWithdrawal = (token: string | null, amount: number, idempotencyKey: string) =>
  call<Withdrawal>('chefs/withdrawals', token, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ amount }),
  });

/** Params for the WithdrawStatus screen. */
export const statusParams = (w: Withdrawal) => ({
  state: w.status === 'PAID' ? 'APPROVED' : w.status,
  paid: w.status === 'PAID',
  reference: w.reference ?? w.id.split('-')[0].toUpperCase(),
  amount: w.amount,
  account: w.account_label,
  reviewedAt: w.paid_at ?? w.reviewed_at ?? undefined,
  utr: w.utr ?? undefined,
  reason: w.rejection_reason ?? undefined,
  reasonDetail: w.rejection_details ?? undefined,
});

export const withdrawalTone = (s: WithdrawalStatus) =>
  s === 'PAID' || s === 'APPROVED' ? 'ok' : s === 'REJECTED' ? 'bad' : 'wait';

export const withdrawalLabel = (s: WithdrawalStatus) =>
  ({ PENDING: 'In review', APPROVED: 'Approved', PAID: 'Paid', REJECTED: 'Rejected' })[s] ?? s;
