"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { getToday } from "@/lib/utils";
import {
    CheckCircle2, Moon, Bed, Droplets, Timer, Wallet, TrendingUp,
    BookOpen, Dumbbell, ListTodo, Utensils, Lightbulb, ChevronRight,
    Zap, BarChart3, Settings, Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface TodayStats {
    habitsCompleted: number;
    habitsTotal: number;
    prayersCompleted: number;
    sleepHours: number;
    waterMl: number;
    focusMinutes: number;
    expenses: number;
    tasksCompleted: number;
}

const GREETINGS = {
    morning:   ["Rise and shine! ✨", "New day, new wins! 🚀", "Make today count! 💪"],
    afternoon: ["Keep the momentum! 🔥", "You're crushing it! ⭐", "Stay focused! 🎯"],
    evening:   ["Finish strong! 💪", "Great progress! ✨", "Almost there! 🌅"],
    night:     ["Time to rest! 🌙", "Well deserved! 😴", "Recharge! 🌟"],
};

const ALL_FEATURES = [
    { href: "/dashboard/habits",   icon: CheckCircle2, label: "Habits",  grad: "from-emerald-500 to-green-600",   glow: "shadow-emerald-500/25" },
    { href: "/dashboard/prayer",   icon: Moon,         label: "Namaz",   grad: "from-violet-500 to-indigo-600",   glow: "shadow-violet-500/25" },
    { href: "/dashboard/water",    icon: Droplets,     label: "Water",   grad: "from-cyan-500 to-blue-500",       glow: "shadow-cyan-500/25" },
    { href: "/dashboard/sleep",    icon: Bed,          label: "Sleep",   grad: "from-indigo-500 to-blue-600",     glow: "shadow-indigo-500/25" },
    { href: "/dashboard/meals",    icon: Utensils,     label: "Meals",   grad: "from-amber-500 to-orange-500",    glow: "shadow-amber-500/25" },
    { href: "/dashboard/fitness",  icon: Dumbbell,     label: "Fitness", grad: "from-teal-500 to-cyan-500",       glow: "shadow-teal-500/25" },
    { href: "/dashboard/tasks",    icon: ListTodo,     label: "Tasks",   grad: "from-rose-500 to-pink-500",       glow: "shadow-rose-500/25" },
    { href: "/dashboard/pomodoro", icon: Timer,        label: "Focus",   grad: "from-yellow-500 to-amber-500",    glow: "shadow-yellow-500/25" },
    { href: "/dashboard/journal",  icon: BookOpen,     label: "Journal", grad: "from-pink-500 to-rose-500",       glow: "shadow-pink-500/25" },
    { href: "/dashboard/vault",    icon: Lightbulb,    label: "Vault",   grad: "from-sky-500 to-blue-500",        glow: "shadow-sky-500/25" },
    { href: "/dashboard/finance",  icon: Wallet,       label: "Finance", grad: "from-green-500 to-emerald-600",   glow: "shadow-green-500/25" },
    { href: "/dashboard/insights", icon: TrendingUp,   label: "Insights",grad: "from-purple-500 to-violet-600",  glow: "shadow-purple-500/25" },
];

function StatRing({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
    const r = 20;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="26" cy="26" r={r} stroke="currentColor" strokeWidth="4" fill="none" className="text-secondary/60" />
            <circle cx="26" cy="26" r={r} stroke={color} strokeWidth="4" fill="none"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        </svg>
    );
}

export default function DashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<TodayStats>({
        habitsCompleted: 0, habitsTotal: 0, prayersCompleted: 0,
        sleepHours: 0, waterMl: 0, focusMinutes: 0, expenses: 0, tasksCompleted: 0,
    });
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState("");
    const [mounted, setMounted] = useState(false);

    const today = getToday();
    const hour = new Date().getHours();
    const timeOfDay: keyof typeof GREETINGS =
        hour >= 5 && hour < 12 ? "morning" :
        hour >= 12 && hour < 17 ? "afternoon" :
        hour >= 17 && hour < 21 ? "evening" : "night";

    const greetText =
        timeOfDay === "morning" ? "Good Morning" :
        timeOfDay === "afternoon" ? "Good Afternoon" :
        timeOfDay === "evening" ? "Good Evening" : "Good Night";

    useEffect(() => {
        setMounted(true);
        const g = GREETINGS[timeOfDay];
        setGreeting(g[Math.floor(Math.random() * g.length)]);
    }, [timeOfDay]);

    const loadStats = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const [habits, habitLogs, prayer, sleepLog, waterLogs, pomodoros, expenses, tasks] = await Promise.all([
                db.habits.toArray(),
                db.habitLogs.where("date").equals(today).toArray(),
                db.prayers.where("date").equals(today).first(),
                db.sleepLogs.where("date").equals(today).first(),
                db.waterLogs.where("date").equals(today).toArray(),
                db.pomodoroSessions.where("date").equals(today).toArray(),
                db.expenses.where("date").equals(today).toArray(),
                db.tasks.toArray(),
            ]);

            const activeHabits = habits.filter(h => !h.isArchived);
            const dow = new Date().getDay();
            const todaysHabits = activeHabits.filter(h => !h.targetDays || h.targetDays.length === 0 || h.targetDays.includes(dow));

            setStats({
                habitsCompleted: habitLogs.filter(l => l.completed).length,
                habitsTotal: todaysHabits.length,
                prayersCompleted: prayer ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length : 0,
                sleepHours: sleepLog ? sleepLog.duration / 60 : 0,
                waterMl: waterLogs.reduce((sum, l) => sum + l.amount, 0),
                focusMinutes: pomodoros.filter(p => p.completed && p.type === "work").reduce((sum, p) => sum + p.duration, 0),
                expenses: expenses.reduce((sum, e) => sum + e.amount, 0),
                tasksCompleted: tasks.filter(t => t.status === "done").length,
            });
        } catch (error) {
            console.error("Failed to load stats:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, today]);

    useEffect(() => { loadStats(); }, [loadStats]);

    const habitPct   = stats.habitsTotal > 0 ? Math.round((stats.habitsCompleted / stats.habitsTotal) * 100) : 0;
    const prayerPct  = Math.round((stats.prayersCompleted / 5) * 100);
    const waterPct   = Math.min(Math.round((stats.waterMl / 2500) * 100), 100);
    const firstName  = user?.name?.split(" ")[0] || "there";
    const fmtMoney   = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow animate-pulse">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl animate-glow-pulse" />
                </div>
                <p className="text-muted-foreground text-sm">Setting up your day...</p>
            </div>
        </div>
    );

    return (
        <div className={`space-y-5 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>

            {/* ── Welcome Hero ── */}
            <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-600/15 to-indigo-600/20 rounded-3xl" />
                <div className="absolute inset-0 glass border border-violet-500/15 rounded-3xl" />
                {/* Glows */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl -translate-x-12 translate-y-12" />
                {/* Floating orbs */}
                <div className="absolute top-4 right-20 w-2 h-2 bg-violet-300/50 rounded-full animate-float" />
                <div className="absolute top-8 right-32 w-1.5 h-1.5 bg-cyan-300/40 rounded-full animate-float" style={{ animationDelay: "1s" }} />
                <div className="absolute bottom-6 right-12 w-1 h-1 bg-purple-300/50 rounded-full animate-float" style={{ animationDelay: "2s" }} />

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-violet-300/70 text-xs font-medium tracking-widest uppercase mb-2">
                            {format(new Date(), "EEEE, MMMM d · yyyy")}
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                            {greetText}, <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">{firstName}!</span>
                        </h1>
                        <p className="text-muted-foreground text-sm">{greeting}</p>
                    </div>

                    {/* Quick productivity score */}
                    <div className="flex-shrink-0 text-center">
                        <div className="relative inline-flex items-center justify-center">
                            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/10" />
                                <circle cx="40" cy="40" r="30" stroke="url(#scoreGrad)" strokeWidth="6" fill="none"
                                    strokeDasharray={`${(Math.min((habitPct + prayerPct + waterPct) / 3, 100) / 100) * 188.5} 188.5`}
                                    strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                                <defs>
                                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold">{Math.round((habitPct + prayerPct + waterPct) / 3)}%</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-1">Today&apos;s score</p>
                    </div>
                </div>
            </section>

            {/* ── Key Stats (3-col) ── */}
            <section className="grid grid-cols-3 gap-3">
                {/* Habits */}
                <Link href="/dashboard/habits" className="group relative overflow-hidden p-4 rounded-2xl glass border border-white/[0.05] hover:border-emerald-500/25 hover:shadow-glass transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.07] rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
                            </div>
                            <StatRing value={habitPct} max={100} color="#10b981" />
                        </div>
                        <p className="text-xl sm:text-2xl font-bold stat-number">
                            {stats.habitsCompleted}<span className="text-sm text-muted-foreground font-medium">/{stats.habitsTotal}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Habits today</p>
                    </div>
                </Link>

                {/* Prayer */}
                <Link href="/dashboard/prayer" className="group relative overflow-hidden p-4 rounded-2xl glass border border-white/[0.05] hover:border-violet-500/25 hover:shadow-glass transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/[0.07] rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                                <Moon className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
                            </div>
                            <StatRing value={prayerPct} max={100} color="#7c3aed" />
                        </div>
                        <p className="text-xl sm:text-2xl font-bold stat-number">
                            {stats.prayersCompleted}<span className="text-sm text-muted-foreground font-medium">/5</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Prayers</p>
                    </div>
                </Link>

                {/* Water */}
                <Link href="/dashboard/water" className="group relative overflow-hidden p-4 rounded-2xl glass border border-white/[0.05] hover:border-cyan-500/25 hover:shadow-glass transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/[0.07] rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                                <Droplets className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
                            </div>
                            <StatRing value={waterPct} max={100} color="#06b6d4" />
                        </div>
                        <p className="text-xl sm:text-2xl font-bold stat-number">
                            {(stats.waterMl / 1000).toFixed(1)}<span className="text-sm text-muted-foreground font-medium">L</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Hydration</p>
                    </div>
                </Link>
            </section>

            {/* ── Secondary Stats (4-col) ── */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { href: "/dashboard/sleep",    icon: Bed,      label: "Sleep",   value: `${stats.sleepHours.toFixed(1)}h`, color: "text-indigo-400", bg: "bg-indigo-500/10", hover: "hover:border-indigo-500/25" },
                    { href: "/dashboard/pomodoro", icon: Timer,    label: "Focus",   value: `${stats.focusMinutes}m`,           color: "text-amber-400",  bg: "bg-amber-500/10",  hover: "hover:border-amber-500/25" },
                    { href: "/dashboard/finance",  icon: Wallet,   label: "Spent",   value: fmtMoney(stats.expenses),          color: "text-emerald-400",bg: "bg-emerald-500/10",hover: "hover:border-emerald-500/25" },
                    { href: "/dashboard/tasks",    icon: ListTodo, label: "Done",    value: `${stats.tasksCompleted} tasks`,   color: "text-rose-400",   bg: "bg-rose-500/10",   hover: "hover:border-rose-500/25" },
                ].map((s, i) => (
                    <Link key={i} href={s.href} className={`group flex items-center gap-3 p-4 rounded-2xl glass border border-white/[0.05] ${s.hover} hover:shadow-glass transition-all duration-300`}>
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-base sm:text-lg font-bold stat-number ${s.color} truncate`}>{s.value}</p>
                            <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </div>
                    </Link>
                ))}
            </section>

            {/* ── All Features Grid ── */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Features</h3>
                    <Link href="/dashboard/settings" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                        <Settings className="w-3 h-3" /> Customize
                    </Link>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                    {ALL_FEATURES.map((f, i) => (
                        <Link key={i} href={f.href}
                            className="group flex flex-col items-center gap-2 p-3 rounded-2xl glass border border-white/[0.04] hover:border-white/[0.08] hover:shadow-glass transition-all duration-200 active:scale-95">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.grad} flex items-center justify-center shadow-lg ${f.glow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-200`}>
                                <f.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{f.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Quick Action Banner ── */}
            <Link href="/dashboard/insights"
                className="group flex items-center justify-between p-5 rounded-2xl glass border border-violet-500/15 hover:border-violet-500/30 hover:shadow-glass transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow animate-float">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-lg" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm sm:text-base">Check Your Insights</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Productivity score · Weekly trends · Analytics</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-violet-400 transition-all flex-shrink-0" />
            </Link>

            {/* ── Insights quick link ── */}
            <Link href="/dashboard/insights"
                className="group flex items-center justify-between p-4 rounded-2xl glass border border-white/[0.05] hover:border-purple-500/20 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">Detailed Analytics</p>
                        <p className="text-xs text-muted-foreground">7-day & 30-day trend reports</p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
