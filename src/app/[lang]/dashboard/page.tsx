"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDictionary, type Locale } from "@/lib/dictionaries";

// ---------------------------------------------------------------------------
// Types from API
// ---------------------------------------------------------------------------

interface DbEntry {
  id: string;
  mode: string;
  content: string;
  word_count: number;
  band_score: number | null;
  feedback: {
    assessment?: { bandScore?: number; summary?: string };
    vocabulary?: Array<{ word: string }>;
  } | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Defaults — used when there are no entries yet
// ---------------------------------------------------------------------------

const DEFAULT_BAND_SCORES = Array.from({ length: 30 }, () => 6.0);

const EMOTIONS = [
  { name: "Grateful", size: 72, color: "#52B788" },
  { name: "Reflective", size: 52, color: "#457B9D" },
  { name: "Anxious", size: 32, color: "#E76F51" },
  { name: "Hopeful", size: 50, color: "#E9C46A" },
  { name: "Peaceful", size: 66, color: "#A8DADC" },
];

const MOOD_DATA = [6, 7, 5, 8, 7, 9, 8];
const MOOD_EMOJIS = ["\u{1F614}", "\u{1F60A}", "\u{1F615}", "\u{1F60D}", "\u{1F60A}", "\u{1F929}", "\u{1F60E}"];

const TOP_EMOTIONS = [
  { name: "Grateful", pct: 34 },
  { name: "Peaceful", pct: 22 },
  { name: "Reflective", pct: 18 },
  { name: "Hopeful", pct: 15 },
  { name: "Anxious", pct: 11 },
];


const GROWTH_PATHS = [
  { name: "Self-Discovery", days: 14, progress: 0.57 },
  { name: "Gratitude Practice", days: 7, progress: 0.86 },
  { name: "Emotional Vocabulary", days: 21, progress: 0.19 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBezierPath(data: number[], width: number, height: number, padY = 24): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - padY - ((v - min) / range) * (height - padY * 2),
  }));

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + stepX * 0.4;
    const cpx2 = curr.x - stepX * 0.4;
    d += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function heatmapColor(level: number): string {
  switch (level) {
    case 0: return "var(--surface-hover)";
    case 1: return "rgba(45,106,79,0.25)";
    case 2: return "rgba(45,106,79,0.50)";
    case 3: return "rgba(45,106,79,0.80)";
    default: return "var(--accent)";
  }
}

