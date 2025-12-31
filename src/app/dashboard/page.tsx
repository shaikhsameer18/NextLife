"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { getToday } from "@/lib/utils";
import {
    Sparkles,
    CheckCircle2,
    Moon,
    Bed,
    Droplets,
    Timer,
    Wallet,
    TrendingUp,
    BookOpen,
    Dumbbell,
    ListTodo,
    Utensils,
    Lightbulb,
    ChevronRight,
    Zap,
    BarChart3,
    Settings,
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
}

const TAGLINES = {
    morning: [
        "Rise and shine! ✨",
        "New day, new wins! 🚀",
        "Let's make today count! 💪",
        "Good vibes only! ☀️",
    ],
    afternoon: [
        "Keep the momentum! 🔥",
        "You're doing amazing! ⭐",
        "Halfway there! 💫",
        "Stay focused! 🎯",
    ],
    evening: [
        "Finish strong! 💪",
        "Almost there! 🌅",
        "Great progress today! ✨",
        "You crushed it! 🏆",
    ],
    night: [
        "Time to rest! 🌙",
        "Sweet dreams ahead! 💤",
        "Well deserved rest! 😴",
        "Recharge for tomorrow! 🌟",
    ],
};

export default function DashboardPage() {
    const { user } = useUser();
    const [stats, setStats] = useState<TodayStats>({
        habitsCompleted: 0, habitsTotal: 0, prayersCompleted: 0,
        sleepHours: 0, waterMl: 0, focusMinutes: 0, expenses: 0,
    });
    const [loading, setLoading] = useState(true);
    const [tagline, setTagline] = useState("");

    const today = getToday();
    const hour = new Date().getHours();

    const getTimeOfDay = () => {
        if (hour >= 5 && hour < 12) return "morning";
        if (hour >= 12 && hour < 17) return "afternoon";
        if (hour >= 17 && hour < 21) return "evening";
        return "night";
    };

    const timeOfDay = getTimeOfDay();
    const greetingText = timeOfDay === "morning" ? "Good Morning" :
        timeOfDay === "afternoon" ? "Good Afternoon" :
            timeOfDay === "evening" ? "Good Evening" : "Good Night";

    useEffect(() => {
        const lines = TAGLINES[timeOfDay];
        setTagline(lines[Math.floor(Math.random() * lines.length)]);
    }, [timeOfDay]);

    const loadStats = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const [habits, habitLogs, prayer, sleepLog, waterLogs, pomodoros, expenses] = await Promise.all([
                db.habits.toArray(),
                db.habitLogs.where("date").equals(today).toArray(),
                db.prayers.where("date").equals(today).first(),
                db.sleepLogs.where("date").equals(today).first(),
                db.waterLogs.where("date").equals(today).toArray(),
                db.pomodoroSessions.where("date").equals(today).toArray(),
                db.expenses.where("date").equals(today).toArray(),
            ]);

            const activeHabits = habits.filter(h => !h.isArchived);
            const todayDayOfWeek = new Date().getDay();
            const todaysHabits = activeHabits.filter(h => !h.targetDays || h.targetDays.length === 0 || h.targetDays.includes(todayDayOfWeek));

            setStats({
                habitsCompleted: habitLogs.filter((l) => l.completed).length,
                habitsTotal: todaysHabits.length,
                prayersCompleted: prayer ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length : 0,
                sleepHours: sleepLog ? sleepLog.duration / 60 : 0,
                waterMl: waterLogs.reduce((sum, l) => sum + l.amount, 0),
                focusMinutes: pomodoros.filter((p) => p.completed && p.type === "work").reduce((sum, p) => sum + p.duration, 0),
                expenses: expenses.reduce((sum, e) => sum + e.amount, 0),
            });
        } catch (error) {
            console.error("Failed to load dashboard stats:", error);
        } finally {
            setLoading(false);
        }
    }, [user, today]);

    useEffect(() => { loadStats(); }, [loadStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="text-center space-y-4">
                    <div className="relative mx-auto w-16 h-16">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm">Setting up your day...</p>
                </div>
            </div>
        );
    }

    const habitPercent = stats.habitsTotal > 0 ? Math.round((stats.habitsCompleted / stats.habitsTotal) * 100) : 0;
    const prayerPercent = Math.round((stats.prayersCompleted / 5) * 100);
    const waterPercent = Math.min(Math.round((stats.waterMl / 2500) * 100), 100);

    const formatMoney = (amount: number) => amount >= 1000 ? `₹${(amount / 1000).toFixed(1)}k` : `₹${amount}`;

    const firstName = user?.name?.split(" ")[0] || "there";

    return (
        <div className="space-y-5 pb-4">
            {/* Hero Welcome Section */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl translate-x-10 -translate-y-10" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -translate-x-16 translate-y-16" />
                <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/40 rounded-full" />
                <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/30 rounded-full" />

                <div className="relative z-10">
                    {/* Date */}
                    <p className="text-white/60 text-xs sm:text-sm font-medium tracking-wide uppercase mb-4">
                        {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </p>

                    {/* Greeting */}
                    <div className="mb-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                            {greetingText},
                        </h1>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mt-1">
                            {firstName}! 👋
                        </h2>
                    </div>

                    {/* Tagline */}
                    <p className="text-white/80 text-sm sm:text-base mt-3 font-medium">
                        {tagline}
                    </p>
                </div>
            </section>

            {/* Today's Progress Ring */}
            <section className="grid grid-cols-3 gap-3">
                <Link href="/dashboard/habits" className="group p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-emerald-500 font-semibold">{habitPercent}%</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.habitsCompleted}<span className="text-base sm:text-lg text-muted-foreground font-medium">/{stats.habitsTotal}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Habits</p>
                </Link>

                <Link href="/dashboard/prayer" className="group p-4 rounded-2xl bg-card border border-border hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Moon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-violet-500 font-semibold">{prayerPercent}%</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{stats.prayersCompleted}<span className="text-base sm:text-lg text-muted-foreground font-medium">/5</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Prayers</p>
                </Link>

                <Link href="/dashboard/water" className="group p-4 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs text-blue-500 font-semibold">{waterPercent}%</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{(stats.waterMl / 1000).toFixed(1)}<span className="text-base sm:text-lg text-muted-foreground font-medium">L</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Water</p>
                </Link>
            </section>

            {/* Stats Row */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/dashboard/sleep" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-indigo-500/30 transition-all group">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                        <Bed className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-lg sm:text-xl font-bold">{stats.sleepHours.toFixed(1)}h</p>
                        <p className="text-[11px] text-muted-foreground">Sleep</p>
                    </div>
                </Link>

                <Link href="/dashboard/pomodoro" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-amber-500/30 transition-all group">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                        <Timer className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-lg sm:text-xl font-bold">{stats.focusMinutes}m</p>
                        <p className="text-[11px] text-muted-foreground">Focus</p>
                    </div>
                </Link>

                <Link href="/dashboard/finance" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/30 transition-all group">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-lg sm:text-xl font-bold">{formatMoney(stats.expenses)}</p>
                        <p className="text-[11px] text-muted-foreground">Spent</p>
                    </div>
                </Link>

                <Link href="/dashboard/insights" className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-violet-500/30 transition-all group">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                        <BarChart3 className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <p className="text-lg sm:text-xl font-bold">Insights</p>
                        <p className="text-[11px] text-muted-foreground">Analytics</p>
                    </div>
                </Link>
            </section>

            {/* Features Grid */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">All Features</h3>
                    <Link href="/dashboard/settings" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Settings className="w-3 h-3" /> Customize
                    </Link>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
                    {[
                        { href: "/dashboard/habits", icon: CheckCircle2, label: "Habits", color: "text-emerald-500", bg: "bg-emerald-500/10 hover:bg-emerald-500/20" },
                        { href: "/dashboard/prayer", icon: Moon, label: "Namaz", color: "text-violet-500", bg: "bg-violet-500/10 hover:bg-violet-500/20" },
                        { href: "/dashboard/water", icon: Droplets, label: "Water", color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/20" },
                        { href: "/dashboard/sleep", icon: Bed, label: "Sleep", color: "text-indigo-500", bg: "bg-indigo-500/10 hover:bg-indigo-500/20" },
                        { href: "/dashboard/meals", icon: Utensils, label: "Meals", color: "text-orange-500", bg: "bg-orange-500/10 hover:bg-orange-500/20" },
                        { href: "/dashboard/fitness", icon: Dumbbell, label: "Fitness", color: "text-teal-500", bg: "bg-teal-500/10 hover:bg-teal-500/20" },
                        { href: "/dashboard/tasks", icon: ListTodo, label: "Tasks", color: "text-rose-500", bg: "bg-rose-500/10 hover:bg-rose-500/20" },
                        { href: "/dashboard/pomodoro", icon: Timer, label: "Focus", color: "text-amber-500", bg: "bg-amber-500/10 hover:bg-amber-500/20" },
                        { href: "/dashboard/journal", icon: BookOpen, label: "Journal", color: "text-pink-500", bg: "bg-pink-500/10 hover:bg-pink-500/20" },
                        { href: "/dashboard/vault", icon: Lightbulb, label: "Vault", color: "text-cyan-500", bg: "bg-cyan-500/10 hover:bg-cyan-500/20" },
                        { href: "/dashboard/finance", icon: Wallet, label: "Money", color: "text-emerald-500", bg: "bg-emerald-500/10 hover:bg-emerald-500/20" },
                        { href: "/dashboard/insights", icon: TrendingUp, label: "Insights", color: "text-purple-500", bg: "bg-purple-500/10 hover:bg-purple-500/20" },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl ${item.bg} transition-all active:scale-95`}
                        >
                            <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.color}`} />
                            <span className="text-[10px] sm:text-xs font-medium text-center">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Quick Action */}
            <Link
                href="/dashboard/insights"
                className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="font-semibold">Check Your Progress</p>
                        <p className="text-sm text-muted-foreground">See weekly trends & insights</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
