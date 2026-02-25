/**
 * Returns current time as "HH:MM"
 */
export const getCurrentTime = (): string => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Combines today's date with the given "HH:MM" string → ISO 8601
 */
export const buildTimestamp = (timeStr: string): string => {
  const today = new Date().toISOString().slice(0, 10);
  const [hours, minutes] = timeStr.split(':');
  const h = String(Number(hours ?? 0)).padStart(2, '0');
  const m = String(Number(minutes ?? 0)).padStart(2, '0');
  return `${today}T${h}:${m}:00.000Z`;
};
