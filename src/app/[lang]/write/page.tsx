"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDictionary, type Locale } from "@/lib/dictionaries";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WritingMode = "free" | "task1" | "task2" | "letter" | "guided";
type FeedbackTab = "assessment" | "corrections" | "rewrite" | "vocabulary";
type TimerOption = 0 | 20 | 40;
type PageState = "empty" | "loading" | "feedback";

interface SubScore {
  label: string;
  key: string;
  score: number;
}

interface Correction {
  category: "grammar" | "vocabulary" | "coherence" | "style";
  original: string;
  corrected: string;
  explanation: string;
}

interface VocabItem {
  word: string;
  cefr: string;
  definition: string;
  example: string;
}

interface FeedbackData {
  bandScore: number;
  subScores: SubScore[];
  summary: string;
  corrections: Correction[];
  rewrite: string;
  rewriteAnnotations: string[];
  vocabulary: VocabItem[];
  reflectionPrompt: string;
}

// Shape returned by /api/feedback
interface ApiFeedback {
  assessment: {
    bandScore: number;
    taskAchievement: number;
    coherence: number;
    lexical: number;
    grammar: number;
    level: string;
    summary: string;
  };
  corrections: {
    original: string;
    corrected: string;
    explanation: string;
    category: "grammar" | "vocabulary" | "coherence" | "style";
  }[];
  rewrite: { text: string; improvements: string[] };
  vocabulary: {
    word: string;
    definition: string;
    example: string;
    cefrLevel: string;
    category: string;
  }[];
  reflectionPrompt: string;
}

function adaptFeedback(api: ApiFeedback): FeedbackData {
  return {
    bandScore: api.assessment.bandScore,
    subScores: [
      { label: "Task Achievement", key: "taskAchievement", score: api.assessment.taskAchievement },
      { label: "Coherence & Cohesion", key: "coherence", score: api.assessment.coherence },
      { label: "Lexical Resource", key: "lexical", score: api.assessment.lexical },
      { label: "Grammar Range & Accuracy", key: "grammar", score: api.assessment.grammar },
    ],
    summary: api.assessment.summary,
    corrections: api.corrections,
    rewrite: api.rewrite.text,
    rewriteAnnotations: api.rewrite.improvements,
    vocabulary: api.vocabulary.map((v) => ({
      word: v.word,
      cefr: v.cefrLevel,
      definition: v.definition,
      example: v.example,
    })),
    reflectionPrompt: api.reflectionPrompt,
  };
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function CircularProgress({
  score,
  maxScore = 9,
  size = 72,
  strokeWidth = 5,
}: {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / maxScore) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-foreground">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: Correction["category"] }) {
  const colors: Record<Correction["category"], string> = {
    grammar: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    vocabulary:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    coherence:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    style:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[category]}`}
    >
      {category}
    </span>
  );
}

function CefrBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    A1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    A2: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    B1: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    B2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    C1: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    C2: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${colors[level] || "bg-gray-100 text-gray-600"}`}
    >
      {level}
    </span>
  );
}

function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-surface-hover animate-pulse-soft ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Dict = Awaited<ReturnType<typeof getDictionary>>;

