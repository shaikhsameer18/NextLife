"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SleepLog } from "@/types";
import { Bed, Moon, Sun, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, addDays, subDays, differenceInMinutes, parse } from "date-fns";

const QUALITY_EMOJIS = ["", "😴", "😕", "😐", "🙂", "😄"];
const QUALITY_LABELS = ["", "Terrible", "Poor", "Fair", "Good", "Amazing"];
const QUALITY_COLORS = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-emerald-500"];

export default function SleepPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [sleepLog, setSleepLog] = useState<SleepLog | null>(null);
    const [weeklyLogs, setWeeklyLogs] = useState<SleepLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Track when user explicitly changes values to prevent resetting
    const previousDateRef = useRef<string>(selectedDate);
    const isInitialLoadRef = useRef(true);

    const [bedtime, setBedtime] = useState("22:00");
    const [wakeTime, setWakeTime] = useState("06:00");
    const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);

    const today = getToday();

    // Reset to defaults ONLY when date changes
    useEffect(() => {
        if (previousDateRef.current !== selectedDate) {
            // Date changed - reset form state
            setSleepLog(null);
            setBedtime("22:00");
            setWakeTime("06:00");
            setQuality(3);
            setLoading(true);
            previousDateRef.current = selectedDate;
        }
    }, [selectedDate]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const log = await db.sleepLogs.where("date").equals(selectedDate).first();
            setSleepLog(log || null);

            // Only set form values from log if it exists - don't reset to defaults here
            // Defaults are set when date changes in the useEffect above
            if (log) {
                setBedtime(log.bedtime);
                setWakeTime(log.wakeTime);
                setQuality(log.quality);
            }

            const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
            const logs = await db.sleepLogs.toArray();
            setWeeklyLogs(logs.filter(l => l.date >= weekAgo && l.date <= today));
        } catch (error) {
            console.error("Failed to load sleep data:", error);
        } finally {
            setLoading(false);
            isInitialLoadRef.current = false;
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
                <div className="w-8 h-8 border-3 border-slate-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {/* Header - Deep Navy Matte */}
            <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-700 to-indigo-800 text-white shadow-lg">
                        <Bed className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sleep</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Track your rest</p>
                    </div>
                </div>
                <div className="text-right bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/30 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{Math.floor(avgDuration / 60)}<span className="text-lg text-slate-400">h</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">avg/night</p>
                </div>
            </div>

            {/* Date Navigation - Matte Card */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900/50 dark:to-indigo-900/20 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Today</span>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            {/* Stats Row - Matte */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Avg Duration</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{Math.floor(avgDuration / 60)}h {Math.round(avgDuration % 60)}m</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{QUALITY_EMOJIS[Math.round(avgQuality)] || "😐"}</span>
                        <span className="text-sm text-amber-700 dark:text-amber-400">Avg Quality</span>
                    </div>
                    <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{avgQuality.toFixed(1)}/5</p>
                </div>
            </div>

            {/* Weekly Chart - Matte */}
            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold mb-4 text-slate-700 dark:text-slate-200">This Week</p>
                <div className="flex items-end justify-between gap-2 h-24 mb-3">
                    {chartData.map((day) => {
                        const heightPercent = day.duration > 0 ? (day.duration / 600) * 100 : 0;
                        const isToday = day.date === today;
                        return (
                            <div key={day.date} className="flex-1 flex flex-col items-center">
                                <div className="w-full flex items-end h-20">
                                    {day.hasData ? (
                                        <div className={`w-full rounded-t-xl ${isToday ? "bg-gradient-to-t from-indigo-600 to-slate-500" : "bg-slate-400/60 dark:bg-slate-600/60"}`} style={{ height: Math.max(heightPercent, 8) }} />
                                    ) : (
                                        <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-t-xl" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between gap-2 mb-2">
                    {chartData.map((day) => (
                        <div key={`q-${day.date}`} className="flex-1 flex justify-center">
                            {day.hasData && <div className={`w-3 h-3 rounded-full ${QUALITY_COLORS[day.quality]}`} />}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between gap-2">
                    {chartData.map((day) => (
                        <span key={`l-${day.date}`} className={`flex-1 text-center text-[10px] font-medium ${day.date === today ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`}>
                            {format(parseISO(day.date), "EEE")}
                        </span>
                    ))}
                </div>
            </div>

            {/* Sleep Input - Premium Matte Card */}
            <div className="bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900/50 dark:to-indigo-950/30 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-5">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Log Sleep</p>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">
                            <Moon className="w-4 h-4 text-indigo-500" />Bedtime
                        </label>
                        <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-base font-semibold focus:ring-2 ring-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium mb-2 text-slate-600 dark:text-slate-400">
                            <Sun className="w-4 h-4 text-amber-500" />Wake Up
                        </label>
                        <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-base font-semibold focus:ring-2 ring-indigo-500 outline-none" />
                    </div>
                </div>

                {/* Duration */}
                <div className="text-center py-4 rounded-2xl bg-gradient-to-r from-slate-100 to-indigo-100 dark:from-slate-800/50 dark:to-indigo-900/30 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                    <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">{hours}h {minutes}m</p>
                </div>

                {/* Quality */}
                <div>
                    <p className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Quality</p>
                    <div className="grid grid-cols-5 gap-2">
                        {([1, 2, 3, 4, 5] as const).map((q) => (
                            <button key={q} onClick={() => setQuality(q)} className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95 border-2 ${quality === q ? "bg-gradient-to-br from-slate-600 to-indigo-700 text-white border-indigo-500" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-indigo-400"}`}>
                                <span className="text-xl">{QUALITY_EMOJIS[q]}</span>
                                <span className="text-[9px] font-medium">{QUALITY_LABELS[q]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save */}
                <button onClick={saveSleep} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-slate-600 to-indigo-700 text-white font-semibold active:scale-[0.98] transition-transform shadow-lg">
                    {sleepLog ? "Update" : "Log"} Sleep 🌙
                </button>
            </div>
        </div>
    );
}

