/** Fuel (subscription meal plan) types and display helpers. */

export interface FuelMeal {
  name: string;
  time_slot: string;
}

export interface FuelDayMenu {
  day: number;
  meals: { breakfast?: FuelMeal; lunch?: FuelMeal; dinner?: FuelMeal };
}

export interface FuelPlan {
  id: string;
  name: string;
  price: number;
  goal?: string;
  description?: string;
  image_url?: string;
  duration_days?: number;
  duration_label?: string;
  delivery_time_slots?: string[];
  menu_json?: { days: FuelDayMenu[] };
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  is_enabled_for_chef?: boolean;
  chef_slots?: Array<{ id?: string; time_slot: string }>;
}

export interface FuelChefSlot {
  id?: string;
  plan_id?: string;
  planId?: string;
  time_slot: string;
  plan?: { id: string; name?: string };
}

export interface FuelSubscriber {
  id: string;
  plan: { id: string; name: string; price?: number };
  user: { id: string; name: string; phone: string };
  delivery_days?: string[];
  status?: string;
}

export interface Fulfillment {
  id: string;
  fulfillment_date: string;
  delivery_time_slot: string;
  delivery_status: string;
  menu: {
    day_number: number;
    period: 'breakfast' | 'lunch' | 'dinner' | null;
    item_name: string | null;
    time_slot: string;
    nutrition?: { calories: number; protein: number; carbs: number; fat: number };
  } | null;
  subscription: {
    user: { name: string; phone: string };
    plan: { name: string };
  };
}

export const getFuelSlotPlanId = (slot: FuelChefSlot) => slot.plan_id || slot.planId || slot.plan?.id;

export const isPlanEnabled = (plan: FuelPlan, slots: FuelChefSlot[]) =>
  !!plan.is_enabled_for_chef || slots.some((s) => getFuelSlotPlanId(s) === plan.id);

export const fmt12 = (slot?: string) => {
  if (!slot) return '';
  const [h, m] = slot.split(':').map(Number);
  if (isNaN(h)) return slot;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`;
};

const PERIODS = ['breakfast', 'lunch', 'dinner'] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Meal periods the plan serves, from its menu (e.g. ["Breakfast", "Lunch"]). */
export const planPeriods = (plan: FuelPlan): string[] => {
  const found = new Set<string>();
  (plan.menu_json?.days ?? []).forEach((d) => PERIODS.forEach((p) => d.meals?.[p] && found.add(p)));
  return PERIODS.filter((p) => found.has(p)).map(cap);
};

export const planDays = (plan: FuelPlan) => plan.duration_days ?? plan.menu_json?.days?.length ?? 0;

/** "7 days · 2 meals/day". */
export const planMeta = (plan: FuelPlan) => {
  const parts: string[] = [];
  const days = planDays(plan);
  if (plan.duration_label) parts.push(plan.duration_label);
  else if (days) parts.push(`${days} days`);
  const periods = planPeriods(plan);
  if (periods.length) parts.push(`${periods.length} meals/day`);
  return parts.join(' · ');
};

/** "Breakfast + Lunch". */
export const planPeriodLabel = (plan: FuelPlan) => planPeriods(plan).join(' + ');

/** "Day 1 · Breakfast & Lunch". */
export const dayTitle = (d: FuelDayMenu) => {
  const ps = PERIODS.filter((p) => d.meals?.[p]).map(cap);
  const list = ps.length > 1 ? `${ps.slice(0, -1).join(', ')} & ${ps[ps.length - 1]}` : ps[0];
  return `Day ${d.day}${list ? ` · ${list}` : ''}`;
};

export const dayMeals = (d: FuelDayMenu) =>
  PERIODS.filter((p) => d.meals?.[p]).map((p) => ({ period: cap(p), ...(d.meals[p] as FuelMeal) }));

export const initials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export const FULFILLMENT_STATUS: Record<string, { label: string; fg: string; bg: string }> = {
  SCHEDULED: { label: 'Scheduled', fg: '#6F7075', bg: '#F1F1F4' },
  COOKING: { label: 'Cooking', fg: '#FF5C05', bg: '#FFEFE5' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', fg: '#CB7A00', bg: 'rgba(250,192,68,0.2)' },
  PICKED_UP: { label: 'Picked up', fg: '#0E8E59', bg: '#E6F1EA' },
  DELIVERED: { label: 'Delivered', fg: '#0E8E59', bg: '#E6F1EA' },
  PAUSED: { label: 'Paused', fg: '#6F7075', bg: '#F1F1F4' },
  MISSED: { label: 'Missed', fg: '#D91E4B', bg: '#FDECF0' },
  CANCELLED: { label: 'Cancelled', fg: '#D91E4B', bg: '#FDECF0' },
};
