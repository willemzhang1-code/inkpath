"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/dictionaries";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type MasteryStatus = "mastered" | "learning" | "new";
type CEFRLevel = "B1" | "B2" | "C1" | "C2";

interface VocabItem {
  id: string;
  word: string;
  definition: string;
  example: string;
  cefrLevel: CEFRLevel;
  sourceDate: string;
  mastery: MasteryStatus;
  masteryProgress: number; // 0-5
  category: string;
}

interface DbVocabRow {
  id: string;
  word: string;
  definition: string;
  example: string | null;
  cefr_level: string | null;
  category: string | null;
  mastery_status: MasteryStatus;
  review_count: number;
  created_at: string;
}

function mapDbRow(row: DbVocabRow): VocabItem {
  const validLevels: CEFRLevel[] = ["B1", "B2", "C1", "C2"];
  const cefr = validLevels.includes(row.cefr_level as CEFRLevel)
    ? (row.cefr_level as CEFRLevel)
    : "B2";
  // Map review_count → 0-5 progress
  const progress =
    row.mastery_status === "mastered"
      ? 5
      : Math.min(5, Math.max(0, row.review_count));
  return {
    id: row.id,
    word: row.word,
    definition: row.definition,
    example: row.example ?? "",
    cefrLevel: cefr,
    sourceDate: row.created_at,
    mastery: row.mastery_status,
    masteryProgress: progress,
    category: row.category ?? "academic",
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const cefrColors: Record<CEFRLevel, { bg: string; text: string; border: string }> = {
  B1: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  B2: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  C1: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  C2: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
};

const masteryColors: Record<MasteryStatus, string> = {
  mastered: "text-success",
  learning: "text-warning",
  new: "text-muted",
};

function renderHighlightedExample(example: string) {
  const parts = example.split(/\*\*(.*?)\*\*/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-accent">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function MasteryDots({ progress }: { progress: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i < progress ? "bg-accent" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-accent text-white shadow-sm"
          : "bg-surface text-muted hover:text-foreground hover:bg-surface-hover border border-border"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 text-xs ${active ? "text-white/70" : "text-muted"}`}
      >
        {count}
      </span>
    </button>
  );
}

function VocabCard({
  item,
  onMarkMastered,
  onDelete,
}: {
  item: VocabItem;
  onMarkMastered: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cefr = cefrColors[item.cefrLevel];
  return (
    <div className="group bg-surface border border-border rounded-2xl p-5 hover:shadow-md hover:border-accent/20 transition-all duration-300 animate-fade-in flex flex-col">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-semibold tracking-tight font-serif">
            {item.word}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${cefr.bg} ${cefr.text} ${cefr.border}`}
          >
            {item.cefrLevel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MasteryDots progress={item.masteryProgress} />
          <span
            className={`text-xs font-medium capitalize ml-1 ${masteryColors[item.mastery]}`}
          >
            {item.mastery}
          </span>
        </div>
      </div>

      {/* Definition */}
      <p className="text-sm text-foreground/80 mb-3">{item.definition}</p>

      {/* Example */}
      <div className="bg-background rounded-lg px-4 py-3 mb-4 flex-1">
        <p className="text-sm italic text-foreground/70 leading-relaxed">
          &ldquo;{renderHighlightedExample(item.example)}&rdquo;
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-xs text-muted">{formatDate(item.sourceDate)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {item.mastery !== "mastered" && (
            <button
              onClick={() => onMarkMastered(item.id)}
              className="text-xs px-3 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
            >
              Mark mastered
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs px-3 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
      <div className="w-24 h-24 mb-6 rounded-3xl bg-accent/5 flex items-center justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent/40"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          <path d="M8 7h6" />
          <path d="M8 11h8" />
        </svg>
      </div>
      <p className="text-muted text-center max-w-sm leading-relaxed">
        {message}
      </p>
      <p className="text-sm text-muted/60 mt-2">
        Every word you write helps build your vocabulary.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

type FilterType = "all" | "mastered" | "learning" | "new";

export default function VocabularyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);
  const [dict, setDict] = useState<Record<string, Record<string, string>> | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Load dictionary
  React.useEffect(() => {
    getDictionary(lang as Locale).then((d) =>
      setDict(d as unknown as Record<string, Record<string, string>>)
    );
  }, [lang]);

  // Load vocabulary from API
  React.useEffect(() => {
    let active = true;
    fetch("/api/vocabulary")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: DbVocabRow[] }) => {
        if (!active) return;
        setVocabulary((data.items ?? []).map(mapDbRow));
      })
      .catch(() => {
        if (active) setVocabulary([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const t = dict?.vocabulary ?? {} as Record<string, string>;
  const tc = dict?.common ?? {} as Record<string, string>;

  // Filtering
  const counts = useMemo(
    () => ({
      all: vocabulary.length,
      mastered: vocabulary.filter((v) => v.mastery === "mastered").length,
      learning: vocabulary.filter((v) => v.mastery === "learning").length,
      new: vocabulary.filter((v) => v.mastery === "new").length,
    }),
    [vocabulary]
  );

  const filtered = useMemo(() => {
    let result = vocabulary;
    if (filter !== "all") {
      result = result.filter((v) => v.mastery === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.word.toLowerCase().includes(q) ||
          v.definition.toLowerCase().includes(q)
      );
    }
    return result;
  }, [vocabulary, filter, search]);

  const reviewItems = useMemo(
    () => vocabulary.filter((v) => v.mastery !== "mastered"),
    [vocabulary]
  );

  // Handlers
  const handleMarkMastered = useCallback((id: string) => {
    setVocabulary((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, mastery: "mastered" as MasteryStatus, masteryProgress: 5 } : v
      )
    );
    fetch("/api/vocabulary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, mastery_status: "mastered" }),
    }).catch(() => {});
  }, []);

  const handleDelete = useCallback((id: string) => {
    setVocabulary((prev) => prev.filter((v) => v.id !== id));
    fetch(`/api/vocabulary?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const [exportOpen, setExportOpen] = useState(false);

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = useCallback(() => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [
      "Word,Definition,CEFR Level,Mastery,Example",
      ...vocabulary.map((v) =>
        [
          escape(v.word),
          escape(v.definition),
          escape(v.cefrLevel),
          escape(v.mastery),
          escape(v.example.replace(/\*\*/g, "")),
        ].join(",")
      ),
    ].join("\n");
    downloadBlob(csv, "inkpath-vocabulary.csv", "text/csv;charset=utf-8");
    setExportOpen(false);
  }, [vocabulary]);

  // Anki-compatible TSV: Front \t Back \t Tags
  // Front = word. Back = definition + example (in HTML).
  // Tags include CEFR level and mastery so users can filter inside Anki.
  const handleExportAnki = useCallback(() => {
    const escape = (s: string) =>
      s.replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
    const rows = vocabulary.map((v) => {
      const back = `${escape(v.definition)}<br><br><i>${escape(
        v.example.replace(/\*\*/g, "")
      )}</i>`;
      const tags = `inkpath ${v.cefrLevel} ${v.mastery}`.trim();
      return [escape(v.word), back, tags].join("\t");
    });
    // First line is an Anki header so the import dialog auto-picks columns
    const header = [
      "#separator:tab",
      "#html:true",
      "#columns:Front\tBack\tTags",
      "#tags column:3",
    ].join("\n");
    const tsv = `${header}\n${rows.join("\n")}`;
    downloadBlob(tsv, "inkpath-vocabulary-anki.txt", "text/plain;charset=utf-8");
    setExportOpen(false);
  }, [vocabulary]);

  // Loading state
  if (!dict) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted">{tc.loading || "Loading..."}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 font-serif">
          {t.title}
        </h1>
        <p className="text-muted text-sm">
          {counts.all} words collected &middot; {counts.mastered} mastered
        </p>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            href={reviewItems.length > 0 ? `/${lang}/review` : "#"}
            aria-disabled={reviewItems.length === 0}
            onClick={(e) => {
              if (reviewItems.length === 0) e.preventDefault();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-dark transition-all duration-200 shadow-sm ${
              reviewItems.length === 0 ? "opacity-40 pointer-events-none" : ""
            }`}
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
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
              <path d="m15 9 6-6" />
            </svg>
            {t.review}
            {reviewItems.length > 0 && (
              <span className="text-white/70 text-xs">({reviewItems.length})</span>
            )}
          </Link>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t.export}
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg py-1 z-50 animate-fade-in">
                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors flex flex-col"
                  >
                    <span className="font-medium">CSV</span>
                    <span className="text-[11px] text-muted">
                      Spreadsheet-friendly
                    </span>
                  </button>
                  <button
                    onClick={handleExportAnki}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors flex flex-col"
                  >
                    <span className="font-medium">Anki</span>
                    <span className="text-[11px] text-muted">
                      TSV with Front/Back/Tags
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {(
          [
            { key: "all", label: t.all },
            { key: "mastered", label: t.mastered },
            { key: "learning", label: t.learning },
            { key: "new", label: t.new },
          ] as const
        ).map(({ key, label }) => (
          <FilterPill
            key={key}
            label={label || key}
            active={filter === key}
            count={counts[key]}
            onClick={() => setFilter(key)}
          />
        ))}
      </div>

      {/* Cards Grid or Empty State */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted text-sm animate-pulse-soft">
          {tc.loading || "Loading..."}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message={t.noWords || "Your vocabulary notebook is empty. Start writing to build it up!"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <VocabCard
              key={item.id}
              item={item}
              onMarkMastered={handleMarkMastered}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

    </div>
  );
}
