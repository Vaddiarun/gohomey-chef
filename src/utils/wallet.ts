/**
 * Wallet figures. There is no wallet / payout API yet, so everything is derived
 * from GET orders/chef: earnings = delivered orders, pending = orders still in
 * the kitchen, both net of the flat per-order platform fee. If the backend starts sending
 * wallet fields on the chef profile, those win (see `walletSummary`).
 */
import { isActiveOrder, orderTitle, orderTotal } from './orders';

export type WalletEntry = {
  id: string;
  title: string;
  when: string;
  amount: number;
  status: 'Completed' | 'Pending';
};

export type WalletSummary = {
  monthEarnings: number;
  available: number;
  pending: number;
  recent: WalletEntry[];
};

export const MIN_WITHDRAWAL = 1000;

const orderDate = (o: any) => new Date(o?.delivered_at ?? o?.updated_at ?? o?.created_at ?? 0);

/** "Today · 11:40 AM" / "Yesterday · 4:20 PM" / "12 Sep · 9:05 AM". */
export const entryWhen = (d: Date) => {
  if (isNaN(d.getTime()) || d.getTime() === 0) return '';
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86400000);
  const day = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
};

const num = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : undefined);

export const walletSummary = (orders: any[], feePerOrder: number, user?: any): WalletSummary => {
  const net = (o: any) => Math.max(0, orderTotal(o) - feePerOrder);
  const now = new Date();
  const delivered = orders.filter((o) => o?.status === 'DELIVERED');
  const thisMonth = delivered.filter((o) => {
    const d = orderDate(o);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthEarnings = thisMonth.reduce((s, o) => s + net(o), 0);
  const pending = orders.filter(isActiveOrder).reduce((s, o) => s + net(o), 0);

  const recent: WalletEntry[] = [...delivered, ...orders.filter(isActiveOrder)]
    .sort((a, b) => orderDate(b).getTime() - orderDate(a).getTime())
    .slice(0, 6)
    .map((o) => ({
      id: String(o.id),
      title: orderTitle(o),
      when: entryWhen(orderDate(o)),
      amount: net(o),
      status: o.status === 'DELIVERED' ? 'Completed' : 'Pending',
    }));

  return {
    monthEarnings: num(user?.month_earnings) ?? monthEarnings,
    available: num(user?.wallet_balance) ?? monthEarnings,
    pending: num(user?.pending_balance) ?? pending,
    recent,
  };
};

/** "HDFC •••• 4821" from the profile bank fields, or undefined when not set. */
export const bankLabel = (user?: any) => {
  const acct = String(user?.bank_account_number ?? '').replace(/\s/g, '');
  if (!acct) return undefined;
  return `${user?.bank_name || 'Bank'} •••• ${acct.slice(-4)}`;
};
