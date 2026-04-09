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

interface MockFeedback {
  bandScore: number;
  subScores: SubScore[];
  summary: string;
  corrections: Correction[];
  rewrite: string;
  rewriteAnnotations: string[];
  vocabulary: VocabItem[];
  reflectionPrompt: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_FEEDBACK: MockFeedback = {
  bandScore: 6.5,
  subScores: [
    { label: "Task Achievement", key: "taskAchievement", score: 6.5 },
    { label: "Coherence & Cohesion", key: "coherence", score: 7.0 },
    { label: "Lexical Resource", key: "lexical", score: 6.0 },
    { label: "Grammar Range & Accuracy", key: "grammar", score: 6.5 },
  ],
  summary:
    "Your writing demonstrates a clear position with relevant ideas, though some could be developed further. Paragraphing is logical, and you use a range of cohesive devices. Vocabulary is adequate but could benefit from more sophisticated expressions. There are occasional grammatical errors that do not impede communication.",
  corrections: [
    {
      category: "grammar",
      original: "The number of students have increased significantly.",
      corrected: "The number of students has increased significantly.",
      explanation:
        "\"The number of\" takes a singular verb because the subject is \"number,\" not \"students.\" This is a common subject-verb agreement error.",
    },
    {
      category: "vocabulary",
      original: "This is a very big problem in modern society.",
      corrected: "This is a pervasive challenge in contemporary society.",
      explanation:
        "Replace vague intensifiers like \"very big\" with more precise, academic vocabulary. \"Pervasive\" and \"contemporary\" are band 7+ expressions.",
    },
    {
      category: "coherence",
      original:
        "Many people think technology is bad. Technology helps us communicate.",
      corrected:
        "While many people argue that technology has detrimental effects, it undeniably facilitates communication.",
      explanation:
        "Connect contrasting ideas with a concessive clause rather than placing them in separate, disconnected sentences.",
    },
    {
      category: "style",
      original: "I think that we should do something about this problem.",
      corrected: "It is imperative that decisive action be taken to address this issue.",
      explanation:
        "In academic writing, avoid first-person opinions with \"I think.\" Use impersonal constructions for a more authoritative tone.",
    },
  ],
  rewrite:
    "In recent decades, the proliferation of digital technology has fundamentally transformed the way people communicate, work, and access information. While some commentators contend that this rapid advancement has eroded interpersonal connections and exacerbated social isolation, a more nuanced examination reveals that technology, when leveraged thoughtfully, serves as an indispensable tool for fostering global connectivity.\n\nAdmittedly, excessive screen time has been linked to diminished face-to-face interaction, particularly among younger demographics. Research conducted by the University of Oxford suggests that individuals who spend more than four hours daily on social media platforms report lower levels of life satisfaction. This correlation underscores the importance of establishing healthy digital boundaries.\n\nNevertheless, the benefits of technological innovation are manifold. Telemedicine has revolutionized healthcare delivery in remote communities, while digital learning platforms have democratized access to education across socioeconomic strata. Furthermore, social media has empowered grassroots movements, enabling citizens to mobilize around shared causes with unprecedented speed and reach.\n\nIn conclusion, rather than condemning technology wholesale, society would benefit from cultivating digital literacy and promoting mindful engagement with digital tools. Only through such a balanced approach can we harness the transformative potential of technology while mitigating its adverse effects.",
  rewriteAnnotations: [
    "Opening uses a sophisticated noun phrase (\"proliferation of digital technology\") instead of simple vocabulary.",
    "Concessive structure (\"While some... a more nuanced examination reveals\") demonstrates advanced argumentation.",
    "Specific evidence (University of Oxford research) strengthens credibility and task achievement.",
    "Varied sentence structures: complex, compound-complex, and periodic sentences throughout.",
    "Conclusion offers a nuanced position rather than a simple agree/disagree, showing critical thinking.",
  ],
  vocabulary: [
    {
      word: "proliferation",
      cefr: "C1",
      definition: "A rapid increase in the number or amount of something.",
      example:
        "The proliferation of smartphones has changed daily life across the globe.",
    },
    {
      word: "exacerbate",
      cefr: "C1",
      definition: "To make a problem, bad situation, or negative feeling worse.",
      example: "The lack of funding will only exacerbate the housing crisis.",
    },
    {
      word: "manifold",
      cefr: "C2",
      definition: "Many and of several different types.",
      example:
        "The manifold benefits of regular exercise extend well beyond physical health.",
    },
    {
      word: "democratize",
      cefr: "C1",
      definition:
        "To make something accessible to everyone, not just the privileged few.",
      example:
        "Online courses have helped democratize higher education worldwide.",
    },
    {
      word: "mitigate",
      cefr: "C1",
      definition: "To make something less harmful, serious, or painful.",
      example:
        "Governments must take steps to mitigate the effects of climate change.",
    },
    {
      word: "socioeconomic strata",
      cefr: "C2",
      definition:
        "The different layers or levels of society based on income, education, and social status.",
      example:
        "Access to quality healthcare varies widely across socioeconomic strata.",
    },
  ],
  reflectionPrompt:
    "You wrote about technology and human connection. What role does technology play in your own relationships? Think of one moment this week where technology brought you closer to someone -- and one where it created distance.",
};

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

  // Submit handler
  const handleSubmit = useCallback(() => {
    if (wordCount < 5) return;
    setPageState("loading");
    // Simulate API call
    setTimeout(() => {
      setPageState("feedback");
      setFeedbackTab("assessment");
    }, 2400);
  }, [wordCount]);

  const handleSaveWord = useCallback((word: string) => {
    setSavedWords((prev) => new Set(prev).add(word));
  }, []);

  const handleReset = useCallback(() => {
    setPageState("empty");
    setFeedbackTab("assessment");
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
          {MOCK_FEEDBACK.bandScore.toFixed(1)}
        </p>
      </div>

      {/* Sub-scores Grid */}
      <div className="grid grid-cols-2 gap-4">
        {MOCK_FEEDBACK.subScores.map((sub, i) => (
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
          {MOCK_FEEDBACK.summary}
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
      {MOCK_FEEDBACK.corrections.map((c, i) => (
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
          {MOCK_FEEDBACK.rewrite.split("\n\n").map((para, i) => (
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
        {MOCK_FEEDBACK.rewriteAnnotations.map((note, i) => (
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
      {MOCK_FEEDBACK.vocabulary.map((v, i) => {
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
            {MOCK_FEEDBACK.reflectionPrompt}
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
