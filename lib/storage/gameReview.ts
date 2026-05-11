import type { GameSession } from "@/types";
import { safeJsonParse } from "@/lib/utils/date";

export type ReviewMode = "daily" | "free";

export interface StoredCompletedGameReview {
  version: 1;
  id: string;
  mode: ReviewMode;
  date: string;
  path: string;
  session: GameSession;
  savedAt: number;
}

interface ReviewReturnIntent {
  version: 1;
  reviewId: string;
  createdAt: number;
}

const REVIEW_KEY = "sl_last_completed_review";
const RETURN_INTENT_KEY = "sl_review_return_intent";
const RETURN_INTENT_TTL_MS = 60 * 60 * 1000;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function reviewPathForMode(mode: ReviewMode): string {
  return mode === "daily" ? "/" : "/play";
}

export function reviewReturnHref(review: Pick<StoredCompletedGameReview, "path" | "mode">): string {
  const fallbackPath = reviewPathForMode(review.mode);
  const path = review.path || fallbackPath;

  if (typeof window === "undefined") {
    return `${path}${path.includes("?") ? "&" : "?"}review=last&details=1`;
  }

  const url = new URL(path, window.location.origin);
  url.searchParams.set("review", "last");
  url.searchParams.set("details", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function saveCompletedGameReview(input: {
  mode: ReviewMode;
  date: string;
  session: GameSession;
  path?: string;
}): StoredCompletedGameReview | null {
  if (!hasStorage()) return null;

  const review: StoredCompletedGameReview = {
    version: 1,
    id: input.session.id,
    mode: input.mode,
    date: input.date,
    path: input.path ?? reviewPathForMode(input.mode),
    session: input.session,
    savedAt: Date.now()
  };

  localStorage.setItem(REVIEW_KEY, JSON.stringify(review));
  return review;
}

export function getCompletedGameReview(): StoredCompletedGameReview | null {
  if (!hasStorage()) return null;
  const review = safeJsonParse<StoredCompletedGameReview | null>(localStorage.getItem(REVIEW_KEY), null);
  if (!review || review.version !== 1 || !review.session?.id) return null;
  return review;
}

export function requestCompletedGameReviewReturn(): string | null {
  if (!hasStorage()) return null;

  const review = getCompletedGameReview();
  if (!review) return null;

  const intent: ReviewReturnIntent = {
    version: 1,
    reviewId: review.id,
    createdAt: Date.now()
  };
  localStorage.setItem(RETURN_INTENT_KEY, JSON.stringify(intent));
  return reviewReturnHref(review);
}

export function consumeCompletedGameReviewReturn(): StoredCompletedGameReview | null {
  if (!hasStorage()) return null;

  const intent = safeJsonParse<ReviewReturnIntent | null>(localStorage.getItem(RETURN_INTENT_KEY), null);
  localStorage.removeItem(RETURN_INTENT_KEY);
  if (!intent || intent.version !== 1 || Date.now() - intent.createdAt > RETURN_INTENT_TTL_MS) return null;

  const review = getCompletedGameReview();
  if (!review || review.id !== intent.reviewId) return null;
  return review;
}
