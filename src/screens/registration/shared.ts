/** Progress-bar positions for the chef signup pages (Sign Up has no bar in Figma). */
export const REG_PROGRESS = {
  cuisine: 1 / 6,
  kitchen: 2 / 6,
  location: 3 / 6,
  documents: 4 / 6,
  review: 5 / 6,
};

export const REG_TOTAL_STEPS = 5;

export const stepLabel = (step: number) => `Step ${step} of ${REG_TOTAL_STEPS} · Required for verification`;
