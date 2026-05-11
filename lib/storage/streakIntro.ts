const FIRST_STREAK_INTRO_PENDING_KEY = "sl_first_streak_intro_pending";
const FIRST_STREAK_INTRO_SEEN_KEY = "sl_first_streak_intro_seen";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function markFirstStreakIntroPending(): void {
  if (!hasStorage()) return;
  if (localStorage.getItem(FIRST_STREAK_INTRO_SEEN_KEY) === "1") return;
  localStorage.setItem(FIRST_STREAK_INTRO_PENDING_KEY, "1");
}

export function consumeFirstStreakIntroPending(): boolean {
  if (!hasStorage()) return false;
  const pending = localStorage.getItem(FIRST_STREAK_INTRO_PENDING_KEY) === "1";
  if (pending) localStorage.removeItem(FIRST_STREAK_INTRO_PENDING_KEY);
  return pending && localStorage.getItem(FIRST_STREAK_INTRO_SEEN_KEY) !== "1";
}

export function markFirstStreakIntroSeen(): void {
  if (!hasStorage()) return;
  localStorage.setItem(FIRST_STREAK_INTRO_SEEN_KEY, "1");
  localStorage.removeItem(FIRST_STREAK_INTRO_PENDING_KEY);
}
