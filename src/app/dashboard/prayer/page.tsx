"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { getToday, generateId } from "@/lib/utils";
import type { Prayer, PrayerType } from "@/types";
import { Moon, Sun, Sunset, Cloud, Star, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, parseISO, startOfWeek } from "date-fns";

const PRAYERS: { key: PrayerType; name: string; icon: React.ElementType; time: string }[] = [
    { key: "fajr", name: "Fajr", icon: Sun, time: "Dawn" },
    { key: "dhuhr", name: "Dhuhr", icon: Cloud, time: "Noon" },
    { key: "asr", name: "Asr", icon: Sunset, time: "Afternoon" },
    { key: "maghrib", name: "Maghrib", icon: Moon, time: "Sunset" },
    { key: "isha", name: "Isha", icon: Star, time: "Night" },
];

export default function PrayerPage() {
    const { user } = useUser();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [prayer, setPrayer] = useState<Prayer | null>(null);
    const [weeklyData, setWeeklyData] = useState<Map<string, Prayer>>(new Map());
    const [loading, setLoading] = useState(true);
    const pendingUpdates = useRef<Set<string>>(new Set());
    const previousDateRef = useRef<string>(selectedDate);

    const today = getToday();
    const minDate = format(subDays(new Date(), 2), "yyyy-MM-dd");

    // CRITICAL: Clear prayer state when date changes to prevent auto-tick appearance
    useEffect(() => {
        if (previousDateRef.current !== selectedDate) {
            // Date changed - immediately clear state to show unchecked until loaded
            setPrayer(null);
            setLoading(true);
            previousDateRef.current = selectedDate;
        }
    }, [selectedDate]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);

            // Load prayer for the SPECIFIC selected date only
            const datePrayer = await db.prayers.where("date").equals(selectedDate).first();
            // Only set prayer if it exists for THIS date, otherwise null (all unchecked)
            setPrayer(datePrayer || null);

            const weekStart = format(startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 }), "yyyy-MM-dd");
            const weekPrayers = await db.prayers.where("date").between(weekStart, today, true, true).toArray();
            const weekMap = new Map<string, Prayer>();
            weekPrayers.forEach((p) => weekMap.set(p.date, p));
            setWeeklyData(weekMap);
        } catch (error) {
            console.error("Failed to load prayers:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate, today]);

    useEffect(() => { loadData(); }, [loadData]);

    const togglePrayer = (prayerType: PrayerType) => {
        if (!user || selectedDate < minDate) return;
        if (pendingUpdates.current.has(prayerType)) return;

        const currentValue = prayer?.[prayerType] ?? false;
        const newValue = !currentValue;

        // INSTANT UI UPDATE using flushSync for synchronous render
        flushSync(() => {
            setPrayer((prev) => {
                if (prev) return { ...prev, [prayerType]: newValue };
                return {
                    id: "temp-" + Date.now(), userId: user.id, date: selectedDate,
                    fajr: prayerType === "fajr" ? newValue : false,
                    dhuhr: prayerType === "dhuhr" ? newValue : false,
                    asr: prayerType === "asr" ? newValue : false,
                    maghrib: prayerType === "maghrib" ? newValue : false,
                    isha: prayerType === "isha" ? newValue : false,
                    createdAt: Date.now(), updatedAt: Date.now(), syncStatus: "pending", version: 1,
                } as Prayer;
            });
        });

        // Background DB update (non-blocking)
        pendingUpdates.current.add(prayerType);
        const updateDb = async () => {
            try {
                const db = getUserDatabase(user.id);
                const now = Date.now();
                const existingPrayer = await db.prayers.where("date").equals(selectedDate).first();

                if (existingPrayer) {
                    await db.prayers.update(existingPrayer.id, { [prayerType]: newValue, updatedAt: now });
                    setPrayer(prev => prev ? { ...prev, id: existingPrayer.id } : prev);
                } else {
                    const newPrayer: Prayer = {
                        id: generateId(), userId: user.id, date: selectedDate,
                        fajr: prayerType === "fajr", dhuhr: prayerType === "dhuhr", asr: prayerType === "asr",
                        maghrib: prayerType === "maghrib", isha: prayerType === "isha",
                        createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
                    };
                    await db.prayers.add(newPrayer);
                    setPrayer(prev => prev ? { ...prev, id: newPrayer.id } : newPrayer);
                }
                // Sync prayers to cloud
                syncToCloud(user.id, "prayers");
            } catch (error) {
                console.error("Failed to toggle prayer:", error);
                loadData(); // Revert on error
            } finally {
                pendingUpdates.current.delete(prayerType);
            }
        };
        updateDb();
    };

    const completedCount = prayer ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length : 0;
    const canEdit = selectedDate >= minDate;

    const goToDate = (days: number) => {
        const newDate = days > 0 ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd") : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate < minDate || newDate > today) return;
        setSelectedDate(newDate);
    };

    const weekDays: string[] = [];
    const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) weekDays.push(format(addDays(weekStart, i), "yyyy-MM-dd"));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-slate-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {/* Header - Slate Purple Matte */}
            <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-purple-700/80 text-white shadow-lg">
                        <Moon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Namaz</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Track your daily Salah</p>
                    </div>
                </div>
                <div className="text-right bg-gradient-to-br from-slate-100 to-purple-50 dark:from-slate-800/50 dark:to-purple-900/30 px-4 py-2 rounded-xl">
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{completedCount}<span className="text-lg text-slate-400">/5</span></p>
                </div>
            </div>

            {/* Date Navigation - Matte Card */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-900/50 dark:to-purple-900/20 rounded-2xl p-3 border border-slate-200 dark:border-slate-700">
                <button onClick={() => goToDate(-1)} disabled={selectedDate <= minDate} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Today</span>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
            </div>

            {/* Week View - Minimal Matte */}
            <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                    const dayPrayer = weeklyData.get(day);
                    const dayCount = dayPrayer ? [dayPrayer.fajr, dayPrayer.dhuhr, dayPrayer.asr, dayPrayer.maghrib, dayPrayer.isha].filter(Boolean).length : 0;
                    const isSelected = day === selectedDate;
                    const isToday = day === today;
                    const isDisabled = day > today || day < minDate;

                    return (
                        <button
                            key={day}
                            onClick={() => !isDisabled && setSelectedDate(day)}
                            disabled={isDisabled}
                            className={`py-2.5 rounded-xl text-center transition-all ${isSelected ? "bg-gradient-to-br from-slate-600 to-purple-700 text-white shadow-lg" : isToday ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : isDisabled ? "opacity-30" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                        >
                            <p className="text-[10px] font-medium opacity-70">{format(parseISO(day), "EEE")}</p>
                            <p className="text-sm font-bold">{format(parseISO(day), "d")}</p>
                            <div className="flex justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-1 h-1 rounded-full ${i < dayCount ? (isSelected ? "bg-white" : "bg-purple-500") : "bg-slate-300 dark:bg-slate-600"}`} />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Progress Bar - Matte */}
            <div className="bg-gradient-to-r from-slate-100 to-purple-100 dark:from-slate-800/50 dark:to-purple-900/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-slate-500 to-purple-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${(completedCount / 5) * 100}%` }} />
                </div>
                <p className="text-sm text-center mt-3 text-slate-600 dark:text-slate-400 font-medium">
                    {completedCount === 5 ? "✨ All prayers completed!" : `${5 - completedCount} remaining`}
                </p>
            </div>

            {/* Prayer List - Premium Matte Cards */}
            <div className="space-y-2.5">
                {PRAYERS.map((p) => {
                    const isCompleted = prayer?.[p.key] ?? false;
                    const Icon = p.icon;
                    return (
                        <button
                            key={p.key}
                            onClick={() => togglePrayer(p.key)}
                            disabled={!canEdit}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] border ${isCompleted
                                ? "bg-gradient-to-r from-slate-100 to-purple-100 dark:from-slate-800/80 dark:to-purple-900/40 border-purple-300 dark:border-purple-700"
                                : canEdit ? "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600" : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-50"
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isCompleted ? "bg-gradient-to-br from-slate-600 to-purple-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{p.time}</p>
                            </div>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isCompleted ? "bg-purple-600 text-white" : "border-2 border-slate-300 dark:border-slate-600"}`}>
                                {isCompleted && <Check className="w-4 h-4" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            {!canEdit && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 py-2 rounded-xl">⚠️ Can only edit past 2 days</p>
            )}
        </div>
    );
}

