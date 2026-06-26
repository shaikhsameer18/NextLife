"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { getToday, generateId } from "@/lib/utils";
import type { Habit, HabitLog } from "@/types";
import { Plus, CheckCircle2, Trash2, Edit, Archive, ArchiveRestore, X, Target, List, ChevronLeft, ChevronRight, History, Flame, Zap } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const HABIT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444", "#22c55e", "#6366f1", "#f97316"];
const HABIT_ICONS = ["💪", "📚", "🏃", "💧", "🧘", "✍️", "🎯", "💻", "🎨", "🎵", "🍎", "🧠", "❤️", "🌟", "🔥", "⚡", "🌿", "🎮", "📱", "🚀"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "today" | "all" | "archived" | "history";

const TABS = [
    { id: "today",    label: "Today",   icon: Target },
    { id: "all",      label: "All",     icon: List },
    { id: "history",  label: "History", icon: History },
    { id: "archived", label: "Archive", icon: Archive },
] as const;

export default function HabitsPage() {
    const { user } = useUser();
    const [, startTransition] = useTransition();
    const [allHabits, setAllHabits] = useState<Habit[]>([]);
    const [todayLogs, setTodayLogs] = useState<Map<string, HabitLog>>(new Map());
    const [streakMap, setStreakMap] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("today");
    const [historyDate, setHistoryDate] = useState(getToday());
    const [historyLogs, setHistoryLogs] = useState<Map<string, HabitLog>>(new Map());
    const [justToggled, setJustToggled] = useState<string | null>(null);

    const [formName, setFormName] = useState("");
    const [formColor, setFormColor] = useState(HABIT_COLORS[0]);
    const [formIcon, setFormIcon] = useState(HABIT_ICONS[0]);
    const [formDays, setFormDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

    const today = getToday();
    const todayDayOfWeek = new Date().getDay();

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
            const [habits, todayLogsArr, recentLogs] = await Promise.all([
                db.habits.toArray(),
                db.habitLogs.where("date").equals(today).toArray(),
                db.habitLogs.where("date").between(thirtyDaysAgo, today, true, true).toArray(),
            ]);
            const sorted = habits.sort((a, b) => a.order - b.order);
            setAllHabits(sorted);

            const logsMap = new Map<string, HabitLog>();
            todayLogsArr.forEach((log) => logsMap.set(log.habitId, log));
            setTodayLogs(logsMap);

            const newStreakMap = new Map<string, number>();
            for (const habit of sorted) {
                let streak = 0;
                for (let i = 0; i < 30; i++) {
                    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
                    const dow = parseISO(date).getDay();
                    if (habit.targetDays && habit.targetDays.length > 0 && !habit.targetDays.includes(dow)) continue;
                    const done = recentLogs.some(l => l.habitId === habit.id && l.date === date && l.completed);
                    if (done) streak++;
                    else break;
                }
                newStreakMap.set(habit.id, streak);
            }
            setStreakMap(newStreakMap);
        } catch (error) {
            console.error("Failed to load habits:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, today]);

    const loadHistoryLogs = useCallback(async () => {
        if (!user || viewMode !== "history") return;
        try {
            const db = getUserDatabase(user.id);
            const logs = await db.habitLogs.where("date").equals(historyDate).toArray();
            const logsMap = new Map<string, HabitLog>();
            logs.forEach((log) => logsMap.set(log.habitId, log));
            setHistoryLogs(logsMap);
        } catch (error) {
            console.error("Failed to load history:", error);
        }
    }, [user?.id, historyDate, viewMode]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadHistoryLogs(); }, [loadHistoryLogs]);

    const getFilteredHabits = () => {
        switch (viewMode) {
            case "today":   return allHabits.filter(h => !h.isArchived && (!h.targetDays?.length || h.targetDays.includes(todayDayOfWeek)));
            case "all":     return allHabits.filter(h => !h.isArchived);
            case "archived":return allHabits.filter(h => h.isArchived);
            case "history": {
                const dow = parseISO(historyDate).getDay();
                return allHabits.filter(h => !h.isArchived && (!h.targetDays?.length || h.targetDays.includes(dow)));
            }
        }
    };

    const habits = getFilteredHabits();
    const currentLogs = viewMode === "history" ? historyLogs : todayLogs;
    const completedCount = habits.filter(h => currentLogs.get(h.id)?.completed).length;
    const completionRate = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    const openAddForm = () => {
        setEditingHabit(null);
        setFormName("");
        setFormColor(HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)]);
        setFormIcon(HABIT_ICONS[0]);
        setFormDays([0, 1, 2, 3, 4, 5, 6]);
        setShowForm(true);
    };
    const openEditForm = (habit: Habit) => {
        setEditingHabit(habit);
        setFormName(habit.name);
        setFormColor(habit.color);
        setFormIcon(habit.icon);
        setFormDays(habit.targetDays || [0, 1, 2, 3, 4, 5, 6]);
        setShowForm(true);
    };
    const toggleDay = (day: number) => {
        if (formDays.includes(day)) {
            if (formDays.length > 1) setFormDays(formDays.filter(d => d !== day));
        } else {
            setFormDays([...formDays, day].sort());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formName.trim()) return;
        const db = getUserDatabase(user.id);
        const now = Date.now();
        if (editingHabit) {
            await db.habits.update(editingHabit.id, { name: formName.trim(), color: formColor, icon: formIcon, targetDays: formDays, updatedAt: now });
        } else {
            const habit: Habit = { id: generateId(), userId: user.id, name: formName.trim(), frequency: "custom", targetDays: formDays, color: formColor, icon: formIcon, isArchived: false, order: allHabits.length, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.habits.add(habit);
        }
        setShowForm(false);
        loadData();
        syncToCloud(user.id, "habits");
    };

    const toggleHabit = async (habitId: string) => {
        if (!user || viewMode !== "today") return;
        const existingLog = todayLogs.get(habitId);
        const newCompleted = !existingLog?.completed;

        if (newCompleted) {
            setJustToggled(habitId);
            setTimeout(() => setJustToggled(null), 600);
        }

        startTransition(() => {
            setTodayLogs(prev => {
                const newMap = new Map(prev);
                if (existingLog) {
                    newMap.set(habitId, { ...existingLog, completed: newCompleted });
                } else {
                    newMap.set(habitId, { id: "temp", habitId, userId: user.id, date: today, completed: true, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: "pending", version: 1 });
                }
                return newMap;
            });
        });

        const db = getUserDatabase(user.id);
        const now = Date.now();
        if (existingLog) {
            await db.habitLogs.update(existingLog.id, { completed: newCompleted, updatedAt: now });
        } else {
            const log: HabitLog = { id: generateId(), userId: user.id, habitId, date: today, completed: true, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.habitLogs.add(log);
            setTodayLogs(prev => { const m = new Map(prev); m.set(habitId, log); return m; });
        }
        syncToCloud(user.id, "habitLogs");
    };

    const deleteHabit = async (habitId: string) => {
        if (!user) return;
        setAllHabits(prev => prev.filter(h => h.id !== habitId));
        const db = getUserDatabase(user.id);
        await db.habits.delete(habitId);
        await db.habitLogs.where("habitId").equals(habitId).delete();
        syncToCloud(user.id, "habits");
        syncToCloud(user.id, "habitLogs");
    };

    const toggleArchive = async (habitId: string, isArchived: boolean) => {
        if (!user) return;
        setAllHabits(prev => prev.map(h => h.id === habitId ? { ...h, isArchived: !isArchived } : h));
        const db = getUserDatabase(user.id);
        await db.habits.update(habitId, { isArchived: !isArchived, updatedAt: Date.now() });
        syncToCloud(user.id, "habits");
    };

    const goToHistoryDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(historyDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(historyDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setHistoryDate(newDate);
    };

    const bestStreak = Math.max(0, ...Array.from(streakMap.values()));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div
                    className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-6 relative">
            {/* ── HERO STATS HEADER ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-3xl overflow-hidden p-5"
                style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #052e16 100%)" }}
            >
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-12 w-24 h-24 bg-green-300/10 rounded-full translate-y-1/2" />

                <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-emerald-400/60 text-xs font-semibold tracking-widest uppercase">Habit Tracker</p>
                            <h1 className="text-2xl font-black text-white mt-0.5">
                                {viewMode === "today" ? format(new Date(), "EEEE") : viewMode === "history" ? format(parseISO(historyDate), "MMM d") : viewMode === "archived" ? "Archive" : "All Habits"}
                            </h1>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={openAddForm}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/50"
                        >
                            <Plus className="w-4 h-4" />
                            New
                        </motion.button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Completed", value: completedCount, suffix: `/${habits.length}`, icon: CheckCircle2, color: "text-emerald-400" },
                            { label: "Rate", value: completionRate, suffix: "%", icon: Zap, color: "text-yellow-400" },
                            { label: "Best Streak", value: bestStreak, suffix: "d", icon: Flame, color: "text-orange-400" },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10"
                            >
                                <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                                <p className="text-white font-black text-xl leading-none">
                                    {stat.value}<span className="text-white/40 text-sm font-medium">{stat.suffix}</span>
                                </p>
                                <p className="text-white/40 text-[10px] mt-0.5">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    {viewMode === "today" && habits.length > 0 && (
                        <div className="mt-4">
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-green-300 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionRate}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── TABS ── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map((tab) => (
                    <motion.button
                        key={tab.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewMode(tab.id as ViewMode)}
                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${viewMode === tab.id
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                        {viewMode === tab.id && (
                            <motion.div
                                layoutId="tab-indicator"
                                className="absolute inset-0 rounded-xl bg-emerald-600 -z-10"
                            />
                        )}
                    </motion.button>
                ))}
            </div>

            {/* ── HISTORY DATE NAV ── */}
            <AnimatePresence>
                {viewMode === "history" && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex items-center justify-between bg-card border border-border rounded-2xl p-3 overflow-hidden"
                    >
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => goToHistoryDate(-1)} className="p-2 rounded-xl hover:bg-secondary">
                            <ChevronLeft className="w-5 h-5" />
                        </motion.button>
                        <div className="text-center">
                            <p className="font-semibold">{format(parseISO(historyDate), "EEEE, MMM d")}</p>
                            {historyDate === today && <span className="text-xs text-emerald-500 font-medium">Today</span>}
                        </div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => goToHistoryDate(1)} disabled={historyDate >= today} className="p-2 rounded-xl hover:bg-secondary disabled:opacity-30">
                            <ChevronRight className="w-5 h-5" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── HABIT LIST ── */}
            {habits.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                >
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{viewMode === "archived" ? "No archived habits" : "No habits yet"}</h3>
                    <p className="text-muted-foreground text-sm mb-5">
                        {viewMode === "today" ? "Add your first habit to start building your routine" : ""}
                    </p>
                    {viewMode !== "archived" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={openAddForm}
                            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-900/20"
                        >
                            Create First Habit
                        </motion.button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                        {habits.map((habit, idx) => {
                            const log = currentLogs.get(habit.id);
                            const isCompleted = log?.completed ?? false;
                            const canToggle = viewMode === "today";
                            const streak = streakMap.get(habit.id) ?? 0;
                            const isJust = justToggled === habit.id;

                            return (
                                <motion.div
                                    key={habit.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                                    className={`group relative overflow-hidden rounded-2xl border transition-colors ${isCompleted
                                        ? "border-emerald-500/20 bg-emerald-500/5"
                                        : "border-border bg-card"
                                        }`}
                                >
                                    {/* Left accent bar */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all"
                                        style={{ backgroundColor: isCompleted ? habit.color : habit.color + "40" }}
                                    />

                                    {/* Shimmer on complete */}
                                    <AnimatePresence>
                                        {isJust && (
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                                initial={{ x: "-100%" }}
                                                animate={{ x: "100%" }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                            />
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-center gap-3 p-3 pl-4">
                                        {/* Icon button */}
                                        <motion.button
                                            whileTap={canToggle ? { scale: 0.85 } : {}}
                                            onClick={() => canToggle && toggleHabit(habit.id)}
                                            disabled={!canToggle}
                                            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${isCompleted
                                                ? "shadow-lg"
                                                : canToggle ? "hover:scale-105" : "opacity-60"
                                                }`}
                                            style={isCompleted
                                                ? { backgroundColor: habit.color, boxShadow: `0 4px 14px ${habit.color}50` }
                                                : { backgroundColor: habit.color + "20" }
                                            }
                                        >
                                            <AnimatePresence mode="wait">
                                                {isCompleted ? (
                                                    <motion.div
                                                        key="check"
                                                        initial={{ scale: 0, rotate: -90 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        exit={{ scale: 0 }}
                                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                    >
                                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                                    </motion.div>
                                                ) : (
                                                    <motion.span key="icon" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                        {habit.icon}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold truncate transition-all ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                                {habit.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {habit.targetDays && habit.targetDays.length < 7 && habit.targetDays.map(d => (
                                                    <span
                                                        key={d}
                                                        className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                                                        style={{ backgroundColor: habit.color + "20", color: habit.color }}
                                                    >
                                                        {WEEKDAYS[d]}
                                                    </span>
                                                ))}
                                                {streak > 0 && (
                                                    <motion.span
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-orange-500/15 text-orange-500"
                                                    >
                                                        <Flame className="w-2.5 h-2.5" />
                                                        {streak}d
                                                    </motion.span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditForm(habit)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => toggleArchive(habit.id, habit.isArchived)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                                                {habit.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => deleteHabit(habit.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── ADD / EDIT MODAL ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Dynamic colored header with live preview */}
                            <div
                                className="sticky top-0 z-10 p-5 rounded-t-3xl overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, ${formColor}22 0%, ${formColor}0d 100%)`,
                                    borderBottom: `1px solid ${formColor}30`,
                                }}
                            >
                                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl opacity-15" style={{ background: formColor }} />
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 0.3 }}
                                            key={formIcon + formColor}
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                                            style={{ backgroundColor: formColor + "25", border: `1.5px solid ${formColor}40` }}
                                        >
                                            {formIcon}
                                        </motion.div>
                                        <div>
                                            <h2 className="text-lg font-black">{editingHabit ? "Edit Habit" : "New Habit"}</h2>
                                            <p className="text-xs font-medium mt-0.5" style={{ color: formColor }}>
                                                {formName || "Name your habit below"}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-black/10 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="text-sm font-semibold mb-1.5 block">Habit Name</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="Exercise, Read, Meditate…"
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent outline-none text-sm transition-colors"
                                        style={{ borderColor: formName ? formColor + "60" : "transparent" }}
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Icon */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Pick Icon</label>
                                    <div className="grid grid-cols-10 gap-1">
                                        {HABIT_ICONS.map((icon) => (
                                            <motion.button
                                                key={icon}
                                                type="button"
                                                whileTap={{ scale: 0.8 }}
                                                onClick={() => setFormIcon(icon)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all"
                                                style={{
                                                    background: formIcon === icon ? formColor + "25" : "var(--secondary)",
                                                    border: formIcon === icon ? `1.5px solid ${formColor}50` : "1.5px solid transparent",
                                                    transform: formIcon === icon ? "scale(1.1)" : "scale(1)",
                                                }}
                                            >
                                                {icon}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Color</label>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {HABIT_COLORS.map((color) => (
                                            <motion.button
                                                key={color}
                                                type="button"
                                                whileTap={{ scale: 0.85 }}
                                                onClick={() => setFormColor(color)}
                                                className="flex-shrink-0 transition-all"
                                                style={{
                                                    width: formColor === color ? 36 : 28,
                                                    height: formColor === color ? 36 : 28,
                                                    borderRadius: "50%",
                                                    backgroundColor: color,
                                                    boxShadow: formColor === color ? `0 0 0 2px var(--card), 0 0 0 4px ${color}` : "none",
                                                    transform: formColor === color ? "scale(1.1)" : "scale(1)",
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Schedule */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormDays(formDays.length === 7 ? [] : [0,1,2,3,4,5,6])}
                                            className="text-xs font-semibold px-3 py-1 rounded-full transition-colors"
                                            style={{ background: formColor + "20", color: formColor }}
                                        >
                                            {formDays.length === 7 ? "Clear all" : "Every day"}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {WEEKDAYS_FULL.map((day, i) => (
                                            <motion.button
                                                key={day}
                                                type="button"
                                                whileTap={{ scale: 0.88 }}
                                                onClick={() => toggleDay(i)}
                                                className="py-2.5 rounded-xl font-bold text-xs transition-all"
                                                style={
                                                    formDays.includes(i)
                                                        ? { backgroundColor: formColor, color: "#fff", boxShadow: `0 2px 8px ${formColor}50` }
                                                        : { background: "var(--secondary)" }
                                                }
                                            >
                                                {WEEKDAYS[i]}
                                            </motion.button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        {formDays.length === 0 ? "No days selected" : formDays.length === 7 ? "Every day" : `${formDays.length} day${formDays.length !== 1 ? "s" : ""}/week`}
                                    </p>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1 pb-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-semibold text-sm hover:bg-muted transition-colors">
                                        Cancel
                                    </button>
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.97 }}
                                        className="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg"
                                        style={{ backgroundColor: formColor, boxShadow: `0 4px 14px ${formColor}50` }}
                                    >
                                        {editingHabit ? "Save Changes" : "Create Habit"}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
