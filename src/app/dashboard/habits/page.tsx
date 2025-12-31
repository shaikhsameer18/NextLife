"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { getToday, generateId } from "@/lib/utils";
import type { Habit, HabitLog } from "@/types";
import { Plus, CheckCircle2, Trash2, Edit, Archive, ArchiveRestore, X, Target, List, ChevronLeft, ChevronRight, History } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const HABIT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444", "#22c55e", "#6366f1", "#f97316"];
const HABIT_ICONS = ["💪", "📚", "🏃", "💧", "🧘", "✍️", "🎯", "💻", "🎨", "🎵", "🍎", "🧠", "❤️", "🌟", "🔥", "⚡", "🌿", "🎮", "📱", "🚀"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "today" | "all" | "archived" | "history";

export default function HabitsPage() {
    const { user } = useUser();
    const [isPending, startTransition] = useTransition();
    const [allHabits, setAllHabits] = useState<Habit[]>([]);
    const [todayLogs, setTodayLogs] = useState<Map<string, HabitLog>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("today");
    const [historyDate, setHistoryDate] = useState(getToday());
    const [historyLogs, setHistoryLogs] = useState<Map<string, HabitLog>>(new Map());

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
            const [habits, logs] = await Promise.all([
                db.habits.toArray(),
                db.habitLogs.where("date").equals(today).toArray()
            ]);
            setAllHabits(habits.sort((a, b) => a.order - b.order));
            const logsMap = new Map<string, HabitLog>();
            logs.forEach((log) => logsMap.set(log.habitId, log));
            setTodayLogs(logsMap);
        } catch (error) {
            console.error("Failed to load habits:", error);
        } finally {
            setLoading(false);
        }
    }, [user, today]);

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
    }, [user, historyDate, viewMode]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadHistoryLogs(); }, [loadHistoryLogs]);

    const getFilteredHabits = () => {
        switch (viewMode) {
            case "today": return allHabits.filter(h => !h.isArchived && (!h.targetDays?.length || h.targetDays.includes(todayDayOfWeek)));
            case "all": return allHabits.filter(h => !h.isArchived);
            case "archived": return allHabits.filter(h => h.isArchived);
            case "history": const dow = parseISO(historyDate).getDay(); return allHabits.filter(h => !h.isArchived && (!h.targetDays?.length || h.targetDays.includes(dow)));
        }
    };

    const habits = getFilteredHabits();
    const currentLogs = viewMode === "history" ? historyLogs : todayLogs;

    const openAddForm = () => { setEditingHabit(null); setFormName(""); setFormColor(HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)]); setFormIcon(HABIT_ICONS[0]); setFormDays([0, 1, 2, 3, 4, 5, 6]); setShowForm(true); };
    const openEditForm = (habit: Habit) => { setEditingHabit(habit); setFormName(habit.name); setFormColor(habit.color); setFormIcon(habit.icon); setFormDays(habit.targetDays || [0, 1, 2, 3, 4, 5, 6]); setShowForm(true); };
    const toggleDay = (day: number) => { if (formDays.includes(day)) { if (formDays.length > 1) setFormDays(formDays.filter(d => d !== day)); } else { setFormDays([...formDays, day].sort()); } };

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
    };

    // INSTANT TOGGLE - Optimistic update
    const toggleHabit = async (habitId: string) => {
        if (!user || viewMode !== "today") return;

        const existingLog = todayLogs.get(habitId);
        const newCompleted = !existingLog?.completed;

        // Instant UI update
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

        // Background DB update
        const db = getUserDatabase(user.id);
        const now = Date.now();
        if (existingLog) {
            await db.habitLogs.update(existingLog.id, { completed: newCompleted, updatedAt: now });
        } else {
            const log: HabitLog = { id: generateId(), userId: user.id, habitId, date: today, completed: true, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.habitLogs.add(log);
            setTodayLogs(prev => { const m = new Map(prev); m.set(habitId, log); return m; });
        }
    };

    const deleteHabit = async (habitId: string) => {
        if (!user) return;
        setAllHabits(prev => prev.filter(h => h.id !== habitId));
        const db = getUserDatabase(user.id);
        await db.habits.delete(habitId);
        await db.habitLogs.where("habitId").equals(habitId).delete();
    };

    const toggleArchive = async (habitId: string, isArchived: boolean) => {
        if (!user) return;
        setAllHabits(prev => prev.map(h => h.id === habitId ? { ...h, isArchived: !isArchived } : h));
        const db = getUserDatabase(user.id);
        await db.habits.update(habitId, { isArchived: !isArchived, updatedAt: Date.now() });
    };

    const goToHistoryDate = (days: number) => {
        const newDate = days > 0 ? format(addDays(parseISO(historyDate), days), "yyyy-MM-dd") : format(subDays(parseISO(historyDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setHistoryDate(newDate);
    };

    const completedCount = habits.filter(h => currentLogs.get(h.id)?.completed).length;
    const completionRate = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {/* Header - Sage Green Matte */}
            <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-700 to-green-800 text-white shadow-lg">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Habits</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Build your routine</p>
                    </div>
                </div>
                <button onClick={openAddForm} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white font-medium text-sm active:scale-95 transition-transform shadow-lg">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New</span>
                </button>
            </div>

            {/* Tabs - Grid with Matte Style */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { id: "today", label: "Today", icon: Target },
                    { id: "all", label: "All", icon: List },
                    { id: "history", label: "History", icon: History },
                    { id: "archived", label: "Archive", icon: Archive }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id as ViewMode)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${viewMode === tab.id ? "bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg" : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"}`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* History Date Picker - Matte */}
            {viewMode === "history" && (
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 rounded-2xl p-3 border border-emerald-200 dark:border-emerald-800">
                    <button onClick={() => goToHistoryDate(-1)} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-emerald-900/50 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    </button>
                    <div className="text-center">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{format(parseISO(historyDate), "EEEE, MMM d")}</p>
                        {historyDate === today && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Today</span>}
                    </div>
                    <button onClick={() => goToHistoryDate(1)} disabled={historyDate >= today} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-emerald-900/50 disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    </button>
                </div>
            )}

            {/* Progress - Matte */}
            {viewMode === "today" && habits.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{completedCount}/{habits.length} done</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
                    </div>
                    <div className="h-2.5 bg-emerald-200 dark:bg-emerald-900/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                </div>
            )}

            {/* Habits List */}
            {habits.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                    </div>
                    <h3 className="font-semibold mb-1">{viewMode === "archived" ? "No archived" : "No habits"}</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start your journey</p>
                    {viewMode !== "archived" && (
                        <button onClick={openAddForm} className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm">
                            Create Habit
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {habits.map((habit) => {
                        const log = currentLogs.get(habit.id);
                        const isCompleted = log?.completed ?? false;
                        const canToggle = viewMode === "today";

                        return (
                            <div
                                key={habit.id}
                                className={`group flex items-center gap-3 p-3 rounded-xl transition-all ${isCompleted ? "bg-emerald-500/10" : "bg-card"}`}
                            >
                                <button
                                    onClick={() => canToggle && toggleHabit(habit.id)}
                                    disabled={!canToggle}
                                    className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isCompleted
                                        ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                                        : canToggle ? "bg-secondary hover:scale-105" : "bg-secondary opacity-50"
                                        }`}
                                    style={!isCompleted ? { backgroundColor: habit.color + "20" } : undefined}
                                >
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xl">{habit.icon}</span>}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                        {habit.name}
                                    </p>
                                    {habit.targetDays && habit.targetDays.length < 7 && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {habit.targetDays.map(d => (
                                                <span key={d} className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: habit.color + "20", color: habit.color }}>
                                                    {WEEKDAYS[d]}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditForm(habit)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggleArchive(habit.id, habit.isArchived)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                                        {habit.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => deleteHabit(habit.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            {/* Form Modal - Sage Green Theme */}
            {
                showForm && (
                    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowForm(false)}>
                        <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto border-t-4 border-emerald-500" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 flex items-center justify-between p-4 border-b border-emerald-200 dark:border-emerald-800">
                                <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{editingHabit ? "✏️ Edit" : "✨ New"} Habit</h2>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Name</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="Exercise, Read, Meditate..."
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary text-sm focus:ring-2 ring-emerald-500 outline-none"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Days</label>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {WEEKDAYS_FULL.map((day, i) => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDay(i)}
                                                className={`py-2 rounded-lg font-medium text-sm transition-all ${formDays.includes(i) ? "bg-emerald-500 text-white" : "bg-secondary"}`}
                                            >
                                                {WEEKDAYS[i]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Icon</label>
                                    <div className="grid grid-cols-10 gap-1.5">
                                        {HABIT_ICONS.map((icon) => (
                                            <button
                                                key={icon}
                                                type="button"
                                                onClick={() => setFormIcon(icon)}
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${formIcon === icon ? "bg-emerald-500/20 ring-2 ring-emerald-500" : "bg-secondary"}`}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {HABIT_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all ${formColor === color ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"}`}
                                                style={{ backgroundColor: color, ["--tw-ring-color" as string]: color } as React.CSSProperties}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-medium">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium">
                                        {editingHabit ? "Save" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
