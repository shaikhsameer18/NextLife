"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { getToday, generateId } from "@/lib/utils";
import type { Habit, HabitLog } from "@/types";
import { Plus, CheckCircle2, Trash2, Edit, Archive, ArchiveRestore, X, Flame, Target, List, ChevronLeft, ChevronRight, History } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const HABIT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#ef4444", "#22c55e", "#6366f1", "#f97316"];
const HABIT_ICONS = ["💪", "📚", "🏃", "💧", "🧘", "✍️", "🎯", "💻", "🎨", "🎵", "🍎", "🧠", "❤️", "🌟", "🔥", "⚡", "🌿", "🎮", "📱", "🚀"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "today" | "all" | "archived" | "history";

export default function HabitsPage() {
    const { user } = useUser();
    const [allHabits, setAllHabits] = useState<Habit[]>([]);
    const [todayLogs, setTodayLogs] = useState<Map<string, HabitLog>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("today");
    const [historyDate, setHistoryDate] = useState(getToday());
    const [historyLogs, setHistoryLogs] = useState<Map<string, HabitLog>>(new Map());

    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formColor, setFormColor] = useState(HABIT_COLORS[0]);
    const [formIcon, setFormIcon] = useState(HABIT_ICONS[0]);
    const [formDays, setFormDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

    const today = getToday();
    const todayDayOfWeek = new Date().getDay();

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const habits = await db.habits.toArray();
            setAllHabits(habits.sort((a, b) => a.order - b.order));
            const logs = await db.habitLogs.where("date").equals(today).toArray();
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
            case "today": return allHabits.filter(h => { if (h.isArchived) return false; if (!h.targetDays || h.targetDays.length === 0) return true; return h.targetDays.includes(todayDayOfWeek); });
            case "all": return allHabits.filter(h => !h.isArchived);
            case "archived": return allHabits.filter(h => h.isArchived);
            case "history": const historyDayOfWeek = parseISO(historyDate).getDay(); return allHabits.filter(h => { if (h.isArchived) return false; if (!h.targetDays || h.targetDays.length === 0) return true; return h.targetDays.includes(historyDayOfWeek); });
        }
    };

    const habits = getFilteredHabits();
    const currentLogs = viewMode === "history" ? historyLogs : todayLogs;

    const openAddForm = () => { setEditingHabit(null); setFormName(""); setFormDescription(""); setFormColor(HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)]); setFormIcon(HABIT_ICONS[0]); setFormDays([0, 1, 2, 3, 4, 5, 6]); setShowForm(true); };
    const openEditForm = (habit: Habit) => { setEditingHabit(habit); setFormName(habit.name); setFormDescription(habit.description || ""); setFormColor(habit.color); setFormIcon(habit.icon); setFormDays(habit.targetDays || [0, 1, 2, 3, 4, 5, 6]); setShowForm(true); };
    const toggleDay = (day: number) => { if (formDays.includes(day)) { if (formDays.length > 1) setFormDays(formDays.filter(d => d !== day)); } else { setFormDays([...formDays, day].sort()); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formName.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            if (editingHabit) {
                await db.habits.update(editingHabit.id, { name: formName.trim(), description: formDescription.trim() || undefined, color: formColor, icon: formIcon, targetDays: formDays, updatedAt: now });
            } else {
                const habit: Habit = { id: generateId(), userId: user.id, name: formName.trim(), description: formDescription.trim() || undefined, frequency: "custom", targetDays: formDays, color: formColor, icon: formIcon, isArchived: false, order: allHabits.length, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
                await db.habits.add(habit);
            }
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error("Failed to save habit:", error);
        }
    };

    const toggleHabit = async (habitId: string) => {
        if (!user) return;
        if (viewMode === "history" && historyDate !== today) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const existingLog = currentLogs.get(habitId);
            if (existingLog) { await db.habitLogs.update(existingLog.id, { completed: !existingLog.completed, updatedAt: now }); }
            else { const log: HabitLog = { id: generateId(), userId: user.id, habitId, date: today, completed: true, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 }; await db.habitLogs.add(log); }
            loadData();
        } catch (error) {
            console.error("Failed to toggle habit:", error);
        }
    };

    const deleteHabit = async (habitId: string) => { if (!user) return; try { const db = getUserDatabase(user.id); await db.habits.delete(habitId); await db.habitLogs.where("habitId").equals(habitId).delete(); loadData(); } catch (error) { console.error("Failed to delete habit:", error); } };
    const toggleArchive = async (habitId: string, isArchived: boolean) => { if (!user) return; try { const db = getUserDatabase(user.id); await db.habits.update(habitId, { isArchived: !isArchived, updatedAt: Date.now() }); loadData(); } catch (error) { console.error("Failed to toggle archive:", error); } };
    const goToHistoryDate = (days: number) => { const newDate = days > 0 ? format(addDays(parseISO(historyDate), days), "yyyy-MM-dd") : format(subDays(parseISO(historyDate), Math.abs(days)), "yyyy-MM-dd"); if (newDate > today) return; setHistoryDate(newDate); };

    const completedCount = Array.from(currentLogs.values()).filter((l) => l.completed).length;
    const completionRate = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>);
    }

    return (
        <div className="space-y-4 pb-24 md:pb-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 text-white"><CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /></div>
                    Habits
                </h1>
                <button onClick={openAddForm} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm">
                    <Plus className="w-4 h-4" /><span className="hidden sm:inline">New</span>
                </button>
            </div>

            {/* View Mode Tabs - Grid layout to prevent overflow */}
            <div className="grid grid-cols-4 gap-1.5">
                {[{ id: "today", label: "Today", icon: Target }, { id: "all", label: "All", icon: List }, { id: "history", label: "History", icon: History }, { id: "archived", label: "Archive", icon: Archive }].map((tab) => (
                    <button key={tab.id} onClick={() => setViewMode(tab.id as ViewMode)} className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === tab.id ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-secondary"}`}>
                        <tab.icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* History Date Navigation */}
            {viewMode === "history" && (
                <div className="flex items-center justify-between bg-card border border-border rounded-xl p-2">
                    <button onClick={() => goToHistoryDate(-1)} className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="text-center"><p className="font-semibold text-sm">{format(parseISO(historyDate), "EEE, MMM d")}</p>{historyDate === today && <span className="text-xs text-green-500">Today</span>}</div>
                    <button onClick={() => goToHistoryDate(1)} disabled={historyDate >= today} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
                </div>
            )}

            {/* Progress Card */}
            {viewMode === "today" && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{completedCount}/{habits.length} done</span>
                        <div className="flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" /><span className="font-bold text-orange-500">{completionRate}%</span></div>
                    </div>
                    <div className="h-2 bg-green-500/20 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all" style={{ width: `${completionRate}%` }} /></div>
                </div>
            )}

            {/* Habits List */}
            {habits.length === 0 ? (
                <div className="text-center py-10"><div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3"><CheckCircle2 className="w-7 h-7 text-green-500/50" /></div><p className="text-muted-foreground text-sm">{viewMode === "archived" ? "No archived habits" : "No habits here"}</p></div>
            ) : (
                <div className="space-y-2">
                    {habits.map((habit) => {
                        const log = currentLogs.get(habit.id);
                        const isCompleted = log?.completed ?? false;
                        const canToggle = viewMode === "today";
                        return (
                            <div key={habit.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${isCompleted ? "bg-green-500/10 border-green-500/30" : "bg-card border-border"}`}>
                                <button onClick={() => canToggle && toggleHabit(habit.id)} disabled={!canToggle} className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isCompleted ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white" : canToggle ? "border-2 active:scale-95" : "border-2 opacity-50"}`} style={!isCompleted ? { borderColor: habit.color + "60", backgroundColor: habit.color + "10" } : undefined}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-lg">{habit.icon}</span>}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold text-sm truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{habit.name}</p>
                                    {habit.targetDays && habit.targetDays.length < 7 && (
                                        <div className="flex gap-0.5 mt-0.5">{habit.targetDays.map(d => (<span key={d} className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary">{WEEKDAYS[d]}</span>))}</div>
                                    )}
                                </div>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: habit.color }} />
                                    <button onClick={() => openEditForm(habit)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><Edit className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => toggleArchive(habit.id, habit.isArchived)} className="p-1 rounded hover:bg-secondary text-muted-foreground">{habit.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}</button>
                                    <button onClick={() => deleteHabit(habit.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border rounded-t-2xl">
                            <h2 className="text-lg font-bold">{editingHabit ? "Edit Habit" : "✨ New Habit"}</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1.5">Name</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Morning Exercise..." className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-green-500 outline-none text-sm" required autoFocus /></div>
                            <div><label className="block text-sm font-semibold mb-2">Days</label><div className="grid grid-cols-7 gap-1">{WEEKDAYS_FULL.map((day, i) => (<button key={day} type="button" onClick={() => toggleDay(i)} className={`py-2 rounded-lg font-medium text-xs transition-all ${formDays.includes(i) ? "bg-green-500 text-white" : "bg-secondary"}`}>{WEEKDAYS[i]}</button>))}</div></div>
                            <div><label className="block text-sm font-semibold mb-2">Icon</label><div className="grid grid-cols-10 gap-1">{HABIT_ICONS.map((icon) => (<button key={icon} type="button" onClick={() => setFormIcon(icon)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${formIcon === icon ? "bg-green-500/20 ring-2 ring-green-500" : "bg-secondary"}`}>{icon}</button>))}</div></div>
                            <div><label className="block text-sm font-semibold mb-2">Color</label><div className="flex flex-wrap gap-2">{HABIT_COLORS.map((color) => (<button key={color} type="button" onClick={() => setFormColor(color)} className={`w-7 h-7 rounded-full transition-all ${formColor === color ? "ring-4 ring-offset-2 ring-offset-background scale-110" : ""}`} style={{ backgroundColor: color, ["--tw-ring-color" as string]: color } as React.CSSProperties} />))}</div></div>
                            <div className="flex gap-2 pt-2 pb-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-semibold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold">{editingHabit ? "Save" : "Create"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
