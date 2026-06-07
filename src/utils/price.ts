export const MAX_PRICE = 10000;

export const getRequiredPrice = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const parsedPrice = Number(trimmedValue);
  return Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice <= MAX_PRICE ? parsedPrice : null;
};

export const isPriceAboveLimit = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;

  const parsedPrice = Number(trimmedValue);
  return Number.isFinite(parsedPrice) && parsedPrice > MAX_PRICE;
};
