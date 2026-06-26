"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { getToday } from "@/lib/utils";
import { CheckCircle2, Moon, Bed, Droplets, Timer, TrendingUp, TrendingDown, Minus, IndianRupee, Download, BarChart3 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

const RING_R = 40;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function InsightsPage() {
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"week" | "month">("week");
    const [stats, setStats] = useState({ habitConsistency: 0, prayerConsistency: 0, avgSleep: 0, avgWater: 0, totalFocus: 0, totalSpent: 0, productivityScore: 0 });
    const [weeklyHabits, setWeeklyHabits] = useState<number[]>([]);
    const [weeklySleep, setWeeklySleep] = useState<number[]>([]);
    const [weeklyFocus, setWeeklyFocus] = useState<number[]>([]);
    const reportRef = useRef<HTMLDivElement>(null);

    const daysCount = period === "week" ? 7 : 30;

    const loadInsights = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const db = getUserDatabase(user.id);
            const dates: string[] = [];
            for (let i = daysCount - 1; i >= 0; i--) dates.push(format(subDays(new Date(), i), "yyyy-MM-dd"));

            const [habits, habitLogs, prayers, sleepLogs, waterLogs, pomodoros, expenses] = await Promise.all([
                db.habits.toArray(), db.habitLogs.toArray(), db.prayers.toArray(), db.sleepLogs.toArray(),
                db.waterLogs.toArray(), db.pomodoroSessions.toArray(), db.expenses.toArray(),
            ]);

            const activeHabits = habits.filter(h => !h.isArchived);
            let habitCompletions = 0, habitOpportunities = 0;
            const weeklyHabitData: number[] = [];

            dates.forEach(date => {
                const dow = parseISO(date).getDay();
                const todaysHabits = activeHabits.filter(h => !h.targetDays || h.targetDays.length === 0 || h.targetDays.includes(dow));
                const dayLogs = habitLogs.filter(l => l.date === date && l.completed);
                habitOpportunities += todaysHabits.length;
                habitCompletions += Math.min(dayLogs.length, todaysHabits.length);
                if (dates.indexOf(date) >= dates.length - 7) {
                    weeklyHabitData.push(todaysHabits.length > 0 ? Math.round((Math.min(dayLogs.length, todaysHabits.length) / todaysHabits.length) * 100) : 0);
                }
            });
            const habitConsistency = habitOpportunities > 0 ? Math.round((habitCompletions / habitOpportunities) * 100) : 0;

            let prayerCompletions = 0;
            dates.forEach(date => {
                const dp = prayers.find(p => p.date === date);
                if (dp) prayerCompletions += [dp.fajr, dp.dhuhr, dp.asr, dp.maghrib, dp.isha].filter(Boolean).length;
            });
            const prayerConsistency = Math.round((prayerCompletions / (daysCount * 5)) * 100);

            const periodSleep = sleepLogs.filter(l => dates.includes(l.date));
            const avgSleep = periodSleep.length > 0 ? periodSleep.reduce((s, l) => s + l.duration, 0) / periodSleep.length / 60 : 0;
            const weeklySleepData: number[] = [];
            dates.slice(-7).forEach(date => { const l = sleepLogs.find(l => l.date === date); weeklySleepData.push(l ? l.duration / 60 : 0); });

            const waterByDate = new Map<string, number>();
            waterLogs.filter(l => dates.includes(l.date)).forEach(l => waterByDate.set(l.date, (waterByDate.get(l.date) || 0) + l.amount));
            const avgWater = waterByDate.size > 0 ? Array.from(waterByDate.values()).reduce((a, b) => a + b, 0) / waterByDate.size / 1000 : 0;

            const periodPomodoros = pomodoros.filter(p => dates.includes(p.date) && p.completed && p.type === "work");
            const totalFocus = periodPomodoros.reduce((s, p) => s + p.duration, 0);
            const weeklyFocusData: number[] = [];
            dates.slice(-7).forEach(date => { const dp = pomodoros.filter(p => p.date === date && p.completed && p.type === "work"); weeklyFocusData.push(dp.reduce((s, p) => s + p.duration, 0)); });

            const totalSpent = expenses.filter(e => dates.includes(e.date)).reduce((s, e) => s + e.amount, 0);
            const productivityScore = Math.min(Math.round((habitConsistency * 0.25) + (prayerConsistency * 0.25) + (Math.min(avgSleep / 8, 1) * 100 * 0.2) + (Math.min(avgWater / 2.5, 1) * 100 * 0.15) + (Math.min(totalFocus / (daysCount * 60), 1) * 100 * 0.15)), 100);

            setStats({ habitConsistency, prayerConsistency, avgSleep, avgWater, totalFocus, totalSpent, productivityScore });
            setWeeklyHabits(weeklyHabitData);
            setWeeklySleep(weeklySleepData);
            setWeeklyFocus(weeklyFocusData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id, daysCount]);

    useEffect(() => { loadInsights(); }, [loadInsights]);

    const formatINR = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

    const getTrend = (val: number, target: number) => {
        if (val >= target * 0.9) return { Icon: TrendingUp, color: "#22c55e" };
        if (val >= target * 0.5) return { Icon: Minus, color: "#f59e0b" };
        return { Icon: TrendingDown, color: "#ef4444" };
    };

    const weekLabels: string[] = [];
    for (let i = 6; i >= 0; i--) weekLabels.push(format(subDays(new Date(), i), "EEE"));

    const downloadReport = () => {
        const content = `NextLife Insights\n=================\nPeriod: ${period === "week" ? "Last 7 Days" : "Last 30 Days"}\nGenerated: ${format(new Date(), "MMMM d, yyyy")}\n\nProductivity Score: ${stats.productivityScore}/100\nHabit Consistency: ${stats.habitConsistency}%\nNamaz: ${stats.prayerConsistency}%\nAvg Sleep: ${stats.avgSleep.toFixed(1)}h\nAvg Water: ${stats.avgWater.toFixed(1)}L\nFocus Time: ${Math.floor(stats.totalFocus / 60)}h ${stats.totalFocus % 60}m\nTotal Spent: ${formatINR(stats.totalSpent)}`;
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" })); a.download = `nextlife-${period}-${getToday()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    const score = stats.productivityScore;
    const scoreColor = score >= 80 ? "#34d399" : score >= 50 ? "#f59e0b" : "#f87171";

    const STAT_CARDS = [
        { label: "Habits",  value: `${stats.habitConsistency}%`,           icon: CheckCircle2, color: "#22c55e", raw: stats.habitConsistency,     target: 80  },
        { label: "Namaz",   value: `${stats.prayerConsistency}%`,           icon: Moon,         color: "#a78bfa", raw: stats.prayerConsistency,     target: 80  },
        { label: "Sleep",   value: `${stats.avgSleep.toFixed(1)}h`,         icon: Bed,          color: "#818cf8", raw: stats.avgSleep,               target: 7   },
        { label: "Water",   value: `${stats.avgWater.toFixed(1)}L`,         icon: Droplets,     color: "#38bdf8", raw: stats.avgWater,               target: 2.5 },
        { label: "Focus",   value: `${Math.floor(stats.totalFocus / 60)}h`, icon: Timer,        color: "#fbbf24", raw: stats.totalFocus / daysCount,  target: 60  },
        { label: "Spent",   value: formatINR(stats.totalSpent),             icon: IndianRupee,  color: "#34d399", raw: -1,                           target: -1  },
    ];

    return (
        <div className="space-y-5 pb-6" ref={reportRef}>
            {/* ── HERO ── */}
            {/* Hero — plain div, NO motion.div here to avoid Framer conflicting with child SVG -rotate-90 */}
            <div className="relative rounded-3xl overflow-hidden p-5" style={{ background: "linear-gradient(135deg, #0d0020 0%, #1a0040 45%, #0d0020 100%)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/8 rounded-full blur-2xl" style={{ transform: "translate(33%,-33%)" }} />
                <div className="relative flex items-start justify-between mb-5">
                    <div>
                        <p className="text-violet-400/50 text-[10px] font-semibold tracking-widest uppercase">Insights</p>
                        <h1 className="text-2xl font-black text-white mt-0.5">Your Overview</h1>
                        <p className="text-white/40 text-sm mt-0.5">{period === "week" ? "Last 7 days" : "Last 30 days"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex p-1 bg-white/10 rounded-xl gap-1">
                            {(["week","month"] as const).map(p => (
                                <button key={p} onClick={() => setPeriod(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${period === p ? "bg-violet-600 text-white" : "text-white/50 hover:text-white/80"}`}>{p}</button>
                            ))}
                        </div>
                        <button onClick={downloadReport} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 transition-colors"><Download className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Score ring — plain SVG with CSS transition, no motion.circle */}
                <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                        <svg width="100" height="100" viewBox="0 0 100 100"
                            style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="50" cy="50" r={RING_R} stroke="rgba(255,255,255,0.07)" strokeWidth="10" fill="none" />
                            <circle cx="50" cy="50" r={RING_R} strokeWidth="10" fill="none" strokeLinecap="round"
                                strokeDasharray={RING_CIRC}
                                style={{
                                    strokeDashoffset: RING_CIRC * (1 - score / 100),
                                    stroke: scoreColor,
                                    transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease-out",
                                }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white">{score}</span>
                            <span className="text-[10px] text-white/40">/ 100</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-white font-bold text-lg">Productivity Score</p>
                        <p className="text-white/40 text-xs mt-0.5">Habits · Prayers · Sleep · Water · Focus</p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: scoreColor }} />
                            <span className="text-sm font-semibold" style={{ color: scoreColor }}>
                                {score >= 80 ? "Excellent 🎉" : score >= 60 ? "Good 👍" : score >= 40 ? "Average 😐" : "Needs work 💪"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-3 gap-2.5">
                {STAT_CARDS.map((s, i) => {
                    const trend = s.raw >= 0 ? getTrend(s.raw, s.target) : null;
                    return (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="bg-card border border-border rounded-2xl p-3.5">
                            <div className="flex items-center justify-between mb-2">
                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                                {trend && <trend.Icon className="w-3.5 h-3.5" style={{ color: trend.color }} />}
                            </div>
                            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── CHARTS ── */}
            <div className="space-y-3">
                {[
                    { label: "Habits %",    data: weeklyHabits,   color: "#22c55e",  Icon: CheckCircle2, max: 100         },
                    { label: "Sleep (hrs)", data: weeklySleep,    color: "#818cf8",  Icon: Bed,          max: 10          },
                    { label: "Focus (min)", data: weeklyFocus,    color: "#fbbf24",  Icon: Timer,        max: undefined   },
                ].map(chart => {
                    const maxVal = chart.max ?? Math.max(...chart.data, 1);
                    return (
                        <div key={chart.label} className="bg-card border border-border rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <chart.Icon className="w-4 h-4" style={{ color: chart.color }} />
                                <span className="text-sm font-semibold">{chart.label}</span>
                            </div>
                            <div className="flex items-end justify-between gap-1.5 h-20">
                                {chart.data.map((v, i) => {
                                    const h = maxVal > 0 ? Math.max((v / maxVal) * 100, v > 0 ? 4 : 0) : 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full h-16 bg-secondary rounded-lg overflow-hidden flex items-end">
                                                <motion.div className="w-full rounded-lg" style={{ background: chart.color }}
                                                    initial={{ height: 0 }} animate={{ height: `${Math.min(h, 100)}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }} />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">{weekLabels[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── SUMMARY CARD ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    <p className="font-semibold text-sm">Period Summary</p>
                </div>
                <div className="space-y-3">
                    {[
                        { label: "Total focus time",    value: `${Math.floor(stats.totalFocus / 60)}h ${stats.totalFocus % 60}m` },
                        { label: "Total spent",         value: formatINR(stats.totalSpent) },
                        { label: "Prayer rate",         value: `${stats.prayerConsistency}%` },
                        { label: "Habit completion",    value: `${stats.habitConsistency}%` },
                    ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <span className="text-sm text-muted-foreground">{row.label}</span>
                            <span className="text-sm font-bold">{row.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
