import { SocialEvent } from '../context/SocialContext';

const toNumber = (value: unknown) => {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  return typeof numberValue === 'number' && Number.isFinite(numberValue) ? numberValue : null;
};

export const getSocialBookedCount = (event: SocialEvent) => {
  const eventAny = event as any;
  const directCount =
    toNumber(eventAny.slots_booked) ??
    toNumber(eventAny.slots_filled) ??
    toNumber(eventAny.slotsFilled) ??
    toNumber(eventAny.booked_slots) ??
    toNumber(eventAny.bookedSlots) ??
    toNumber(eventAny.current_participants) ??
    toNumber(eventAny.participants_count) ??
    toNumber(eventAny.participant_count) ??
    toNumber(eventAny.total_participants) ??
    toNumber(eventAny.attendees_count) ??
    toNumber(eventAny.joined_count);

  if (directCount !== null) {
    return Math.max(0, Math.min(directCount, event.slots_total || directCount));
  }

  const remaining =
    toNumber(eventAny.slots_remaining) ??
    toNumber(eventAny.slotsRemaining) ??
    toNumber(eventAny.remaining_slots) ??
    toNumber(eventAny.remainingSlots);

  if (remaining !== null && event.slots_total) {
    return Math.max(0, event.slots_total - remaining);
  }

  if (Array.isArray(eventAny.participants)) {
    return Math.max(0, Math.min(eventAny.participants.length, event.slots_total || eventAny.participants.length));
  }

  return 0;
};
