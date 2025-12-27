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
    Flame,
    Sun,
    BookOpen,
    Dumbbell,
    ListTodo,
    Utensils,
    Lightbulb,
    Settings,
    ChevronRight,
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

export default function DashboardPage() {
    const { user } = useUser();
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

    const formatINR = (amount: number) => {
        if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
        return `₹${amount}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const habitProgress = stats.habitsTotal > 0 ? (stats.habitsCompleted / stats.habitsTotal) * 100 : 0;
    const prayerProgress = (stats.prayersCompleted / 5) * 100;
    const waterProgress = Math.min((stats.waterMl / 2500) * 100, 100);
    const overallProgress = Math.round((habitProgress + prayerProgress + waterProgress) / 3);

    return (
        <div className="space-y-5 pb-28 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
                    <h1 className="text-xl font-bold mt-0.5">
                        {greetingEmoji} {greeting}, {user?.name?.split(" ")[0]}!
                    </h1>
                </div>
                <Link href="/dashboard/settings" className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </Link>
            </div>

            {/* Progress Card */}
            <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Today&apos;s Progress</span>
                    <div className="flex items-center gap-1.5 text-primary">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{overallProgress}%</span>
                    </div>
                </div>
                <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            {/* Main Stats - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/habits" className="p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
                    <p className="text-2xl font-bold">{stats.habitsCompleted}<span className="text-base text-muted-foreground">/{stats.habitsTotal}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Habits Done</p>
                </Link>

                <Link href="/dashboard/prayer" className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                    <Moon className="w-6 h-6 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold">{stats.prayersCompleted}<span className="text-base text-muted-foreground">/5</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prayers</p>
                </Link>

                <Link href="/dashboard/water" className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all">
                    <Droplets className="w-6 h-6 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold">{(stats.waterMl / 1000).toFixed(1)}<span className="text-base text-muted-foreground">L</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Water</p>
                </Link>

                <Link href="/dashboard/finance" className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                    <Wallet className="w-6 h-6 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold">{formatINR(stats.expenses)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Spent Today</p>
                </Link>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h2>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { href: "/dashboard/fitness", icon: Dumbbell, label: "Fitness", color: "text-teal-500" },
                        { href: "/dashboard/sleep", icon: Bed, label: "Sleep", color: "text-indigo-500" },
                        { href: "/dashboard/tasks", icon: ListTodo, label: "Tasks", color: "text-red-500" },
                        { href: "/dashboard/journal", icon: BookOpen, label: "Journal", color: "text-pink-500" },
                        { href: "/dashboard/pomodoro", icon: Timer, label: "Focus", color: "text-yellow-500" },
                        { href: "/dashboard/meals", icon: Utensils, label: "Meals", color: "text-orange-500" },
                        { href: "/dashboard/vault", icon: Lightbulb, label: "Vault", color: "text-cyan-500" },
                        { href: "/dashboard/insights", icon: TrendingUp, label: "Insights", color: "text-violet-500" },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/sleep" className="p-3 rounded-xl bg-card border border-border hover:border-indigo-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                        <Bed className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium">Sleep</span>
                    </div>
                    <p className="text-lg font-bold">{stats.sleepHours.toFixed(1)}h</p>
                </Link>
                <Link href="/dashboard/pomodoro" className="p-3 rounded-xl bg-card border border-border hover:border-yellow-500/40 transition-all">
                    <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-medium">Focus</span>
                    </div>
                    <p className="text-lg font-bold">{Math.floor(stats.focusMinutes / 60)}h {stats.focusMinutes % 60}m</p>
                </Link>
            </div>

            {/* Insights CTA */}
            <Link
                href="/dashboard/insights"
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500 text-white">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">View Insights</p>
                        <p className="text-xs text-muted-foreground">See your weekly trends</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            {/* Motivation */}
            <div className="text-center">
                <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Keep pushing, you&apos;re doing amazing! 💪
                </p>
            </div>
        </div>
    );
}
