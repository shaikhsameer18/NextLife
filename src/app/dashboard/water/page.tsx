"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WaterLog } from "@/types";
import { Droplets, Plus, X, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const QUICK_AMOUNTS = [
    { label: "Glass", amount: 250, emoji: "🥛" },
    { label: "Bottle", amount: 500, emoji: "🍶" },
    { label: "Large", amount: 750, emoji: "💧" },
    { label: "1L", amount: 1000, emoji: "🫗" },
];

const DAILY_GOAL = 2500;

export default function WaterPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [logs, setLogs] = useState<WaterLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [customAmount, setCustomAmount] = useState("");
    const [weeklyData, setWeeklyData] = useState<{ date: string; amount: number }[]>([]);

    const today = getToday();

    const loadLogs = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const dayLogs = await db.waterLogs.where("date").equals(selectedDate).toArray();
            setLogs(dayLogs.sort((a, b) => b.time.localeCompare(a.time)));

            const weekData = [];
            for (let i = 6; i >= 0; i--) {
                const date = format(subDays(new Date(), i), "yyyy-MM-dd");
                const dateLogs = await db.waterLogs.where("date").equals(date).toArray();
                const total = dateLogs.reduce((sum, l) => sum + l.amount, 0);
                weekData.push({ date, amount: total });
            }
            setWeeklyData(weekData);
        } catch (error) {
            console.error("Failed to load water logs:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const goToDate = (days: number) => {
        const newDate = days > 0 ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd") : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const addWater = async (amount: number) => {
        if (!user || amount <= 0 || selectedDate !== today) return;

        // Optimistic update
        const tempLog: WaterLog = {
            id: "temp-" + Date.now(),
            userId: user.id,
            date: today,
            amount,
            time: format(new Date(), "HH:mm"),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            syncStatus: "pending",
            version: 1,
        };
        setLogs(prev => [tempLog, ...prev]);

        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const log: WaterLog = { ...tempLog, id: generateId(), createdAt: now, updatedAt: now };
            await db.waterLogs.add(log);

            const newTotal = totalIntake + amount;
            if (newTotal >= DAILY_GOAL && totalIntake < DAILY_GOAL) {
                toast({ title: "🎉 Goal reached!" });
            } else {
                toast({ title: `+${amount}ml 💧` });
            }

            setCustomAmount("");
            loadLogs();
        } catch (error) {
            console.error("Failed to add water log:", error);
            setLogs(prev => prev.filter(l => l.id !== tempLog.id));
        }
    };

    const deleteLog = async (logId: string) => {
        if (!user || selectedDate !== today) return;
        setLogs(prev => prev.filter(l => l.id !== logId));
        try {
            const db = getUserDatabase(user.id);
            await db.waterLogs.delete(logId);
            loadLogs();
        } catch (error) {
            console.error("Failed to delete log:", error);
        }
    };

    const totalIntake = logs.reduce((sum, l) => sum + l.amount, 0);
    const progress = Math.min((totalIntake / DAILY_GOAL) * 100, 100);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {/* Header - Ocean Teal Matte */}
            <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-lg">
                        <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Water</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Stay hydrated</p>
                    </div>
                </div>
                <div className="text-right bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{(totalIntake / 1000).toFixed(1)}<span className="text-lg text-teal-500">L</span></p>
                    <p className="text-xs text-teal-600 dark:text-teal-400">of {DAILY_GOAL / 1000}L</p>
                </div>
            </div>

            {/* Date Navigation - Matte */}
            <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 rounded-2xl p-3 border border-teal-200 dark:border-teal-800">
                <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-teal-900/50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">Today</span>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-teal-900/50 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                </button>
            </div>

            {/* Progress Ring - Matte */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 rounded-2xl p-5 border border-teal-200 dark:border-teal-800">
                <div className="flex items-center justify-center mb-4">
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="none" className="text-teal-200 dark:text-teal-900" />
                            <circle
                                cx="56" cy="56" r="48"
                                stroke="url(#waterGradMatte)"
                                strokeWidth="10"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 48}`}
                                strokeDashoffset={`${2 * Math.PI * 48 * (1 - progress / 100)}`}
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="waterGradMatte" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#0d9488" />
                                    <stop offset="100%" stopColor="#0891b2" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">{Math.round(progress)}%</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                    <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{progress >= 100 ? "Goal achieved! 🎉" : `${DAILY_GOAL - totalIntake}ml to go`}</span>
                </div>
            </div>

            {/* Quick Add */}
            {selectedDate === today && (
                <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                        {QUICK_AMOUNTS.map((item) => (
                            <button
                                key={item.amount}
                                onClick={() => addWater(item.amount)}
                                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-card border border-border hover:border-blue-500/50 active:scale-95 transition-all"
                            >
                                <span className="text-lg">{item.emoji}</span>
                                <span className="text-xs font-semibold">{item.amount}ml</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="Custom ml"
                            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary text-sm focus:ring-2 ring-blue-500 outline-none"
                        />
                        <button
                            onClick={() => addWater(parseInt(customAmount) || 0)}
                            disabled={!customAmount}
                            className="px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Weekly Chart */}
            <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-sm font-medium mb-3">This Week</p>
                <div className="flex items-end justify-between h-20 gap-1">
                    {weeklyData.map((day) => {
                        const heightPercent = day.amount > 0 ? (day.amount / DAILY_GOAL) * 100 : 0;
                        const isSelected = day.date === selectedDate;
                        const isToday = day.date === today;
                        return (
                            <button key={day.date} onClick={() => setSelectedDate(day.date)} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full h-16 bg-secondary rounded-lg flex items-end overflow-hidden">
                                    <div
                                        className={`w-full rounded-t-lg transition-all ${isSelected ? "bg-gradient-to-t from-blue-600 to-cyan-500" : "bg-blue-500/50"}`}
                                        style={{ height: `${Math.min(heightPercent, 100)}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-medium ${isToday ? "text-blue-500" : "text-muted-foreground"}`}>
                                    {format(parseISO(day.date), "EEE")}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Log History */}
            <div className="bg-card rounded-xl p-3 border border-border">
                <p className="text-sm font-medium mb-2">History</p>
                {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No logs</p>
                ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium text-sm">{log.amount}ml</span>
                                    <span className="text-xs text-muted-foreground">{log.time}</span>
                                </div>
                                {selectedDate === today && (
                                    <button onClick={() => deleteLog(log.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