export default function WritePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);

  const [dict, setDict] = useState<Dict | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<WritingMode>("free");
  const [timer, setTimer] = useState<TimerOption>(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [pageState, setPageState] = useState<PageState>("empty");
  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>("assessment");
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load dictionary
  useEffect(() => {
    getDictionary(lang as Locale).then(setDict);
  }, [lang]);

  // Word count
  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerSeconds]);

  const startTimer = useCallback(
    (minutes: TimerOption) => {
      setTimer(minutes);
      if (minutes === 0) {
        setTimerRunning(false);
        setTimerSeconds(0);
      } else {
        setTimerSeconds(minutes * 60);
        setTimerRunning(true);
      }
    },
    []
  );

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Submit handler — calls real Claude API
  const handleSubmit = useCallback(async () => {
    if (wordCount < 5) return;
    setError(null);
    setPageState("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, lang }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const apiData = (await res.json()) as ApiFeedback;
      const adapted = adaptFeedback(apiData);
      setFeedback(adapted);
      setPageState("feedback");
      setFeedbackTab("assessment");

      // Persist entry to Supabase (best-effort, ignore errors)
      fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, feedback: apiData }),
      }).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setPageState("empty");
    }
  }, [wordCount, text, mode, lang]);

  const handleSaveWord = useCallback(
    async (word: string) => {
      setSavedWords((prev) => new Set(prev).add(word));
      const item = feedback?.vocabulary.find((v) => v.word === word);
      if (!item) return;
      // Persist to Supabase (best-effort)
      fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: item.word,
          definition: item.definition,
          example: item.example,
          cefr_level: item.cefr,
        }),
      }).catch(() => {});
    },
    [feedback]
  );

  const handleReset = useCallback(() => {
    setPageState("empty");
    setFeedbackTab("assessment");
    setFeedback(null);
    setError(null);
  }, []);

  if (!dict) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted">{""}</div>
      </div>
    );
  }

  const t = dict.write;
  const modes: { key: WritingMode; label: string }[] = [
    { key: "free", label: t.modes.free },
    { key: "task1", label: t.modes.task1 },
    { key: "task2", label: t.modes.task2 },
    { key: "letter", label: t.modes.letter },
    { key: "guided", label: t.modes.guided },
  ];

  const feedbackTabs: { key: FeedbackTab; label: string }[] = [
    { key: "assessment", label: t.feedback.assessment },
    { key: "corrections", label: t.feedback.corrections },
    { key: "rewrite", label: t.feedback.rewrite },
    { key: "vocabulary", label: t.feedback.vocabulary },
  ];

  const timerOptions: { value: TimerOption; label: string }[] = [
    { value: 0, label: t.timerOff },
    { value: 20, label: "20m" },
    { value: 40, label: "40m" },
  ];

  // ---- Render helpers ----

  const renderAssessment = () => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Band Score */}
      <div className="text-center py-6">
        <p className="text-sm text-muted uppercase tracking-wider mb-2">
          {t.feedback.overall} {t.feedback.bandScore}
        </p>
        <p className="band-score text-7xl font-bold tracking-tight">
          {feedback!.bandScore.toFixed(1)}
        </p>
      </div>

      {/* Sub-scores Grid */}
      <div className="grid grid-cols-2 gap-4">
        {feedback!.subScores.map((sub, i) => (
          <motion.div
            key={sub.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border"
          >
            <CircularProgress score={sub.score} />
            <span className="text-xs text-muted text-center leading-tight">
              {sub.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="p-4 rounded-xl bg-surface border border-border"
      >
        <p className="text-sm text-foreground/80 leading-relaxed">
          {feedback!.summary}
        </p>
      </motion.div>
    </motion.div>
  );

  const renderCorrections = () => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {feedback!.corrections.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="p-4 rounded-xl bg-surface border border-border space-y-3"
        >
          <CategoryBadge category={c.category} />

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-error/20 flex items-center justify-center">
                <span className="block w-1.5 h-1.5 rounded-full bg-error" />
              </span>
              <p className="text-sm line-through text-foreground/50">
                {c.original}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-success/20 flex items-center justify-center">
                <span className="block w-1.5 h-1.5 rounded-full bg-success" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {c.corrected}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed pl-6">
            {c.explanation}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );

  const renderRewrite = () => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* Rewritten essay */}
      <div className="p-5 rounded-xl bg-surface border border-border">
        <div className="prose prose-sm max-w-none">
          {feedback!.rewrite.split("\n\n").map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 * i, duration: 0.4 }}
              className="text-sm leading-relaxed text-foreground/85 mb-4 last:mb-0 writing-area !text-sm !leading-relaxed"
            >
              {para}
            </motion.p>
          ))}
        </div>
      </div>

      {/* Annotations */}
      <div className="space-y-2.5">
        <p className="text-xs text-muted uppercase tracking-wider font-medium">
          Key Improvements
        </p>
        {feedback!.rewriteAnnotations.map((note, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-light/40 border border-accent/10"
          >
            <span className="shrink-0 mt-0.5 text-accent text-sm font-bold">
              {i + 1}
            </span>
            <p className="text-xs text-foreground/75 leading-relaxed">
              {note}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderVocabulary = () => (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {feedback!.vocabulary.map((v, i) => {
        const isSaved = savedWords.has(v.word);
        return (
          <motion.div
            key={v.word}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="p-4 rounded-xl bg-surface border border-border space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  {v.word}
                </span>
                <CefrBadge level={v.cefr} />
              </div>
              <button
                onClick={() => handleSaveWord(v.word)}
                disabled={isSaved}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  isSaved
                    ? "bg-success/15 text-success cursor-default"
                    : "bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer"
                }`}
              >
                {isSaved ? t.feedback.saved : t.feedback.save}
              </button>
            </div>
            <p className="text-sm text-foreground/80">{v.definition}</p>
            <p className="text-xs text-muted italic leading-relaxed">
              &ldquo;{v.example}&rdquo;
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );

  const renderLoadingState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        <motion.p
          className="text-sm text-muted"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          {t.analyzing}
        </motion.p>
      </div>
      <div className="space-y-4">
        <SkeletonPulse className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonPulse className="h-24" />
          <SkeletonPulse className="h-24" />
          <SkeletonPulse className="h-24" />
          <SkeletonPulse className="h-24" />
        </div>
        <SkeletonPulse className="h-16 w-full" />
      </div>
    </motion.div>
  );

  const renderFeedbackPanel = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      {/* Feedback Tabs */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-xl mb-5 overflow-x-auto shrink-0">
        {feedbackTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFeedbackTab(tab.key)}
            className={`relative flex-1 min-w-0 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              feedbackTab === tab.key
                ? "text-foreground"
                : "text-muted hover:text-foreground/70"
            }`}
          >
            {feedbackTab === tab.key && (
              <motion.div
                layoutId="feedbackTab"
                className="absolute inset-0 bg-surface rounded-lg shadow-sm border border-border"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {feedbackTab === "assessment" && (
            <React.Fragment key="assessment">{renderAssessment()}</React.Fragment>
          )}
          {feedbackTab === "corrections" && (
            <React.Fragment key="corrections">
              {renderCorrections()}
            </React.Fragment>
          )}
          {feedbackTab === "rewrite" && (
            <React.Fragment key="rewrite">{renderRewrite()}</React.Fragment>
          )}
          {feedbackTab === "vocabulary" && (
            <React.Fragment key="vocabulary">{renderVocabulary()}</React.Fragment>
          )}
        </AnimatePresence>

        {/* Reflection Prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 mb-4 p-4 rounded-xl border border-accent/20 bg-accent-light/30"
        >
          <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-2">
            {t.growthPrompt}
          </p>
          <p className="text-sm text-foreground/75 leading-relaxed italic">
            {feedback!.reflectionPrompt}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );

  // ---- Main Render ----

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden">
      {/* ============ Left Panel: Editor ============ */}
      <motion.div
        layout
        className={`flex flex-col p-5 md:p-8 transition-all duration-500 ${
          pageState === "feedback"
            ? "lg:w-1/2 lg:border-r border-border"
            : "w-full max-w-4xl mx-auto"
        } ${pageState === "feedback" ? "h-1/2 lg:h-full" : "h-full"}`}
      >
        {/* Title */}
        <motion.h1
          layout="position"
          className="text-2xl md:text-3xl font-bold text-foreground mb-6"
        >
          {t.title}
        </motion.h1>

        {/* Mode Selector */}
        <div className="flex gap-1.5 p-1 bg-surface-hover rounded-xl mb-4 overflow-x-auto shrink-0">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                mode === m.key
                  ? "text-foreground"
                  : "text-muted hover:text-foreground/70"
              }`}
            >
              {mode === m.key && (
                <motion.div
                  layoutId="modeTab"
                  className="absolute inset-0 bg-surface rounded-lg shadow-sm border border-border"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Timer Row */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <span className="text-xs text-muted font-medium">{t.timer}</span>
          <div className="flex gap-1 p-0.5 bg-surface-hover rounded-lg">
            {timerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => startTimer(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  timer === opt.value
                    ? "bg-surface text-foreground shadow-sm border border-border"
                    : "text-muted hover:text-foreground/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {timerRunning && timerSeconds > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-sm font-mono font-semibold ${
                timerSeconds <= 60 ? "text-error" : "text-foreground"
              }`}
            >
              {formatTime(timerSeconds)}
            </motion.span>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Textarea */}
        <div className="flex-1 relative min-h-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            className="writing-area w-full h-full resize-none bg-transparent p-2 text-foreground placeholder:text-muted/60"
            disabled={pageState === "loading"}
          />
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-2 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              <span className="font-semibold text-foreground">{wordCount}</span>{" "}
              {t.wordCount}
            </span>
            {pageState === "feedback" && (
              <button
                onClick={handleReset}
                className="text-xs text-muted hover:text-foreground transition-colors underline underline-offset-2"
              >
                {dict.common.back}
              </button>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={wordCount < 5 || pageState === "loading"}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              wordCount >= 5 && pageState !== "loading"
                ? "bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20 cursor-pointer"
                : "bg-surface-hover text-muted cursor-not-allowed"
            }`}
          >
            {pageState === "loading" ? t.analyzing : t.submit}
          </motion.button>
        </div>
      </motion.div>

      {/* ============ Right Panel: Feedback ============ */}
      <AnimatePresence>
        {(pageState === "loading" || pageState === "feedback") && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{
              opacity: 1,
              width: "auto",
            }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:w-1/2 h-1/2 lg:h-full overflow-hidden"
          >
            <div className="h-full p-5 md:p-8 overflow-y-auto">
              <AnimatePresence mode="wait">
                {pageState === "loading" && (
                  <React.Fragment key="loading">
                    {renderLoadingState()}
                  </React.Fragment>
                )}
                {pageState === "feedback" && (
                  <React.Fragment key="feedback">
                    {renderFeedbackPanel()}
                  </React.Fragment>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
