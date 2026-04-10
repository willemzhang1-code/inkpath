"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getDictionary, type Locale } from "@/lib/dictionaries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbEntry {
  id: string;
  mode: string;
  content: string;
  word_count: number;
  band_score: number | null;
  feedback: {
    assessment?: { bandScore?: number; summary?: string };
  } | null;
  created_at: string;
}

type Dict = Awaited<ReturnType<typeof getDictionary>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  try {
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString();
  }
}

function excerpt(text: string, words = 28) {
  const parts = text.trim().split(/\s+/);
  if (parts.length <= words) return text.trim();
  return parts.slice(0, words).join(" ") + "…";
}

function modeLabel(mode: string, t: Record<string, string>) {
  return t[mode] ?? mode;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EntriesListPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);
  const [dict, setDict] = useState<Dict | null>(null);
  const [entries, setEntries] = useState<DbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    getDictionary(lang as Locale).then(setDict);
  }, [lang]);

  useEffect(() => {
    let active = true;
    fetch("/api/entries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: DbEntry[] }) => {
        if (!active) return;
        setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setPendingDelete(id);
      // Optimistic
      setEntries((prev) => prev.filter((e) => e.id !== id));
      try {
        await fetch(`/api/entries/${id}`, { method: "DELETE" });
      } catch {
        // Ignore — RLS will prevent cross-user deletion anyway
      } finally {
        setPendingDelete(null);
      }
    },
    []
  );

  const confirmText = dict?.entries?.deleteConfirm ?? "Delete this entry?";

  const grouped = useMemo(() => {
    const map = new Map<string, DbEntry[]>();
    for (const e of entries) {
      const key = new Date(e.created_at).toISOString().slice(0, 7); // YYYY-MM
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  if (!dict) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted text-sm">Loading…</div>
      </div>
    );
  }

  const t = dict.entries;
  const tm = dict.write.modes as unknown as Record<string, string>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 font-serif">
          {t.title}
        </h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          {t.subtitle}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-muted animate-pulse-soft">
          Loading…
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className="w-24 h-24 rounded-3xl bg-accent/5 flex items-center justify-center mb-6">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="text-muted text-center max-w-sm mb-6 leading-relaxed">
            {t.empty}
          </p>
          <Link
            href={`/${lang}/write`}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-all shadow-sm"
          >
            {t.writeFirst}
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-10">
          <AnimatePresence initial={false}>
            {grouped.map(([ym, group]) => {
              const label = new Date(ym + "-01").toLocaleDateString(lang, {
                year: "numeric",
                month: "long",
              });
              return (
                <motion.section
                  key={ym}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <h2 className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {group.map((e) => {
                      const band =
                        e.band_score ??
                        e.feedback?.assessment?.bandScore ??
                        null;
                      return (
                        <motion.div
                          key={e.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25 }}
                          className="group bg-surface border border-border rounded-2xl p-5 hover:shadow-md hover:border-accent/20 transition-all"
                        >
                          <div className="flex items-start gap-4">
                            <Link
                              href={`/${lang}/entries/${e.id}`}
                              className="flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs text-muted tabular-nums">
                                  {formatDate(e.created_at, lang)}
                                </span>
                                <span className="text-muted/40">·</span>
                                <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
                                  {modeLabel(e.mode, tm)}
                                </span>
                                <span className="text-muted/40">·</span>
                                <span className="text-xs text-muted">
                                  {e.word_count} {t.words}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/85 leading-relaxed line-clamp-3">
                                {excerpt(e.content, 40)}
                              </p>
                            </Link>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {band != null && (
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] uppercase tracking-wider text-muted leading-none mb-1">
                                    {t.band}
                                  </span>
                                  <span className="text-lg font-bold text-accent tabular-nums leading-none">
                                    {band.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm(confirmText)) {
                                    handleDelete(e.id);
                                  }
                                }}
                                disabled={pendingDelete === e.id}
                                className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-1 rounded-md bg-error/10 text-error hover:bg-error/20 transition-all disabled:opacity-40"
                                aria-label={t.delete}
                                title={t.delete}
                              >
                                {t.delete}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
