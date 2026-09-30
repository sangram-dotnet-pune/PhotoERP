export const formatRupees = (value: number) =>
  `₹${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatExpenseDate = (value: string) => value.replace('T', ' ');

export const toInputValue = (value: string) => {
  if (!value) return '';
  const normalized = value.replace(' ', 'T');
  return normalized.length > 16 ? normalized.slice(0, 16) : normalized;
};

export const toDateTimeLocal = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};