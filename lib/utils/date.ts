export function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export function yesterdayIso(date = new Date()): string {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - 1);
  return copy.toISOString().split("T")[0];
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
