"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/stores/auth";
import { getUserDatabase } from "@/lib/db/database";
import { getToday } from "@/lib/utils";
import { BarChart3, CheckCircle2, Moon, Bed, Droplets, Timer, TrendingUp, TrendingDown, Minus, Wallet, Download } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

export default function InsightsPage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<"week" | "month">("week");
    const [stats, setStats] = useState({ habitConsistency: 0, prayerConsistency: 0, avgSleep: 0, avgWater: 0, totalFocus: 0, totalSpent: 0, productivityScore: 0 });
    const [weeklyHabits, setWeeklyHabits] = useState<number[]>([]);
    const [weeklySleep, setWeeklySleep] = useState<number[]>([]);
    const [weeklyFocus, setWeeklyFocus] = useState<number[]>([]);
    const reportRef = useRef<HTMLDivElement>(null);

    const today = getToday();
    const daysCount = period === "week" ? 7 : 30;

    const loadInsights = useCallback(async () => {
        if (!user) return;
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

            dates.forEach((date) => {
                const dayOfWeek = parseISO(date).getDay();
                const todaysHabits = activeHabits.filter(h => !h.targetDays || h.targetDays.length === 0 || h.targetDays.includes(dayOfWeek));
                const dayLogs = habitLogs.filter(l => l.date === date && l.completed);
                habitOpportunities += todaysHabits.length;
                habitCompletions += Math.min(dayLogs.length, todaysHabits.length);
                if (dates.indexOf(date) >= dates.length - 7) {
                    weeklyHabitData.push(todaysHabits.length > 0 ? Math.round((Math.min(dayLogs.length, todaysHabits.length) / todaysHabits.length) * 100) : 0);
                }
            });

            const habitConsistency = habitOpportunities > 0 ? Math.round((habitCompletions / habitOpportunities) * 100) : 0;

            let prayerCompletions = 0;
            dates.forEach((date) => {
                const dayPrayer = prayers.find(p => p.date === date);
                if (dayPrayer) prayerCompletions += [dayPrayer.fajr, dayPrayer.dhuhr, dayPrayer.asr, dayPrayer.maghrib, dayPrayer.isha].filter(Boolean).length;
            });
            const prayerConsistency = Math.round((prayerCompletions / (daysCount * 5)) * 100);

            const periodSleepLogs = sleepLogs.filter(l => dates.includes(l.date));
            const avgSleep = periodSleepLogs.length > 0 ? periodSleepLogs.reduce((sum, l) => sum + l.duration, 0) / periodSleepLogs.length / 60 : 0;
            const weeklySleepData: number[] = [];
            dates.slice(-7).forEach((date) => { const log = sleepLogs.find(l => l.date === date); weeklySleepData.push(log ? log.duration / 60 : 0); });

            const periodWaterLogs = waterLogs.filter(l => dates.includes(l.date));
            const waterByDate = new Map<string, number>();
            periodWaterLogs.forEach(l => { waterByDate.set(l.date, (waterByDate.get(l.date) || 0) + l.amount); });
            const avgWater = waterByDate.size > 0 ? Array.from(waterByDate.values()).reduce((a, b) => a + b, 0) / waterByDate.size / 1000 : 0;

            const periodPomodoros = pomodoros.filter(p => dates.includes(p.date) && p.completed && p.type === "work");
            const totalFocus = periodPomodoros.reduce((sum, p) => sum + p.duration, 0);
            const weeklyFocusData: number[] = [];
            dates.slice(-7).forEach((date) => { const dayPomodoros = pomodoros.filter(p => p.date === date && p.completed && p.type === "work"); weeklyFocusData.push(dayPomodoros.reduce((sum, p) => sum + p.duration, 0)); });

            const periodExpenses = expenses.filter(e => dates.includes(e.date));
            const totalSpent = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

            const productivityScore = Math.round((habitConsistency * 0.25) + (prayerConsistency * 0.25) + (Math.min(avgSleep / 8, 1) * 100 * 0.2) + (Math.min(avgWater / 2.5, 1) * 100 * 0.15) + (Math.min(totalFocus / (daysCount * 60), 1) * 100 * 0.15));

            setStats({ habitConsistency, prayerConsistency, avgSleep, avgWater, totalFocus, totalSpent, productivityScore: Math.min(productivityScore, 100) });
            setWeeklyHabits(weeklyHabitData);
            setWeeklySleep(weeklySleepData);
            setWeeklyFocus(weeklyFocusData);
        } catch (error) {
            console.error("Failed to load insights:", error);
        } finally {
            setLoading(false);
        }
    }, [user, daysCount]);

    useEffect(() => { loadInsights(); }, [loadInsights]);

    const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    const getTrend = (current: number, target: number) => {
        if (current >= target * 0.9) return { icon: TrendingUp, color: "text-green-500" };
        if (current >= target * 0.5) return { icon: Minus, color: "text-yellow-500" };
        return { icon: TrendingDown, color: "text-red-500" };
    };

    const weekLabels: string[] = [];
    for (let i = 6; i >= 0; i--) weekLabels.push(format(subDays(new Date(), i), "EEE"));

    const downloadReport = () => {
        const reportContent = `SamLife Insights Report\n========================\nPeriod: ${period === "week" ? "Last 7 Days" : "Last 30 Days"}\nGenerated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}\n\n📊 PRODUCTIVITY SCORE: ${stats.productivityScore}/100\n\nStats Summary:\n• Habit Consistency: ${stats.habitConsistency}%\n• Namaz Consistency: ${stats.prayerConsistency}%\n• Average Sleep: ${stats.avgSleep.toFixed(1)} hours\n• Average Water: ${stats.avgWater.toFixed(1)} liters\n• Total Focus Time: ${Math.floor(stats.totalFocus / 60)}h ${stats.totalFocus % 60}m\n• Total Spent: ${formatINR(stats.totalSpent)}\n\n---\nGenerated by SamLife ✨`;
        const blob = new Blob([reportContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `samlife-insights-${period}-${format(new Date(), "yyyy-MM-dd")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>);
    }

    return (
        <div className="space-y-4 pb-24 md:pb-6 overflow-x-hidden" ref={reportRef}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white"><BarChart3 className="w-4 h-4 md:w-5 md:h-5" /></div>
                    Insights
                </h1>
                <div className="flex items-center gap-1">
                    <div className="flex gap-0.5 p-0.5 bg-secondary rounded-lg">
                        {(["week", "month"] as const).map((p) => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-1 rounded text-xs font-semibold capitalize ${period === p ? "bg-primary text-primary-foreground" : ""}`}>{p}</button>
                        ))}
                    </div>
                    <button onClick={downloadReport} className="p-2 rounded-lg bg-primary text-primary-foreground" title="Download"><Download className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Productivity Score */}
            <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="none" className="text-violet-500/20" />
                            <circle cx="32" cy="32" r="26" stroke="url(#scoreGradient)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset={`${2 * Math.PI * 26 * (1 - stats.productivityScore / 100)}`} className="transition-all duration-1000" />
                            <defs><linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#d946ef" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold">{stats.productivityScore}</span></div>
                    </div>
                    <div>
                        <h2 className="font-bold">Productivity Score</h2>
                        <p className="text-xs text-muted-foreground">Based on habits, prayers, sleep, water, focus</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid - 2 columns for mobile */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: "Habits", value: `${stats.habitConsistency}%`, icon: CheckCircle2, color: "text-green-500", target: 80 },
                    { label: "Namaz", value: `${stats.prayerConsistency}%`, icon: Moon, color: "text-purple-500", target: 80 },
                    { label: "Sleep", value: `${stats.avgSleep.toFixed(1)}h`, icon: Bed, color: "text-indigo-500", target: 7 },
                    { label: "Water", value: `${stats.avgWater.toFixed(1)}L`, icon: Droplets, color: "text-blue-500", target: 2.5 },
                    { label: "Focus", value: `${Math.floor(stats.totalFocus / 60)}h`, icon: Timer, color: "text-yellow-500", target: daysCount * 60 },
                    { label: "Spent", value: formatINR(stats.totalSpent), icon: Wallet, color: "text-emerald-500", target: 0 },
                ].map((stat) => {
                    const TrendIcon = getTrend(typeof stat.value === "string" && stat.value.includes("%") ? parseFloat(stat.value) : stat.label === "Sleep" ? stats.avgSleep : stat.label === "Water" ? stats.avgWater : 0, stat.target);
                    return (
                        <div key={stat.label} className="p-3 rounded-xl bg-card border border-border">
                            <div className="flex items-center justify-between mb-1">
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                {stat.label !== "Spent" && stat.label !== "Focus" && <TrendIcon.icon className={`w-3 h-3 ${TrendIcon.color}`} />}
                            </div>
                            <p className="text-lg font-bold">{stat.value}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="space-y-3">
                {/* Habits Chart */}
                <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-3"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="font-semibold text-sm">Habits %</span></div>
                    <div className="flex items-end justify-between h-20 gap-1">
                        {weeklyHabits.map((value, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full h-16 bg-secondary rounded flex items-end overflow-hidden"><div className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t transition-all" style={{ height: `${value}%` }} /></div>
                                <span className="text-[9px] text-muted-foreground">{weekLabels[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sleep Chart */}
                <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-3"><Bed className="w-4 h-4 text-indigo-500" /><span className="font-semibold text-sm">Sleep</span></div>
                    <div className="flex items-end justify-between h-20 gap-1">
                        {weeklySleep.map((value, i) => {
                            const heightPercent = value > 0 ? (value / 10) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                    <div className="w-full h-16 bg-secondary rounded flex items-end overflow-hidden relative"><div className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t transition-all" style={{ height: `${Math.min(heightPercent, 100)}%` }} /></div>
                                    <span className="text-[9px] text-muted-foreground">{weekLabels[i]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Focus Chart */}
                <div className="bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-3"><Timer className="w-4 h-4 text-yellow-500" /><span className="font-semibold text-sm">Focus</span></div>
                    <div className="flex items-end justify-between h-20 gap-1">
                        {weeklyFocus.map((value, i) => {
                            const maxFocus = Math.max(...weeklyFocus, 60);
                            const heightPercent = value > 0 ? (value / maxFocus) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                    <div className="w-full h-16 bg-secondary rounded flex items-end overflow-hidden relative"><div className="w-full bg-gradient-to-t from-yellow-500 to-orange-400 rounded-t transition-all" style={{ height: `${Math.min(heightPercent, 100)}%` }} /></div>
                                    <span className="text-[9px] text-muted-foreground">{weekLabels[i]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
