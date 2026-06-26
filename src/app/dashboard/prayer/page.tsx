"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { getToday, generateId } from "@/lib/utils";
import type { Prayer, PrayerType } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, parseISO, startOfWeek } from "date-fns";

const PRAYERS: {
    key: PrayerType;
    name: string;
    arabic: string;
    time: string;
    emoji: string;
    gradient: string;
    glow: string;
    bg: string;
}[] = [
    { key: "fajr",    name: "Fajr",    arabic: "الفجر",   time: "Pre-dawn",  emoji: "🌙", gradient: "from-indigo-600 via-purple-600 to-blue-700",   glow: "shadow-indigo-500/40",  bg: "from-indigo-950/60 to-purple-950/40" },
    { key: "dhuhr",   name: "Dhuhr",   arabic: "الظهر",   time: "Midday",    emoji: "☀️", gradient: "from-amber-500 via-orange-500 to-yellow-500",  glow: "shadow-amber-500/40",   bg: "from-amber-950/40 to-orange-950/30" },
    { key: "asr",     name: "Asr",     arabic: "العصر",   time: "Afternoon", emoji: "🌤️", gradient: "from-sky-500 via-cyan-500 to-teal-500",        glow: "shadow-sky-500/40",     bg: "from-sky-950/40 to-cyan-950/30" },
    { key: "maghrib", name: "Maghrib", arabic: "المغرب",  time: "Sunset",    emoji: "🌅", gradient: "from-rose-500 via-pink-500 to-orange-500",     glow: "shadow-rose-500/40",    bg: "from-rose-950/40 to-pink-950/30" },
    { key: "isha",    name: "Isha",    arabic: "العشاء",  time: "Night",     emoji: "⭐", gradient: "from-violet-600 via-purple-600 to-indigo-700", glow: "shadow-violet-500/40",  bg: "from-violet-950/60 to-indigo-950/40" },
];

const ARC_R = 52;
const ARC_CIRC = 2 * Math.PI * ARC_R;

