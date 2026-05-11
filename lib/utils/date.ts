const KAZAKHSTAN_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function todayIso(date = new Date()): string {
  return new Date(date.getTime() + KAZAKHSTAN_UTC_OFFSET_MS).toISOString().split("T")[0];
}

export function yesterdayIso(date = new Date()): string {
  return todayIso(new Date(date.getTime() - DAY_MS));
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