const emotionColors: Record<string, string> = {
  Grateful: "#52B788",
  Reflective: "#457B9D",
  Anxious: "#E76F51",
  Hopeful: "#E9C46A",
  Peaceful: "#A8DADC",
};

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);
  const [dict, setDict] = useState<Record<string, Record<string, string>> | null>(null);
  const [entries, setEntries] = useState<DbEntry[]>([]);
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    getDictionary(lang as Locale).then((d) => setDict(d as unknown as Record<string, Record<string, string>>));
  }, [lang]);

  useEffect(() => {
    fetch("/api/entries")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: DbEntry[] }) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]));
    fetch("/api/vocabulary")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: unknown[] }) => setVocabCount((data.items ?? []).length))
      .catch(() => setVocabCount(0));
  }, []);

  // Derived metrics
  const totalEntries = entries.length;
  const bandScores = useMemo(() => {
    const scores = entries
      .slice()
      .reverse()
      .map((e) => e.band_score ?? e.feedback?.assessment?.bandScore ?? null)
      .filter((s): s is number => s != null);
    return scores.length > 0 ? scores : DEFAULT_BAND_SCORES;
  }, [entries]);

  const avgBand = useMemo(() => {
    const real = entries
      .map((e) => e.band_score ?? e.feedback?.assessment?.bandScore ?? null)
      .filter((s): s is number => s != null);
    if (real.length === 0) return null;
    return real.reduce((a, b) => a + b, 0) / real.length;
  }, [entries]);

  const streak = useMemo(() => {
    if (entries.length === 0) return 0;
    const days = new Set(
      entries.map((e) => new Date(e.created_at).toISOString().slice(0, 10))
    );
    let count = 0;
    const cursor = new Date();
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (days.has(key)) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [entries]);

  // Heatmap: 12 weeks × 7 days, count entries per day
  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const key = new Date(e.created_at).toISOString().slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Find Monday of current week (assume Mon=1)
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon..6=Sun
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dayOfWeek);
    const grid: number[][] = [];
    for (let w = 11; w >= 0; w--) {
      const week: number[] = [];
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - w * 7);
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        const key = day.toISOString().slice(0, 10);
        const c = counts[key] ?? 0;
        const level = c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3;
        week.push(level);
      }
      grid.push(week);
    }
    return grid;
  }, [entries]);

  const recentEntries = useMemo(
    () =>
      entries.slice(0, 5).map((e) => {
        const dateObj = new Date(e.created_at);
        const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const title =
          e.content.trim().split(/\s+/).slice(0, 8).join(" ") +
          (e.content.trim().split(/\s+/).length > 8 ? "..." : "");
        const band = e.band_score ?? e.feedback?.assessment?.bandScore ?? 0;
        return { id: e.id, date, title, band, emotion: "Reflective" };
      }),
    [entries]
  );

  if (!dict) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse-soft text-muted text-sm">Loading...</div>
      </div>
    );
  }

  const t = dict.dashboard;

  // SVG chart dimensions
  const chartW = 560;
  const chartH = 200;
  const linePath = buildBezierPath(bandScores, chartW, chartH);

  // Sparkline for mood
  const sparkW = 180;
  const sparkH = 48;
  const sparkPath = buildBezierPath(MOOD_DATA, sparkW, sparkH, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Page title */}
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-8"
      >
        {t.title}
      </motion.h1>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5"
      >
        {/* ----------------------------------------------------------------- */}
        {/* 1. Stats Bar                                                       */}
        {/* ----------------------------------------------------------------- */}
        <StatCard
          label={t.streak}
          value={String(streak)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c.4 4.93-2.37 7.5-4.5 9.5C5.37 13.5 4 15.93 4 19c0 3 2.5 5 8 5s8-2 8-5c0-3.07-1.37-5.5-3.5-7.5-.53-.5-1.07-1.03-1.5-1.62" />
              <path d="M12 10c.67 1.33.67 3.33 0 6" />
            </svg>
          }
          accent
        />
        <StatCard label={t.totalEntries} value={String(totalEntries)} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        } />
        <StatCard
          label={t.avgBand}
          value={avgBand != null ? avgBand.toFixed(1) : "—"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
        />
        <StatCard label={t.vocabLearned} value={String(vocabCount)} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        } />

        {/* ----------------------------------------------------------------- */}
        {/* 2. Band Score Progress (large, spans 2 cols on md+)                */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 md:col-span-4 lg:col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6 overflow-hidden"
        >
          <h2 className="text-sm font-semibold text-muted mb-4">{t.bandProgress}</h2>
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full"
              preserveAspectRatio="none"
              style={{ minWidth: 300 }}
            >
              {/* Grid lines */}
              {[5.0, 5.5, 6.0, 6.5, 7.0].map((v, i) => {
                const y = chartH - 24 - ((v - 5.0) / 2.0) * (chartH - 48);
                return (
                  <g key={i}>
                    <line x1="0" y1={y} x2={chartW} y2={y} stroke="var(--border-color)" strokeWidth="0.5" />
                    <text x="4" y={y - 4} fill="var(--muted)" fontSize="10" fontFamily="var(--font-sans)">
                      {v.toFixed(1)}
                    </text>
                  </g>
                );
              })}
              {/* Area fill */}
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`${linePath} L ${chartW},${chartH} L 0,${chartH} Z`}
                fill="url(#bandGrad)"
              />
              {/* Line */}
              <motion.path
                d={linePath}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              {/* Endpoint dot */}
              {(() => {
                const pts = bandScores;
                const lastX = chartW;
                const min = Math.min(...pts);
                const max = Math.max(...pts);
                const range = max - min || 1;
                const lastY = chartH - 24 - ((pts[pts.length - 1] - min) / range) * (chartH - 48);
                return (
                  <motion.circle
                    cx={lastX}
                    cy={lastY}
                    r="5"
                    fill="var(--accent)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.5, duration: 0.3 }}
                  />
                );
              })()}
            </svg>
          </div>
          <p className="text-xs text-muted mt-2">Last 30 days</p>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 3. Writing Frequency Heatmap                                       */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-muted mb-4">{t.writingFrequency}</h2>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1 shrink-0">
              {DAYS.map((d) => (
                <div key={d} className="h-[14px] text-[9px] text-muted leading-[14px]">{d}</div>
              ))}
            </div>
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((level, di) => (
                  <motion.div
                    key={di}
                    className="w-[14px] h-[14px] rounded-[3px]"
                    style={{ backgroundColor: heatmapColor(level) }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.02 * (wi * 7 + di), duration: 0.2 }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted">
            <span>Less</span>
            {[0, 1, 2, 3].map((l) => (
              <div key={l} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: heatmapColor(l) }} />
            ))}
            <span>More</span>
          </div>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 4. Emotion Landscape                                               */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-muted mb-4">{t.emotionMap}</h2>
          <div className="relative h-52 flex items-center justify-center">
            {EMOTIONS.map((em, i) => {
              const offsets = [
                { x: 0, y: -10 },
                { x: -70, y: 25 },
                { x: 80, y: 40 },
                { x: -40, y: -45 },
                { x: 60, y: -30 },
              ];
              return (
                <motion.div
                  key={em.name}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `calc(50% + ${offsets[i].x}px)`,
                    top: `calc(50% + ${offsets[i].y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 * i, duration: 0.5, type: "spring" }}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: em.size,
                      height: em.size,
                      backgroundColor: `${em.color}22`,
                      border: `2px solid ${em.color}55`,
                    }}
                  >
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: em.color }}
                    >
                      {em.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 5. Mood Trend (small)                                              */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 bg-surface border border-border rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-muted mb-3">{t.moodTrend}</h2>
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${sparkPath} L ${sparkW},${sparkH} L 0,${sparkH} Z`} fill="url(#moodGrad)" />
            <motion.path
              d={sparkPath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </svg>
          <div className="flex justify-between mt-2">
            {MOOD_EMOJIS.map((e, i) => (
              <span key={i} className="text-xs">{e}</span>
            ))}
          </div>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 6. Top Emotions This Week (small)                                  */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-1 bg-surface border border-border rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-muted mb-3">{t.topEmotions}</h2>
          <div className="space-y-2.5">
            {TOP_EMOTIONS.map((em, i) => (
              <div key={em.name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-foreground">{em.name}</span>
                  <span className="text-muted">{em.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: emotionColors[em.name] || "var(--accent)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${em.pct}%` }}
                    transition={{ delay: 0.1 * i, duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 7. Weekly Insight                                                  */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6 border-l-[3px] border-l-accent"
        >
          <h2 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            {t.weeklyInsight}
          </h2>
          <p className="text-sm leading-relaxed text-foreground/85">
            This week you wrote more about <span className="font-medium text-accent">gratitude</span> and less about work stress.
            Your vocabulary complexity increased by <span className="font-medium text-accent">12%</span>, and you used 8 new academic expressions.
            The most emotionally expressive entry was <span className="italic">&ldquo;Letter to my younger self&rdquo;</span> on April 7.
          </p>
          <p className="text-xs text-muted mt-3">AI-generated insight based on your recent entries</p>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 8. Recent Entries                                                  */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 md:col-span-4 lg:col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted">{t.recentEntries}</h2>
            <Link
              href={`/${lang}/entries`}
              className="text-xs text-accent hover:underline font-medium"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentEntries.length === 0 && (
              <li className="py-6 text-center text-sm text-muted">
                No entries yet. Start writing to see your journey here.
              </li>
            )}
            {recentEntries.map((entry, i) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.35 }}
              >
                <Link
                  href={`/${lang}/entries/${entry.id}`}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-surface-hover -mx-3 px-3 rounded-lg transition-colors"
                >
                  <div className="shrink-0 text-xs text-muted w-12">{entry.date}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${emotionColors[entry.emotion] || "var(--accent)"}22`,
                      color: emotionColors[entry.emotion] || "var(--accent)",
                    }}
                  >
                    {entry.emotion}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-accent tabular-nums">
                    {entry.band.toFixed(1)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* ----------------------------------------------------------------- */}
        {/* 9. Growth Paths                                                    */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          variants={itemVariants}
          className="col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold text-muted mb-4">{t.growthPaths}</h2>
          <div className="space-y-4">
            {GROWTH_PATHS.map((path, i) => (
              <div key={path.name}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium">{path.name}</span>
                  <span className="text-xs text-muted">{path.days} days</span>
                </div>
                <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${path.progress * 100}%` }}
                    transition={{ delay: 0.15 * i, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {Math.round(path.progress * path.days)} / {path.days} days completed
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  trend?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-2 ${
        accent ? "ring-1 ring-accent/20" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        {icon}
        {trend && (
          <span className="text-[11px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}
