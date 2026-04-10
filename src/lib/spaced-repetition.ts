// ============================================================
// Simplified Ebbinghaus spaced repetition
// ============================================================
// Review intervals (days) — review_count = index into this array.
// After each "got it", advance by 1. On a miss, reset to 0.
// Once past the last interval, the word is considered "mastered".

export const EBBINGHAUS_INTERVALS_DAYS = [1, 2, 4, 7, 15, 30] as const;

export type MasteryStatus = "new" | "learning" | "mastered";

export interface NextReviewResult {
  reviewCount: number;
  nextReviewAt: string; // ISO
  masteryStatus: MasteryStatus;
}

/**
 * Given the current review_count and a yes/no signal,
 * return the next review_count, nextReviewAt timestamp, and mastery_status.
 */
export function computeNextReview(
  currentReviewCount: number,
  remembered: boolean
): NextReviewResult {
  let nextCount: number;

  if (remembered) {
    nextCount = Math.min(
      EBBINGHAUS_INTERVALS_DAYS.length,
      currentReviewCount + 1
    );
  } else {
    // Miss → reset to 0
    nextCount = 0;
  }

  // Map count → mastery
  const isMastered = nextCount >= EBBINGHAUS_INTERVALS_DAYS.length;
  const masteryStatus: MasteryStatus = isMastered
    ? "mastered"
    : nextCount === 0
      ? "new"
      : "learning";

  // Pick next interval (if mastered, schedule far future — 365 days as a placeholder)
  const days = isMastered
    ? 365
    : EBBINGHAUS_INTERVALS_DAYS[Math.max(0, nextCount - 1)];

  const nextReviewAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  return { reviewCount: nextCount, nextReviewAt, masteryStatus };
}

/** Is a word due for review right now? */
export function isDue(nextReviewAt: string | null | undefined): boolean {
  if (!nextReviewAt) return true;
  return new Date(nextReviewAt).getTime() <= Date.now();
}
