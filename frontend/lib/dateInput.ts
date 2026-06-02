export const getTodayDateInputValue = (): string => {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60_000;
  return new Date(localTime).toISOString().slice(0, 10);
};

export const isFutureDateInputValue = (value: string): boolean => {
  return Boolean(value) && value > getTodayDateInputValue();
};
