"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import {
  computeNextReview,
  isDue,
  EBBINGHAUS_INTERVALS_DAYS,
  type MasteryStatus,
} from "@/lib/spaced-repetition";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbVocabRow {
  id: string;
  word: string;
  definition: string;
  example: string | null;
  cefr_level: string | null;
  category: string | null;
  mastery_status: MasteryStatus;
  review_count: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
}

type Dict = Awaited<ReturnType<typeof getDictionary>>;

// ---------------------------------------------------------------------------
// CEFR colors
// ---------------------------------------------------------------------------

const cefrTone: Record<string, string> = {
  B1: "bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  B2: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  C1: "bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  C2: "bg-purple-100/80 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);
  const [dict, setDict] = useState<Dict | null>(null);
  const [allWords, setAllWords] = useState<DbVocabRow[]>([]);
  const [queue, setQueue] = useState<DbVocabRow[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, missed: 0 });
  const [sessionDone, setSessionDone] = useState(false);

  // Load dictionary
  useEffect(() => {
    getDictionary(lang as Locale).then(setDict);
  }, [lang]);

  // Load vocab & build queue
  useEffect(() => {
    let active = true;
    fetch("/api/vocabulary")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: DbVocabRow[] }) => {
        if (!active) return;
        const items = data.items ?? [];
        setAllWords(items);
        // Build queue: due + not-yet-mastered, oldest next_review_at first
        const due = items
          .filter(
            (v) =>
              v.mastery_status !== "mastered" && isDue(v.next_review_at)
          )
          .sort((a, b) => {
            const aT = a.next_review_at
              ? new Date(a.next_review_at).getTime()
              : 0;
            const bT = b.next_review_at
              ? new Date(b.next_review_at).getTime()
              : 0;
            return aT - bT;
          });
        setQueue(due);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const current = queue[index];
  const total = queue.length;

  const handleResponse = useCallback(
    async (remembered: boolean) => {
      if (!current) return;

      const result = computeNextReview(current.review_count, remembered);
      setSessionStats((s) => ({
        correct: s.correct + (remembered ? 1 : 0),
        missed: s.missed + (remembered ? 0 : 1),
      }));

      // Persist (fire-and-forget)
      fetch("/api/vocabulary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          mastery_status: result.masteryStatus,
          review_count: result.reviewCount,
          next_review_at: result.nextReviewAt,
        }),
      }).catch(() => {});

      setRevealed(false);

      if (index + 1 >= queue.length) {
        setSessionDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [current, index, queue.length]
  );

  // Keyboard shortcuts: Space = reveal/flip, ← = forgot, → = remembered
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sessionDone || !current) return;
      if (e.key === " ") {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (revealed && e.key === "ArrowRight") {
        e.preventDefault();
        handleResponse(true);
      } else if (revealed && e.key === "ArrowLeft") {
        e.preventDefault();
        handleResponse(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, handleResponse, sessionDone]);

  const nextDueLabel = useMemo(() => {
    // When queue is empty, compute the soonest upcoming review
    const upcoming = allWords
      .filter(
        (v) =>
          v.mastery_status !== "mastered" &&
          v.next_review_at &&
          !isDue(v.next_review_at)
      )
      .sort((a, b) => {
        const aT = new Date(a.next_review_at!).getTime();
        const bT = new Date(b.next_review_at!).getTime();
        return aT - bT;
      })[0];
    if (!upcoming?.next_review_at) return null;
    const diff =
      new Date(upcoming.next_review_at).getTime() - Date.now();
    const hours = Math.max(1, Math.round(diff / 3600000));
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  }, [allWords]);

  if (!dict || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted text-sm">Loading…</div>
      </div>
    );
  }

  // Empty state — no words or nothing due
  if (queue.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-accent/5 flex items-center justify-center mb-6">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent/40"
          >
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">All caught up</h1>
        <p className="text-muted text-sm leading-relaxed mb-6">
          You&apos;ve reviewed every word that&apos;s due right now.
          {nextDueLabel && (
            <>
              {" "}
              Come back in <span className="text-foreground font-medium">{nextDueLabel}</span>.
            </>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/${lang}/vocabulary`}
            className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:bg-accent-dark transition-all font-medium"
          >
            Back to vocabulary
          </Link>
          <Link
            href={`/${lang}/write`}
            className="px-4 py-2 rounded-xl text-sm bg-surface border border-border hover:bg-surface-hover transition-all font-medium"
          >
            Write to add more
          </Link>
        </div>
      </div>
    );
  }

  // Session done
  if (sessionDone) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-3">Session complete</h1>
          <p className="text-muted text-sm mb-6">
            You reviewed {total} words — {sessionStats.correct} remembered,{" "}
            {sessionStats.missed} need more practice.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/${lang}/vocabulary`}
              className="px-4 py-2 rounded-xl text-sm bg-surface border border-border hover:bg-surface-hover transition-all font-medium"
            >
              Vocabulary
            </Link>
            <Link
              href={`/${lang}/dashboard`}
              className="px-4 py-2 rounded-xl text-sm bg-accent text-white hover:bg-accent-dark transition-all font-medium"
            >
              Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((index + 1) / total) * 100;
  const cefr = current?.cefr_level ?? "B2";
  const intervalDay =
    EBBINGHAUS_INTERVALS_DAYS[
      Math.min(current.review_count, EBBINGHAUS_INTERVALS_DAYS.length - 1)
    ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/${lang}/vocabulary`}
          className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
        <div className="text-sm text-muted tabular-nums">
          {index + 1} / {total}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-surface-hover overflow-hidden mb-8">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
          className="bg-surface border border-border rounded-3xl p-8 sm:p-12 shadow-sm mb-6 min-h-[360px] flex flex-col"
        >
          {/* Meta row */}
          <div className="flex items-center justify-between mb-8">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                cefrTone[cefr] ?? "bg-amber-100 text-amber-800"
              }`}
            >
              {cefr}
            </span>
            <span className="text-[11px] text-muted">
              Next review: +{intervalDay}d
            </span>
          </div>

          {/* Word */}
          <div className="text-center flex-1 flex flex-col items-center justify-center">
            <h2 className="text-4xl sm:text-5xl font-bold font-serif tracking-tight mb-3">
              {current.word}
            </h2>
            {current.category && (
              <p className="text-xs text-muted capitalize mb-8">
                {current.category}
              </p>
            )}

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full max-w-md py-4 rounded-2xl border-2 border-dashed border-border text-muted hover:border-accent/40 hover:text-accent transition-all text-sm font-medium"
              >
                Tap or press Space to reveal
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md space-y-4"
              >
                <p className="text-lg text-foreground/90 leading-relaxed">
                  {current.definition}
                </p>
                {current.example && (
                  <div className="bg-background rounded-xl px-5 py-4">
                    <p className="text-sm italic text-foreground/70 leading-relaxed">
                      &ldquo;{current.example}&rdquo;
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Actions */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-3"
        >
          <button
            onClick={() => handleResponse(false)}
            className="flex-1 py-3 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground/80 font-medium text-sm transition-all"
          >
            <span className="block">Forgot</span>
            <span className="text-[10px] text-muted font-normal">
              ← restart (+1d)
            </span>
          </button>
          <button
            onClick={() => handleResponse(true)}
            className="flex-1 py-3 rounded-xl bg-accent text-white hover:bg-accent-dark font-medium text-sm transition-all shadow-sm"
          >
            <span className="block">Remembered</span>
            <span className="text-[10px] text-white/70 font-normal">
              → next level
            </span>
          </button>
        </motion.div>
      )}

      {/* Hint */}
      <p className="text-[11px] text-muted text-center mt-6">
        Space = flip · ← Forgot · → Remembered
      </p>
    </div>
  );
}
