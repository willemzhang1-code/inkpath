"use client";

import React, { useState, useMemo, useCallback } from "react";
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

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                  */
/* -------------------------------------------------------------------------- */

const initialVocabulary: VocabItem[] = [
  {
    id: "1",
    word: "albeit",
    definition: "Although; even though",
    example: "The project was successful, **albeit** more time-consuming than expected.",
    cefrLevel: "C1",
    sourceDate: "2026-04-08",
    mastery: "learning",
    masteryProgress: 3,
    category: "academic",
  },
  {
    id: "2",
    word: "detrimental",
    definition: "Tending to cause harm; damaging",
    example: "Excessive screen time can be **detrimental** to children's development.",
    cefrLevel: "B2",
    sourceDate: "2026-04-07",
    mastery: "mastered",
    masteryProgress: 5,
    category: "academic",
  },
  {
    id: "3",
    word: "encompass",
    definition: "To surround or hold within; to include comprehensively",
    example: "The curriculum should **encompass** both theoretical and practical knowledge.",
    cefrLevel: "B2",
    sourceDate: "2026-04-07",
    mastery: "learning",
    masteryProgress: 2,
    category: "academic",
  },
  {
    id: "4",
    word: "juxtapose",
    definition: "To place close together for contrasting effect",
    example: "The author chose to **juxtapose** urban poverty with suburban affluence.",
    cefrLevel: "C2",
    sourceDate: "2026-04-06",
    mastery: "new",
    masteryProgress: 0,
    category: "literary",
  },
  {
    id: "5",
    word: "mitigate",
    definition: "To make less severe, serious, or painful",
    example: "Governments must take steps to **mitigate** the effects of climate change.",
    cefrLevel: "C1",
    sourceDate: "2026-04-06",
    mastery: "learning",
    masteryProgress: 4,
    category: "academic",
  },
  {
    id: "6",
    word: "paradigm",
    definition: "A typical example or pattern of something; a model",
    example: "The internet has brought about a **paradigm** shift in how we communicate.",
    cefrLevel: "C1",
    sourceDate: "2026-04-05",
    mastery: "mastered",
    masteryProgress: 5,
    category: "academic",
  },
  {
    id: "7",
    word: "ubiquitous",
    definition: "Present, appearing, or found everywhere",
    example: "Smartphones have become **ubiquitous** in modern society.",
    cefrLevel: "C1",
    sourceDate: "2026-04-04",
    mastery: "learning",
    masteryProgress: 3,
    category: "academic",
  },
  {
    id: "8",
    word: "eloquent",
    definition: "Fluent or persuasive in speaking or writing",
    example: "She delivered an **eloquent** speech about the importance of education.",
    cefrLevel: "B2",
    sourceDate: "2026-04-03",
    mastery: "mastered",
    masteryProgress: 5,
    category: "descriptive",
  },
  {
    id: "9",
    word: "resilience",
    definition: "The capacity to withstand or recover quickly from difficulties",
    example: "The community showed remarkable **resilience** in the aftermath of the disaster.",
    cefrLevel: "B2",
    sourceDate: "2026-04-02",
    mastery: "mastered",
    masteryProgress: 5,
    category: "personal growth",
  },
  {
    id: "10",
    word: "pragmatic",
    definition: "Dealing with things sensibly and realistically",
    example: "We need a **pragmatic** approach to solving this housing crisis.",
    cefrLevel: "C1",
    sourceDate: "2026-04-01",
    mastery: "learning",
    masteryProgress: 2,
    category: "academic",
  },
  {
    id: "11",
    word: "ephemeral",
    definition: "Lasting for a very short time; transitory",
    example: "The beauty of cherry blossoms is **ephemeral**, lasting only a few days.",
    cefrLevel: "C2",
    sourceDate: "2026-03-30",
    mastery: "new",
    masteryProgress: 1,
    category: "literary",
  },
  {
    id: "12",
    word: "meticulous",
    definition: "Showing great attention to detail; very careful and precise",
    example: "Her **meticulous** research earned her recognition from the academic community.",
    cefrLevel: "B2",
    sourceDate: "2026-03-28",
    mastery: "learning",
    masteryProgress: 4,
    category: "descriptive",
  },
];

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
/*  Review Modal                                                               */
/* -------------------------------------------------------------------------- */

