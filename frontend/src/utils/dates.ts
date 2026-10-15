// Local-time helpers. toISOString() is UTC and shifts the day for users east/west of UTC,
// so form values and date-only API fields are built from local components instead.

const pad = (n: number) => n.toString().padStart(2, '0');

/** Local date as YYYY-MM-DD (for <input type="date"> and DateOnly API fields). */
export const toDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Local time as HH:mm (for <input type="time">). */
export const toTimeInputValue = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Parses YYYY-MM-DD as local midnight (new Date('YYYY-MM-DD') would be UTC midnight). */
export const parseDateOnly = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
