"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WaterLog } from "@/types";
import { Droplets, Plus, X, ChevronLeft, ChevronRight, Target, TrendingUp } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const QUICK_AMOUNTS = [
    { label: "Glass", amount: 250, emoji: "🥛" },
    { label: "Bottle", amount: 500, emoji: "🍶" },
    { label: "Large", amount: 750, emoji: "💧" },
    { label: "1 Liter", amount: 1000, emoji: "🫗" },
];

const DAILY_GOAL = 2500; // ml

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

            // Load weekly data
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

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const goToDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const addWater = async (amount: number) => {
        if (!user || amount <= 0 || selectedDate !== today) return;

        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const log: WaterLog = {
                id: generateId(),
                userId: user.id,
                date: today,
                amount,
                time: format(new Date(), "HH:mm"),
                createdAt: now,
                updatedAt: now,
                syncStatus: "pending",
                version: 1,
            };
            await db.waterLogs.add(log);

            const newTotal = totalIntake + amount;
            if (newTotal >= DAILY_GOAL && totalIntake < DAILY_GOAL) {
                toast({ title: "Goal reached! 🎉", description: "You've hit your daily water goal!" });
            } else {
                toast({ title: `+${amount}ml added 💧` });
            }

            setCustomAmount("");
            loadLogs();
        } catch (error) {
            console.error("Failed to add water log:", error);
            toast({ title: "Failed to log water", variant: "destructive" });
        }
    };

    const deleteLog = async (logId: string) => {
        if (!user || selectedDate !== today) return;
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
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white">
                        <Droplets className="w-5 h-5" />
                    </div>
                    Water
                </h1>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-card border-2 border-border rounded-xl p-3">
                <button onClick={() => goToDate(-1)} className="p-2 rounded-lg hover:bg-secondary">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="font-semibold">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-xs text-blue-500">Today</span>}
                </div>
                <button
                    onClick={() => goToDate(1)}
                    disabled={selectedDate >= today}
                    className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Progress Circle */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-center mb-4">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="none"
                                className="text-blue-500/20"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="url(#waterGradient)"
                                strokeWidth="12"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 56}`}
                                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{(totalIntake / 1000).toFixed(1)}L</span>
                            <span className="text-xs text-muted-foreground">of {DAILY_GOAL / 1000}L</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">
                        {progress >= 100 ? "Goal achieved! 🎉" : `${Math.round(progress)}% complete`}
                    </span>
                </div>
            </div>

            {/* Quick Add Buttons (only for today) */}
            {selectedDate === today && (
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                        {QUICK_AMOUNTS.map((item) => (
                            <button
                                key={item.amount}
                                onClick={() => addWater(item.amount)}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border-2 border-border hover:border-blue-500/50 transition-all"
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
                            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-blue-500 outline-none text-sm"
                        />
                        <button
                            onClick={() => addWater(parseInt(customAmount) || 0)}
                            disabled={!customAmount}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Weekly Chart */}
            <div className="bg-card border-2 border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold">This Week</span>
                </div>
                <div className="flex items-end justify-between h-24 gap-1">
                    {weeklyData.map((day) => {
                        const heightPercent = day.amount > 0 ? (day.amount / DAILY_GOAL) * 100 : 0;
                        const isSelected = day.date === selectedDate;
                        const isToday = day.date === today;

                        return (
                            <button
                                key={day.date}
                                onClick={() => setSelectedDate(day.date)}
                                className="flex-1 flex flex-col items-center gap-1"
                            >
                                <div className="w-full h-20 bg-secondary rounded-lg flex items-end overflow-hidden">
                                    <div
                                        className={`w-full rounded-t-lg transition-all ${isSelected
                                            ? "bg-gradient-to-t from-blue-600 to-cyan-500"
                                            : "bg-gradient-to-t from-blue-500/60 to-cyan-400/60"
                                            }`}
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

            {/* Today's Logs */}
            <div className="bg-card border-2 border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Log History</h3>
                {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No water logged for this day</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{log.amount}ml</span>
                                    <span className="text-xs text-muted-foreground">{log.time}</span>
                                </div>
                                {selectedDate === today && (
                                    <button
                                        onClick={() => deleteLog(log.id)}
                                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="w-3 h-3" />
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
