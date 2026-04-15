/**
 * Date Utility
 * Date and time related utilities
 */

/**
 * Add days to current date
 */
export const addDays = (days: number, fromDate = new Date()): Date => {
  const result = new Date(fromDate);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add hours to current date
 */
export const addHours = (hours: number, fromDate = new Date()): Date => {
  const result = new Date(fromDate);
  result.setHours(result.getHours() + hours);
  return result;
};

/**
 * Add minutes to current date
 */
export const addMinutes = (minutes: number, fromDate = new Date()): Date => {
  const result = new Date(fromDate);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * Check if date is expired
 */
export const isExpired = (date: Date): boolean => {
  return new Date() > date;
};

/**
 * Format date to ISO string
 */
export const toISOString = (date: Date): string => {
  return date.toISOString();
};
