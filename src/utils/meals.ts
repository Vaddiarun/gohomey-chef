/**
 * Daily-menu helpers: service windows, fee breakdown and card labels.
 */

/**
 * GoHomeyy platform fee: a flat amount per ORDER (backend confirmed ₹20), not a
 * percentage of price. Display only — the API receives just `price`. If the
 * profile starts returning `platform_fee_flat`, that value wins.
 */
export const DEFAULT_PLATFORM_FEE = 20;

export const platformFee = (user?: any): number => {
  const flat = Number(user?.platform_fee_flat ?? user?.platformFeeFlat);
  return Number.isFinite(flat) && flat >= 0 ? flat : DEFAULT_PLATFORM_FEE;
};

/**
 * Single-item order at `price` (the fee applies once per order). Confirmed
 * 2026-10-02: the customer pays price + fee at checkout, and the chef's wallet
 * is credited price − fee.
 */
export const feeBreakdown = (price: number, fee: number) => {
  const charged = price > 0 ? fee : 0;
  return { fee: charged, chefEarns: Math.max(0, price - charged), customerPrice: price > 0 ? price + charged : 0 };
};

export type MealWindow = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export const MEAL_WINDOWS: { id: MealWindow; label: string; time: string; cutoffHour: number }[] = [
  { id: 'BREAKFAST', label: 'Breakfast', time: '8:00 AM', cutoffHour: 5 },
  { id: 'LUNCH', label: 'Lunch', time: '12:30 PM', cutoffHour: 11 },
  { id: 'DINNER', label: 'Dinner', time: '8:00 PM', cutoffHour: 17 },
];

/** Same rule as before the redesign: a window closes for today once its cutoff hour passes. */
export const isWindowClosed = (w: { cutoffHour: number }, date: Date) => {
  const now = new Date();
  return date.toDateString() === now.toDateString() && now.getHours() >= w.cutoffHour;
};

export const windowLabel = (w?: string) => {
  const found = MEAL_WINDOWS.find((x) => x.id === (w || '').toUpperCase());
  return found ? found.label : (w || '').charAt(0).toUpperCase() + (w || '').slice(1).toLowerCase();
};

export const windowTime = (w?: string) => MEAL_WINDOWS.find((x) => x.id === (w || '').toUpperCase())?.time;

/** "Today" / "Tomorrow" / "Fri, 4 Oct". */
export const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
