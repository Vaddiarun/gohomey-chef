/**
 * View helpers for GET orders/chef payloads. The order shape varies a little
 * between endpoints, so every read here is defensive.
 */
import { C } from '../theme';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'];
export const DONE_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED'];

/** Grace after `expected_delivery_by` before an un-updated order counts as overdue (matches the backend). */
const OVERDUE_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Still in an active status but past its delivery window + 2 h without the chef
 * updating it. The backend sends `is_overdue`; the deadline check is a fallback
 * for responses that don't carry the flag yet.
 */
export const isOverdueOrder = (o: any) => {
  if (!ACTIVE_STATUSES.includes(o?.status)) return false;
  if (typeof o?.is_overdue === 'boolean') return o.is_overdue;
  const by = o?.expected_delivery_by ? new Date(o.expected_delivery_by).getTime() : NaN;
  return Number.isFinite(by) && Date.now() > by + OVERDUE_GRACE_MS;
};

/** In the kitchen and not overdue — overdue orders move to Completed. */
export const isActiveOrder = (o: any) => ACTIVE_STATUSES.includes(o?.status) && !isOverdueOrder(o);

/** "Deliver by 1:30 PM" for active orders with a deadline (null for pantry / Fuel). */
export const deliverByLabel = (o: any) => {
  const d = o?.expected_delivery_by ? new Date(o.expected_delivery_by) : undefined;
  if (!d || isNaN(d.getTime())) return undefined;
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const sameDay = d.toDateString() === new Date().toDateString();
  return `Deliver by ${sameDay ? time : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`}`;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'New',
  CONFIRMED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, ' ').toLowerCase();

/** Pill colours — orange while in the kitchen, green when done, red when cancelled. */
export const statusTone = (s: string): { bg: string; fg: string } => {
  if (s === 'DELIVERED') return { bg: 'rgba(52,168,83,0.11)', fg: C.success };
  if (s === 'CANCELLED' || s === 'REFUNDED') return { bg: C.dangerBg, fg: C.danger };
  return { bg: '#FFEFE5', fg: C.primaryRing };
};

/** Next statuses a chef can move an order to (same transitions as before the redesign). */
export const nextStatuses = (s: string): { status: OrderStatus; label: string }[] => {
  switch (s) {
    case 'PENDING':
      return [
        { status: 'CONFIRMED', label: 'Accept order' },
        { status: 'CANCELLED', label: 'Decline order' },
      ];
    case 'CONFIRMED':
      return [{ status: 'PREPARING', label: 'Start preparing' }];
    case 'PREPARING':
      return [{ status: 'READY_FOR_PICKUP', label: 'Mark as ready' }];
    default:
      return [];
  }
};

/** "13:00" → "1:00 PM". */
const slotTime = (hhmm?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return undefined;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Fuel order items carry only ids, so name them by type and delivery slot. */
const fuelName = (item: any) => {
  if (!item?.fuel_slot_id && !item?.fuel_slot && !item?.fuel_subscription_id) return undefined;
  const t = slotTime(item?.fuel_subscription_delivery_time_slot ?? item?.fuel_slot?.time_slot);
  return t ? `Fuel plan · ${t}` : 'Fuel plan';
};

const baseItemName = (item: any) =>
  item?.daily_meal?.meal_name ||
  item?.pantry_item?.name ||
  item?.social_event?.title ||
  item?.social_event?.name ||
  fuelName(item) ||
  item?.name ||
  'Item';

/** Pantry items keep the unit they were ordered in (pantry_unit_type / pantry_pieces_per_unit). */
const itemName = (item: any) =>
  String(item?.pantry_unit_type).toUpperCase() === 'CONTAINER' && Number(item?.pantry_pieces_per_unit) > 1
    ? `${baseItemName(item)} (pack of ${item.pantry_pieces_per_unit})`
    : baseItemName(item);

export const orderNumber = (o: any) =>
  o?.order_number ? `#${o.order_number}` : `#${String(o?.id ?? '').split('-')[0].toUpperCase()}`;

export const orderTitle = (o: any) => {
  const items: any[] = o?.items ?? [];
  if (items.length === 0) return 'Order';
  const first = itemName(items[0]);
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
};

export const orderItemCount = (o: any) =>
  (o?.items ?? []).reduce((n: number, i: any) => n + (Number(i?.quantity) || 1), 0);

export const orderCustomer = (o: any) => o?.user?.name || o?.customer?.name || 'Customer';

export const orderImage = (o: any): string | undefined => {
  const first = (o?.items ?? [])[0];
  return first?.daily_meal?.image_url || first?.pantry_item?.image_url || first?.image_url || undefined;
};

export const orderTotal = (o: any): number => {
  const direct = o?.total_amount ?? o?.total_price ?? o?.total ?? o?.amount;
  if (direct != null && !isNaN(Number(direct))) return Number(direct);
  return (o?.items ?? []).reduce((sum: number, i: any) => {
    const price = Number(i?.price ?? i?.unit_price ?? i?.daily_meal?.price ?? i?.pantry_item?.price ?? 0);
    return sum + price * (Number(i?.quantity) || 1);
  }, 0);
};

export const formatRupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const orderTime = (o: any) => {
  const d = new Date(o?.created_at ?? o?.createdAt ?? Date.now());
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
};

/** Pending first, then in-kitchen, then finished; newest first inside each group. */
export const sortOrders = (orders: any[]) => {
  const rank = (o: any) => (!isActiveOrder(o) ? 2 : o.status === 'PENDING' ? 0 : 1);
  return [...orders].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
};
