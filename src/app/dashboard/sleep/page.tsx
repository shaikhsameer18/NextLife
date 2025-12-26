"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SleepLog } from "@/types";
import { Bed, Moon, Sun, Clock, TrendingUp, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, parseISO, addDays, subDays, differenceInMinutes, parse } from "date-fns";

const QUALITY_LABELS = ["", "Terrible", "Poor", "Fair", "Good", "Amazing"];
const QUALITY_EMOJIS = ["", "😴", "😕", "😐", "🙂", "😄"];
const QUALITY_COLORS = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];

export default function SleepPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [sleepLog, setSleepLog] = useState<SleepLog | null>(null);
    const [weeklyLogs, setWeeklyLogs] = useState<SleepLog[]>([]);
    const [loading, setLoading] = useState(true);

    const [bedtime, setBedtime] = useState("22:00");
    const [wakeTime, setWakeTime] = useState("06:00");
    const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);

    const today = getToday();

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const log = await db.sleepLogs.where("date").equals(selectedDate).first();
            setSleepLog(log || null);
            if (log) { setBedtime(log.bedtime); setWakeTime(log.wakeTime); setQuality(log.quality); }
            else { setBedtime("22:00"); setWakeTime("06:00"); setQuality(3); }
            const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
            const logs = await db.sleepLogs.toArray();
            setWeeklyLogs(logs.filter(l => l.date >= weekAgo && l.date <= today));
        } catch (error) {
            console.error("Failed to load sleep data:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate, today]);

    useEffect(() => { loadData(); }, [loadData]);

    const calculateDuration = (bed: string, wake: string): number => {
        const bedDate = parse(bed, "HH:mm", new Date());
        let wakeDate = parse(wake, "HH:mm", new Date());
        if (wakeDate <= bedDate) wakeDate = addDays(wakeDate, 1);
        return differenceInMinutes(wakeDate, bedDate);
    };

    const saveSleep = async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const duration = calculateDuration(bedtime, wakeTime);
            if (sleepLog) {
                await db.sleepLogs.update(sleepLog.id, { bedtime, wakeTime, duration, quality, updatedAt: now });
            } else {
                const log: SleepLog = { id: generateId(), userId: user.id, date: selectedDate, bedtime, wakeTime, duration, quality, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
                await db.sleepLogs.add(log);
            }
            toast({ title: "Sleep logged! 😴" });
            loadData();
        } catch (error) {
            console.error("Failed to save sleep:", error);
        }
    };

    const goToDate = (days: number) => {
        const newDate = days > 0 ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd") : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const duration = calculateDuration(bedtime, wakeTime);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const avgDuration = weeklyLogs.length > 0 ? weeklyLogs.reduce((sum, l) => sum + l.duration, 0) / weeklyLogs.length : 0;
    const avgQuality = weeklyLogs.length > 0 ? weeklyLogs.reduce((sum, l) => sum + l.quality, 0) / weeklyLogs.length : 0;

    const chartData: { date: string; duration: number; quality: number; hasData: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        const log = weeklyLogs.find(l => l.date === date);
        chartData.push({ date, duration: log?.duration || 0, quality: log?.quality || 0, hasData: !!log });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                        <Bed className="w-6 h-6" />
                    </div>
                    Sleep Tracker
                </h1>
                <p className="text-muted-foreground mt-1">Track your sleep patterns and improve your rest</p>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-card border-2 border-border rounded-2xl p-4">
                <button onClick={() => goToDate(-1)} className="p-3 rounded-xl hover:bg-secondary transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="font-bold text-lg">{format(parseISO(selectedDate), "EEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-sm text-indigo-500">Today</span>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-3 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Weekly Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <span className="text-sm text-muted-foreground">Avg Duration</span>
                    </div>
                    <p className="text-2xl font-bold">{Math.floor(avgDuration / 60)}h {Math.round(avgDuration % 60)}m</p>
                </div>
                <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-card border-2 border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-muted-foreground">Avg Quality</span>
                    </div>
                    <p className="text-2xl font-bold">{QUALITY_EMOJIS[Math.round(avgQuality)]} {avgQuality.toFixed(1)}/5</p>
                </div>
            </div>

            {/* Weekly Chart */}
            <div className="bg-card border-2 border-border rounded-2xl p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Weekly Sleep
                </h3>
                <div className="flex items-end justify-between gap-2 h-32 mb-3">
                    {chartData.map((day) => {
                        const maxHeight = 100;
                        const heightPercent = day.duration > 0 ? (day.duration / 600) * maxHeight : 0;
                        const isToday = day.date === today;
                        return (
                            <div key={day.date} className="flex-1 flex flex-col items-center">
                                <div className="w-full flex flex-col items-center" style={{ height: maxHeight }}>
                                    <div className="flex-1 w-full flex items-end">
                                        {day.hasData ? (
                                            <div className={`w-full rounded-t-lg transition-all ${isToday ? "bg-gradient-to-t from-indigo-600 to-purple-500" : "bg-gradient-to-t from-indigo-500/70 to-purple-400/70"}`} style={{ height: Math.max(heightPercent, 4) }} />
                                        ) : (
                                            <div className="w-full h-1 bg-muted rounded-t-lg" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Quality dots */}
                <div className="flex justify-between gap-2 mb-3">
                    {chartData.map((day) => {
                        const qualityColor = day.quality > 0 ? QUALITY_COLORS[day.quality] : "bg-transparent";
                        return (
                            <div key={`q-${day.date}`} className="flex-1 flex justify-center">
                                {day.hasData && <div className={`w-3.5 h-3.5 rounded-full ${qualityColor} shadow-sm`} />}
                            </div>
                        );
                    })}
                </div>
                {/* Day labels */}
                <div className="flex justify-between gap-2">
                    {chartData.map((day) => (
                        <span key={`l-${day.date}`} className={`flex-1 text-center text-xs font-medium ${day.date === today ? "text-indigo-500" : "text-muted-foreground"}`}>
                            {format(parseISO(day.date), "EEE")}
                        </span>
                    ))}
                </div>
            </div>

            {/* Sleep Input */}
            <div className="bg-card border-2 border-border rounded-2xl p-5 md:p-6 space-y-5">
                <h3 className="font-bold text-lg">Log Sleep</h3>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                            <Moon className="w-4 h-4 text-indigo-500" />Bedtime
                        </label>
                        <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-indigo-500 outline-none text-lg font-bold" />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                            <Sun className="w-4 h-4 text-yellow-500" />Wake Time
                        </label>
                        <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-indigo-500 outline-none text-lg font-bold" />
                    </div>
                </div>

                {/* Duration */}
                <div className="text-center py-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <p className="text-sm text-muted-foreground mb-1">Duration</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{hours}h {minutes}m</p>
                </div>

                {/* Quality */}
                <div>
                    <label className="block text-sm font-semibold mb-3">Sleep Quality</label>
                    <div className="grid grid-cols-5 gap-2">
                        {([1, 2, 3, 4, 5] as const).map((q) => (
                            <button key={q} onClick={() => setQuality(q)} className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${quality === q ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105" : "bg-secondary hover:bg-secondary/80"}`}>
                                <span className="text-2xl">{QUALITY_EMOJIS[q]}</span>
                                <span className="text-[10px] font-medium">{QUALITY_LABELS[q]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save */}
                <button onClick={saveSleep} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30">
                    {sleepLog ? "Update Sleep 😴" : "Log Sleep 🌙"}
                </button>
            </div>
        </div>
    );
}
