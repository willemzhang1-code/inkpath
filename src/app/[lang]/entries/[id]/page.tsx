"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDictionary, type Locale } from "@/lib/dictionaries";

// ---------------------------------------------------------------------------
// Types mirroring /api/entries response shape
// ---------------------------------------------------------------------------

interface VocabItem {
  word: string;
  definition: string;
  example: string;
  cefrLevel: string;
  category: string;
}

interface FeedbackShape {
  assessment?: {
    bandScore?: number;
    taskAchievement?: number;
    coherence?: number;
    lexical?: number;
    grammar?: number;
    level?: string;
    summary?: string;
  };
  rewrite?: { text?: string; improvements?: string[] };
  vocabulary?: VocabItem[];
  reflectionPrompt?: string;
}

interface DbEntry {
  id: string;
  mode: string;
  content: string;
  word_count: number;
  band_score: number | null;
  feedback: FeedbackShape | null;
  reflection_prompt: string | null;
  created_at: string;
}

type Dict = Awaited<ReturnType<typeof getDictionary>>;

// ---------------------------------------------------------------------------
// Highlight helper — wraps every vocab word/phrase in the rewrite text
// ---------------------------------------------------------------------------

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface HighlightSpan {
  text: string;
  vocab?: VocabItem;
}

/**
 * Split the rewrite text into plain + highlighted spans for every
 * vocabulary item. Case-insensitive, whole-word match where possible.
 */
function highlightText(text: string, vocab: VocabItem[]): HighlightSpan[] {
  if (!vocab || vocab.length === 0) return [{ text }];

  // Sort longest-first so multi-word phrases win over shorter prefixes
  const sorted = [...vocab].sort((a, b) => b.word.length - a.word.length);
  const pattern = sorted.map((v) => escapeRegExp(v.word)).join("|");
  if (!pattern) return [{ text }];

  const regex = new RegExp(`(${pattern})`, "gi");
  const spans: HighlightSpan[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index) });
    }
    const matched = match[0];
    const vocabItem =
      sorted.find((v) => v.word.toLowerCase() === matched.toLowerCase()) ??
      sorted[0];
    spans.push({ text: matched, vocab: vocabItem });
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }
  return spans;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const cefrTone: Record<string, string> = {
  B1: "bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  B2: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  C1: "bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  C2: "bg-purple-100/80 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
};