function ReviewModal({
  items,
  onClose,
  onUpdateMastery,
  dict,
}: {
  items: VocabItem[];
  onClose: () => void;
  onUpdateMastery: (id: string, got: boolean) => void;
  dict: Record<string, string>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = items[currentIndex];
  const isLast = currentIndex === items.length - 1;

  const handleResponse = useCallback(
    (got: boolean) => {
      onUpdateMastery(current.id, got);
      setRevealed(false);
      if (!isLast) {
        setCurrentIndex((i) => i + 1);
      } else {
        onClose();
      }
    },
    [current, isLast, onClose, onUpdateMastery]
  );

  const cefr = cefrColors[current.cefrLevel];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 animate-slide-up">
        <div className="bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
              <span className="font-semibold">{dict.review}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted font-medium">
                {currentIndex + 1}/{items.length}
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
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
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-border">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{
                width: `${((currentIndex + 1) / items.length) * 100}%`,
              }}
            />
          </div>

          {/* Card content */}
          <div className="px-8 py-10 text-center">
            {/* CEFR badge */}
            <span
              className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border mb-5 ${cefr.bg} ${cefr.text} ${cefr.border}`}
            >
              {current.cefrLevel}
            </span>

            {/* Word */}
            <h2 className="text-4xl font-bold font-serif tracking-tight mb-2">
              {current.word}
            </h2>

            <p className="text-sm text-muted capitalize mb-8">
              {current.category}
            </p>

            {/* Reveal area */}
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-muted hover:border-accent/40 hover:text-accent transition-all duration-200 text-sm font-medium"
              >
                Tap to reveal definition
              </button>
            ) : (
              <div className="animate-fade-in space-y-4">
                <p className="text-lg text-foreground/90 leading-relaxed">
                  {current.definition}
                </p>
                <div className="bg-background rounded-xl px-5 py-4">
                  <p className="text-sm italic text-foreground/70 leading-relaxed">
                    &ldquo;{renderHighlightedExample(current.example)}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {revealed && (
            <div className="px-8 pb-8 flex gap-3 animate-fade-in">
              <button
                onClick={() => handleResponse(false)}
                className="flex-1 py-3 rounded-xl border border-border text-foreground/70 hover:bg-surface-hover font-medium text-sm transition-all"
              >
                Need more practice
              </button>
              <button
                onClick={() => handleResponse(true)}
                className="flex-1 py-3 rounded-xl bg-accent text-white hover:bg-accent-dark font-medium text-sm transition-all shadow-sm"
              >
                Got it
              </button>
            </div>
          )}
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
  const [vocabulary, setVocabulary] = useState<VocabItem[]>(initialVocabulary);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [reviewOpen, setReviewOpen] = useState(false);

  // Load dictionary
  React.useEffect(() => {
    getDictionary(lang as Locale).then((d) =>
      setDict(d as unknown as Record<string, Record<string, string>>)
    );
  }, [lang]);

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
  }, []);

  const handleDelete = useCallback((id: string) => {
    setVocabulary((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const handleReviewUpdate = useCallback((id: string, got: boolean) => {
    setVocabulary((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const newProgress = got
          ? Math.min(5, v.masteryProgress + 1)
          : Math.max(0, v.masteryProgress - 1);
        const newMastery: MasteryStatus =
          newProgress >= 5 ? "mastered" : newProgress >= 2 ? "learning" : "new";
        return { ...v, masteryProgress: newProgress, mastery: newMastery };
      })
    );
  }, []);

  const handleExport = useCallback(() => {
    const csv = [
      "Word,Definition,CEFR Level,Mastery,Example",
      ...vocabulary.map(
        (v) =>
          `"${v.word}","${v.definition}","${v.cefrLevel}","${v.mastery}","${v.example.replace(/\*\*/g, "")}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inkpath-vocabulary.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          <button
            onClick={() => reviewItems.length > 0 && setReviewOpen(true)}
            disabled={reviewItems.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-dark transition-all duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
          </button>
          <button
            onClick={handleExport}
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
      {filtered.length === 0 ? (
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

      {/* Review Modal */}
      {reviewOpen && reviewItems.length > 0 && (
        <ReviewModal
          items={reviewItems}
          onClose={() => setReviewOpen(false)}
          onUpdateMastery={handleReviewUpdate}
          dict={t}
        />
      )}
    </div>
  );
}
