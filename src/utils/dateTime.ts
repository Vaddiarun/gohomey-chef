export type SlotType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'OTHER' | string;

/**
 * Automatically determines the meal slot based on the given timestamp.
 * 
 * Rules:
 * - BREAKFAST: 00:00 to 05:30
 * - LUNCH: 09:00 to 11:00
 * - DINNER: 14:00 to 17:00
 * - OTHER: Any other time
 * 
 * @param date The date object to check
 * @returns SlotType
 */
export const getMealSlot = (date: Date): SlotType => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // BREAKFAST: 00:00 to 05:30 (0 to 330 minutes)
  if (totalMinutes >= 0 && totalMinutes <= 330) {
    return 'BREAKFAST';
  }

  // LUNCH: 09:00 to 11:00 (540 to 660 minutes)
  if (totalMinutes >= 540 && totalMinutes <= 660) {
    return 'LUNCH';
  }

  // DINNER: 14:00 to 17:00 (840 to 1020 minutes)
  if (totalMinutes >= 840 && totalMinutes <= 1020) {
    return 'DINNER';
  }

  return 'OTHER';
};

/**
 * Normalizes a custom slot name to uppercase and trimmed format.
 * 
 * @param slot The slot name to normalize
 * @returns Normalized slot name
 */
export const normalizeSlot = (slot: string): string => {
  return slot.trim().toUpperCase();
};