function HighlightedParagraph({
  text,
  vocab,
  onSelect,
}: {
  text: string;
  vocab: VocabItem[];
  onSelect: (v: VocabItem) => void;
}) {
  const spans = useMemo(() => highlightText(text, vocab), [text, vocab]);
  return (
    <>
      {spans.map((s, i) =>
        s.vocab ? (
          <button
            key={i}
            onClick={() => onSelect(s.vocab!)}
            className={`rounded px-0.5 cursor-pointer transition-colors hover:brightness-95 font-medium ${
              cefrTone[s.vocab.cefrLevel] ?? "bg-amber-100 text-amber-900"
            }`}
            title={`${s.vocab.word} — ${s.vocab.cefrLevel}`}
          >
            {s.text}
          </button>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EntryDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = React.use(params);
  const router = useRouter();

  const [dict, setDict] = useState<Dict | null>(null);
  const [entry, setEntry] = useState<DbEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getDictionary(lang as Locale).then(setDict);
  }, [lang]);

  useEffect(() => {
    let active = true;
    fetch(`/api/entries/${id}`)
      .then(async (r) => {
        if (r.status === 404) {
          if (active) setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data: { entry?: DbEntry } | null) => {
        if (!active || !data?.entry) return;
        setEntry(data.entry);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!dict) return;
    if (!confirm(dict.entries.deleteConfirm)) return;
    setDeleting(true);
    try {
      await fetch(`/api/entries/${id}`, { method: "DELETE" });
      router.push(`/${lang}/entries`);
    } catch {
      setDeleting(false);
    }
  }, [dict, id, lang, router]);

  if (!dict || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted text-sm">Loading…</div>
      </div>
    );
  }

  const t = dict.entries;

  if (notFound || !entry) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-muted mb-6">{t.empty}</p>
        <Link
          href={`/${lang}/entries`}
          className="text-accent text-sm hover:underline"
        >
          ← {t.back}
        </Link>
      </div>
    );
  }

  const feedback = entry.feedback ?? {};
  const band =
    entry.band_score ?? feedback.assessment?.bandScore ?? null;
  const rewriteText = feedback.rewrite?.text ?? "";
  const improvements = feedback.rewrite?.improvements ?? [];
  const vocab = feedback.vocabulary ?? [];
  const reflection =
    feedback.reflectionPrompt ?? entry.reflection_prompt ?? null;

  const createdLabel = (() => {
    try {
      return new Date(entry.created_at).toLocaleDateString(lang, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return new Date(entry.created_at).toLocaleDateString();
    }
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <Link
          href={`/${lang}/entries`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
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
          {t.back}
        </Link>
        <div className="flex items-center gap-3">
          {band != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent">
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                {t.band}
              </span>
              <span className="text-base font-bold tabular-nums">
                {band.toFixed(1)}
              </span>
            </div>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-medium hover:bg-error/20 transition-colors disabled:opacity-40"
          >
            {t.delete}
          </button>
        </div>
      </div>

      {/* Date + meta */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <p className="text-xs uppercase tracking-wider text-muted mb-1">
          {createdLabel} · {entry.word_count} {t.words}
        </p>
      </motion.div>

      {/* Two columns: Original vs Rewrite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-surface border border-border rounded-2xl p-6"
        >
          <h2 className="text-xs uppercase tracking-wider text-muted font-semibold mb-4">
            {t.original}
          </h2>
          <div className="prose prose-sm max-w-none">
            {entry.content.split("\n\n").map((para, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-foreground/85 mb-4 last:mb-0 whitespace-pre-wrap"
              >
                {para}
              </p>
            ))}
          </div>
        </motion.div>

        {/* Rewrite with vocab highlights */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-surface border border-border rounded-2xl p-6"
        >
          <h2 className="text-xs uppercase tracking-wider text-muted font-semibold mb-4">
            {t.rewrite}
          </h2>
          {rewriteText ? (
            <>
              <div className="prose prose-sm max-w-none">
                {rewriteText.split("\n\n").map((para, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-foreground/85 mb-4 last:mb-0"
                  >
                    <HighlightedParagraph
                      text={para}
                      vocab={vocab}
                      onSelect={setSelectedVocab}
                    />
                  </p>
                ))}
              </div>
              {vocab.length > 0 && (
                <p className="text-[11px] text-muted mt-4 italic">
                  {t.highlightsLegend}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted italic">—</p>
          )}
        </motion.div>
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 bg-surface border border-border rounded-2xl p-6"
        >
          <h2 className="text-xs uppercase tracking-wider text-muted font-semibold mb-4">
            Key Improvements
          </h2>
          <ul className="space-y-2.5">
            {improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="shrink-0 mt-0.5 text-accent font-bold text-xs">
                  {i + 1}
                </span>
                <span className="text-foreground/80 leading-relaxed">{imp}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Reflection */}
      {reflection && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6 p-5 rounded-2xl border border-accent/20 bg-accent-light/30"
        >
          <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">
            {t.reflection}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            {reflection}
          </p>
        </motion.div>
      )}

      {/* Vocab popover */}
      {selectedVocab && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedVocab(null)}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6"
          >
            <button
              onClick={() => setSelectedVocab(null)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-surface-hover text-muted"
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-2xl font-bold font-serif">{selectedVocab.word}</h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                  cefrTone[selectedVocab.cefrLevel] ?? "bg-amber-100 text-amber-800"
                }`}
              >
                {selectedVocab.cefrLevel}
              </span>
            </div>
            <p className="text-sm text-foreground/85 mb-3 leading-relaxed">
              {selectedVocab.definition}
            </p>
            <p className="text-sm italic text-muted leading-relaxed">
              &ldquo;{selectedVocab.example}&rdquo;
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
