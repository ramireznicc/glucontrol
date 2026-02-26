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
  const d = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const [hours, minutes] = timeStr.split(':');
  const h = String(Number(hours ?? 0)).padStart(2, '0');
  const m = String(Number(minutes ?? 0)).padStart(2, '0');
  return `${today}T${h}:${m}:00.000Z`;
};