export default function PrayerPage() {
    const { user } = useUser();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [prayer, setPrayer] = useState<Prayer | null>(null);
    const [weeklyData, setWeeklyData] = useState<Map<string, Prayer>>(new Map());
    const [loading, setLoading] = useState(true);
    const [justCompleted, setJustCompleted] = useState<PrayerType | null>(null);
    const pendingUpdates = useRef<Set<string>>(new Set());
    const previousDateRef = useRef<string>(selectedDate);

    const today = getToday();
    const minDate = format(subDays(new Date(), 2), "yyyy-MM-dd");

    useEffect(() => {
        if (previousDateRef.current !== selectedDate) {
            setPrayer(null);
            setLoading(true);
            previousDateRef.current = selectedDate;
        }
    }, [selectedDate]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const datePrayer = await db.prayers.where("date").equals(selectedDate).first();
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
    }, [user?.id, selectedDate, today]);

    useEffect(() => { loadData(); }, [loadData]);

    const togglePrayer = (prayerType: PrayerType) => {
        if (!user || selectedDate < minDate) return;
        if (pendingUpdates.current.has(prayerType)) return;

        const currentValue = prayer?.[prayerType] ?? false;
        const newValue = !currentValue;

        if (newValue) {
            setJustCompleted(prayerType);
            setTimeout(() => setJustCompleted(null), 800);
        }

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
                syncToCloud(user.id, "prayers");
            } catch (error) {
                console.error("Failed to toggle prayer:", error);
                loadData();
            } finally {
                pendingUpdates.current.delete(prayerType);
            }
        };
        updateDb();
    };

    const completedCount = prayer
        ? [prayer.fajr, prayer.dhuhr, prayer.asr, prayer.maghrib, prayer.isha].filter(Boolean).length
        : 0;
    const canEdit = selectedDate >= minDate;
    const allDone = completedCount === 5;

    const goToDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate < minDate || newDate > today) return;
        setSelectedDate(newDate);
    };

    const weekDays: string[] = [];
    const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 });
    for (let i = 0; i < 7; i++) weekDays.push(format(addDays(weekStart, i), "yyyy-MM-dd"));

    const arcProgress = (completedCount / 5) * ARC_CIRC;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div
                    className="w-12 h-12 rounded-full border-2 border-purple-500/30 border-t-purple-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    return (
        <div className="pb-6 space-y-5 relative overflow-x-hidden">
            {/* Ambient background blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl" />
            </div>

            {/* ── HERO HEADER ── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-3xl overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #302b63 70%, #24243e 100%)",
                }}
            >
                {/* Star field */}
                {[...Array(24)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
                            height: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
                            top: `${(i * 37 + 10) % 90}%`,
                            left: `${(i * 53 + 5) % 95}%`,
                        }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.15 }}
                    />
                ))}

                <div className="relative p-6 flex items-center gap-6">
                    {/* Arc progress */}
                    <div className="relative flex-shrink-0">
                        <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="64" cy="64" r={ARC_R} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                            <motion.circle
                                cx="64" cy="64" r={ARC_R}
                                stroke="url(#prayerArcGrad)"
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={ARC_CIRC}
                                initial={{ strokeDashoffset: ARC_CIRC }}
                                animate={{ strokeDashoffset: ARC_CIRC - arcProgress }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                            <defs>
                                <linearGradient id="prayerArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span
                                key={completedCount}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl font-black text-white"
                            >
                                {completedCount}
                            </motion.span>
                            <span className="text-xs text-white/50 font-medium">of 5</span>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-1">Daily Salah</p>
                        <h1 className="text-2xl font-black text-white mb-1">
                            {format(parseISO(selectedDate), "EEEE")}
                        </h1>
                        <p className="text-white/60 text-sm">{format(parseISO(selectedDate), "MMMM d, yyyy")}</p>
                        <AnimatePresence mode="wait">
                            {allDone ? (
                                <motion.div
                                    key="done"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                                >
                                    <span className="text-emerald-400 text-xs font-bold">✦ All prayers completed</span>
                                </motion.div>
                            ) : (
                                <motion.p
                                    key="remaining"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-3 text-white/40 text-sm"
                                >
                                    {5 - completedCount} remaining today
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* ── DATE NAV ── */}
            <div className="flex items-center gap-3">
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => goToDate(-1)}
                    disabled={selectedDate <= minDate}
                    className="p-2.5 rounded-xl bg-card border border-border hover:border-purple-500/50 disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </motion.button>

                {/* Week strip */}
                <div className="flex-1 grid grid-cols-7 gap-1">
                    {weekDays.map((day, idx) => {
                        const dp = weeklyData.get(day);
                        const cnt = dp ? [dp.fajr, dp.dhuhr, dp.asr, dp.maghrib, dp.isha].filter(Boolean).length : 0;
                        const isSel = day === selectedDate;
                        const isT = day === today;
                        const disabled = day > today || day < minDate;
                        return (
                            <motion.button
                                key={day}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => !disabled && setSelectedDate(day)}
                                disabled={disabled}
                                className={`py-2 rounded-xl text-center transition-all relative ${isSel
                                    ? "bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-500/30"
                                    : isT
                                    ? "bg-purple-500/10 border border-purple-500/30 text-purple-400"
                                    : disabled
                                    ? "opacity-25"
                                    : "bg-card border border-border hover:border-purple-500/40"
                                    }`}
                            >
                                <p className="text-[9px] font-semibold opacity-60">{format(parseISO(day), "EEE")}</p>
                                <p className="text-sm font-bold">{format(parseISO(day), "d")}</p>
                                <div className="flex justify-center gap-[2px] mt-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-[3px] h-[3px] rounded-full transition-colors ${i < cnt
                                                ? isSel ? "bg-white" : "bg-purple-400"
                                                : "bg-slate-600"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => goToDate(1)}
                    disabled={selectedDate >= today}
                    className="p-2.5 rounded-xl bg-card border border-border hover:border-purple-500/50 disabled:opacity-30 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </motion.button>
            </div>

            {/* ── PRAYER CARDS ── */}
            <div className="space-y-3">
                {PRAYERS.map((p, idx) => {
                    const isCompleted = prayer?.[p.key] ?? false;
                    const isJust = justCompleted === p.key;

                    return (
                        <motion.button
                            key={p.key}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07, duration: 0.3 }}
                            whileTap={canEdit ? { scale: 0.97 } : {}}
                            onClick={() => togglePrayer(p.key)}
                            disabled={!canEdit}
                            className={`w-full relative overflow-hidden rounded-2xl border transition-all duration-300 ${isCompleted
                                ? `bg-gradient-to-r ${p.bg} border-white/10`
                                : "bg-card border-border hover:border-purple-500/30"
                                } ${!canEdit ? "opacity-60" : ""}`}
                        >
                            {/* Completed shimmer sweep */}
                            <AnimatePresence>
                                {isJust && (
                                    <motion.div
                                        className="absolute inset-0 bg-white/10"
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "100%" }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-4 p-4">
                                {/* Icon */}
                                <motion.div
                                    animate={isCompleted ? { scale: [1, 1.15, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                    className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-lg ${isCompleted
                                        ? `bg-gradient-to-br ${p.gradient} ${p.glow} shadow-lg`
                                        : "bg-secondary"
                                        }`}
                                >
                                    {p.emoji}
                                    {isCompleted && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow"
                                        >
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </motion.div>
                                    )}
                                </motion.div>

                                {/* Text */}
                                <div className="flex-1 text-left">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="font-bold text-base">{p.name}</h3>
                                        <span className="text-xs opacity-40 font-medium" style={{ fontFamily: "serif" }}>{p.arabic}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">{p.time}</p>
                                </div>

                                {/* Checkbox */}
                                <motion.div
                                    animate={isCompleted
                                        ? { scale: [1, 1.3, 1], backgroundColor: ["#7c3aed", "#7c3aed"] }
                                        : { scale: 1 }
                                    }
                                    transition={{ duration: 0.3 }}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted
                                        ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-transparent"
                                        : "border-border bg-background"
                                        }`}
                                >
                                    <AnimatePresence>
                                        {isCompleted && (
                                            <motion.svg
                                                key="check"
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="w-4 h-4 text-white"
                                                fill="none"
                                                viewBox="0 0 16 16"
                                            >
                                                <motion.path
                                                    d="M3 8l4 4 6-6"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </motion.svg>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* ── WEEK STATS ROW ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-2xl p-4"
            >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">This Week</p>
                <div className="flex items-end justify-between gap-1">
                    {weekDays.map((day) => {
                        const dp = weeklyData.get(day);
                        const cnt = dp ? [dp.fajr, dp.dhuhr, dp.asr, dp.maghrib, dp.isha].filter(Boolean).length : 0;
                        const isT = day === today;
                        const isSel = day === selectedDate;
                        return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full h-16 flex flex-col justify-end gap-[2px]">
                                    {[...Array(5)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.04, duration: 0.25 }}
                                            className={`w-full h-2.5 rounded-sm ${i < cnt
                                                ? isSel || isT
                                                    ? "bg-purple-500"
                                                    : "bg-purple-400/60"
                                                : "bg-secondary"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className={`text-[9px] font-medium ${isSel ? "text-purple-400" : "text-muted-foreground"}`}>
                                    {format(parseISO(day), "EEE")}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {!canEdit && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-center text-amber-500 bg-amber-500/10 border border-amber-500/20 py-2.5 rounded-xl"
                >
                    ⚠️ You can only edit prayers from the past 2 days
                </motion.p>
            )}
        </div>
    );
}
