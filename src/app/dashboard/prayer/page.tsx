"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { getUserDatabase } from "@/lib/db/database";
import { getToday, generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Prayer, PrayerType } from "@/types";
import { Moon, Sun, Sunset, Cloud, Star, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format, addDays, subDays, parseISO, startOfWeek, endOfWeek } from "date-fns";

const PRAYERS: { key: PrayerType; name: string; icon: React.ElementType; time: string; color: string }[] = [
    { key: "fajr", name: "Fajr", icon: Sun, time: "Dawn", color: "from-amber-400 to-orange-500" },
    { key: "dhuhr", name: "Dhuhr", icon: Cloud, time: "Noon", color: "from-yellow-400 to-amber-500" },
    { key: "asr", name: "Asr", icon: Sunset, time: "Afternoon", color: "from-orange-400 to-red-500" },
    { key: "maghrib", name: "Maghrib", icon: Moon, time: "Sunset", color: "from-purple-400 to-pink-500" },
    { key: "isha", name: "Isha", icon: Star, time: "Night", color: "from-indigo-400 to-purple-500" },
];

export default function PrayerPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [prayer, setPrayer] = useState<Prayer | null>(null);
    const [weeklyData, setWeeklyData] = useState<Map<string, Prayer>>(new Map());
    const [loading, setLoading] = useState(true);

    const today = getToday();
    const minDate = format(subDays(new Date(), 2), "yyyy-MM-dd");

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const todayPrayer = await db.prayers.where("date").equals(selectedDate).first();
            setPrayer(todayPrayer || null);

            const weekStart = format(startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 }), "yyyy-MM-dd");
            const weekEnd = format(endOfWeek(parseISO(selectedDate), { weekStartsOn: 0 }), "yyyy-MM-dd");
            const weekPrayers = await db.prayers.where("date").between(weekStart, weekEnd, true, true).toArray();

            const weekMap = new Map<string, Prayer>();
            weekPrayers.forEach((p) => weekMap.set(p.date, p));
            setWeeklyData(weekMap);
        } catch (error) {
            console.error("Failed to load prayers:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate]);

    useEffect(() => { loadData(); }, [loadData]);

    const togglePrayer = async (prayerType: PrayerType) => {
        if (!user) return;
        if (selectedDate < minDate) {
            toast({ title: "Cannot modify old entries", description: "Limited to 2 days back", variant: "destructive" });
            return;
        }
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            if (prayer) {
                await db.prayers.update(prayer.id, { [prayerType]: !prayer[prayerType], updatedAt: now });
                setPrayer({ ...prayer, [prayerType]: !prayer[prayerType], updatedAt: now });
            } else {
                const newPrayer: Prayer = {
                    id: generateId(), userId: user.id, date: selectedDate,
                    fajr: prayerType === "fajr", dhuhr: prayerType === "dhuhr", asr: prayerType === "asr",
                    maghrib: prayerType === "maghrib", isha: prayerType === "isha",
                    createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
                };
                await db.prayers.add(newPrayer);
                setPrayer(newPrayer);
            }
            loadData();
        } catch (error) {
            console.error("Failed to toggle prayer:", error);
        }
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
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                        <Moon className="w-6 h-6" />
                    </div>
                    Namaz Tracker
                </h1>
                <p className="text-muted-foreground mt-1">Track your daily Salah and build consistency</p>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-card border-2 border-border rounded-2xl p-4">
                <button onClick={() => goToDate(-1)} disabled={selectedDate <= minDate} className="p-3 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="font-bold text-lg">{format(parseISO(selectedDate), "EEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-sm text-purple-500">Today</span>}
                    {!canEdit && <span className="text-xs text-destructive block">Read only</span>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-3 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Weekly Overview - Grid layout, no horizontal scroll */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
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
                            className={`p-1.5 md:p-3 rounded-lg md:rounded-xl text-center transition-all ${isSelected ? "bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30"
                                    : isToday ? "bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500"
                                        : isDisabled ? "bg-secondary/50 opacity-40" : "bg-card border-2 border-border hover:border-purple-500/50"
                                }`}
                        >
                            <p className="text-[10px] md:text-xs font-medium">{format(parseISO(day), "EEE")}</p>
                            <p className="text-sm md:text-lg font-bold">{format(parseISO(day), "d")}</p>
                            <div className="flex justify-center gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${i < dayCount ? (isSelected ? "bg-white" : "bg-purple-500") : (isSelected ? "bg-white/30" : "bg-muted")}`} />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Progress */}
            <div className="bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">Today&apos;s Progress</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">
                        {completedCount}/5
                    </span>
                </div>
                <div className="h-4 bg-purple-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${(completedCount / 5) * 100}%` }} />
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center flex items-center justify-center gap-2">
                    {completedCount === 5 ? (
                        <>
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className="text-purple-500 font-medium">Masha&apos;Allah! All prayers completed! 🌟</span>
                        </>
                    ) : completedCount === 0 ? "Start your prayers for today" : `${5 - completedCount} prayer${5 - completedCount > 1 ? "s" : ""} remaining`}
                </p>
            </div>

            {/* Prayer List */}
            <div className="grid gap-3">
                {PRAYERS.map((p) => {
                    const isCompleted = prayer?.[p.key] ?? false;
                    const Icon = p.icon;
                    return (
                        <button
                            key={p.key}
                            onClick={() => togglePrayer(p.key)}
                            disabled={!canEdit}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isCompleted ? "bg-gradient-to-r from-purple-500/10 to-violet-500/5 border-purple-500/40"
                                    : canEdit ? "bg-card border-border hover:border-purple-500/50 hover:shadow-lg" : "bg-secondary/50 border-border opacity-60 cursor-not-allowed"
                                }`}
                        >
                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center transition-all ${isCompleted ? `bg-gradient-to-br ${p.color} text-white shadow-lg` : "bg-secondary"}`}>
                                <Icon className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className={`font-bold text-base md:text-lg ${isCompleted ? "text-purple-600 dark:text-purple-400" : ""}`}>{p.name}</h3>
                                <p className="text-sm text-muted-foreground">{p.time}</p>
                            </div>
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-gradient-to-br from-purple-500 to-violet-600 border-transparent text-white" : "border-muted-foreground/30"}`}>
                                {isCompleted && <Check className="w-4 h-4 md:w-5 md:h-5" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Info Note */}
            <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ You can only log prayers for today and the past 2 days to maintain authenticity
                </p>
            </div>
        </div>
    );
}
