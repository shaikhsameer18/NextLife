"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
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
    Flame,
    Sun,
    ArrowRight,
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

const QUICK_ACTIONS = [
    { href: "/dashboard/habits", icon: CheckCircle2, label: "Log Habit", color: "from-green-500 to-emerald-600" },
    { href: "/dashboard/prayer", icon: Moon, label: "Log Namaz", color: "from-purple-500 to-violet-600" },
    { href: "/dashboard/water", icon: Droplets, label: "Add Water", color: "from-blue-500 to-cyan-600" },
    { href: "/dashboard/finance", icon: Wallet, label: "Add Expense", color: "from-emerald-500 to-green-600" },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<TodayStats>({
        habitsCompleted: 0, habitsTotal: 0, prayersCompleted: 0,
        sleepHours: 0, waterMl: 0, focusMinutes: 0, expenses: 0,
    });
    const [loading, setLoading] = useState(true);

    const today = getToday();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    const greetingEmoji = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

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

    const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const habitProgress = stats.habitsTotal > 0 ? (stats.habitsCompleted / stats.habitsTotal) * 100 : 0;
    const prayerProgress = (stats.prayersCompleted / 5) * 100;
    const waterProgress = Math.min((stats.waterMl / 2500) * 100, 100);

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Greeting Header */}
            <div className="bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-fuchsia-500/20 border border-primary/20 rounded-2xl p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            {greetingEmoji} {greeting},
                        </h1>
                        <h2 className="text-2xl md:text-3xl font-bold text-primary">{user?.name?.split(" ")[0]}!</h2>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            {format(new Date(), "EEEE, MMMM d, yyyy")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="font-bold text-primary">{Math.round((habitProgress + prayerProgress) / 2)}%</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
                {QUICK_ACTIONS.map((action) => (
                    <Link
                        key={action.href}
                        href={action.href}
                        className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl md:rounded-2xl bg-card border-2 border-border hover:border-primary/50 transition-all group"
                    >
                        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform shadow-lg`}>
                            <action.icon className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-center leading-tight">{action.label}</span>
                    </Link>
                ))}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Habits */}
                <Link href="/dashboard/habits" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-2xl md:text-3xl font-bold">{stats.habitsCompleted}/{stats.habitsTotal}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">Habits</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-xs md:text-sm font-bold text-green-500">{Math.round(habitProgress)}%</span>
                        </div>
                    </div>
                </Link>

                {/* Prayers */}
                <Link href="/dashboard/prayer" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <Moon className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-2xl md:text-3xl font-bold">{stats.prayersCompleted}/5</p>
                            <p className="text-xs md:text-sm text-muted-foreground">Namaz</p>
                        </div>
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-xs md:text-sm font-bold text-purple-500">{Math.round(prayerProgress)}%</span>
                        </div>
                    </div>
                </Link>

                {/* Sleep */}
                <Link href="/dashboard/sleep" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-card border-2 border-border hover:border-indigo-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <Bed className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{stats.sleepHours.toFixed(1)}h</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Sleep</p>
                </Link>

                {/* Water */}
                <Link href="/dashboard/water" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-card border-2 border-border hover:border-blue-500/40 transition-all group">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                        <Droplets className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{(stats.waterMl / 1000).toFixed(1)}L</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Water</p>
                    <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${waterProgress}%` }} />
                    </div>
                </Link>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Link href="/dashboard/pomodoro" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-card border-2 border-border hover:border-yellow-500/40 transition-all">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <Timer className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                        <span className="font-semibold text-sm md:text-base">Focus Time</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{Math.floor(stats.focusMinutes / 60)}h {stats.focusMinutes % 60}m</p>
                </Link>

                <Link href="/dashboard/finance" className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-card border-2 border-border hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                        <Wallet className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                        <span className="font-semibold text-sm md:text-base">Today&apos;s Spend</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{formatINR(stats.expenses)}</p>
                </Link>
            </div>

            {/* Insights CTA */}
            <Link href="/dashboard/insights" className="block p-5 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 border border-primary/20 hover:border-primary/40 transition-all group">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base md:text-lg">View Your Insights</h3>
                            <p className="text-xs md:text-sm text-muted-foreground">See your weekly trends and productivity score</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
            </Link>

            {/* Motivational Message */}
            <div className="text-center py-4 md:py-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Keep going, {user?.name?.split(" ")[0]}! You&apos;re doing great! 💪
                </div>
            </div>
        </div>
    );
}
