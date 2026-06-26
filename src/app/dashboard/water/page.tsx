"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { WaterLog } from "@/types";
import { Droplets, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const QUICK_AMOUNTS = [
    { label: "Sip",    amount: 150,  emoji: "💧", color: "#38bdf8" },
    { label: "Glass",  amount: 250,  emoji: "🥛", color: "#0ea5e9" },
    { label: "Bottle", amount: 500,  emoji: "🍶", color: "#0284c7" },
    { label: "1 Litre",amount: 1000, emoji: "🫗", color: "#0369a1" },
];

const DAILY_GOAL = 2500;
const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function WaterPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [logs, setLogs] = useState<WaterLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [customAmount, setCustomAmount] = useState("");
    const [weeklyData, setWeeklyData] = useState<{ date: string; amount: number }[]>([]);
    const [lastAdded, setLastAdded] = useState<number | null>(null);

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
                weekData.push({ date, amount: dateLogs.reduce((s, l) => s + l.amount, 0) });
            }
            setWeeklyData(weekData);
        } catch (error) {
            console.error("Failed to load water logs:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, selectedDate]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const goToDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const addWater = async (amount: number) => {
        if (!user || amount <= 0 || selectedDate !== today) return;

        const tempLog: WaterLog = {
            id: "temp-" + Date.now(), userId: user.id, date: today,
            amount, time: format(new Date(), "HH:mm"),
            createdAt: Date.now(), updatedAt: Date.now(), syncStatus: "pending", version: 1,
        };
        setLogs(prev => [tempLog, ...prev]);
        setLastAdded(amount);
        setTimeout(() => setLastAdded(null), 1200);

        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const log: WaterLog = { ...tempLog, id: generateId(), createdAt: now, updatedAt: now };
            await db.waterLogs.add(log);
            const newTotal = totalIntake + amount;
            if (newTotal >= DAILY_GOAL && totalIntake < DAILY_GOAL) {
                toast({ title: "🎉 Daily goal reached! Amazing!" });
            } else {
                toast({ title: `+${amount}ml added 💧` });
            }
            setCustomAmount("");
            loadLogs();
            syncToCloud(user.id, "waterLogs");
        } catch {
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
            syncToCloud(user.id, "waterLogs");
        } catch { /* ignore */ }
    };

    const totalIntake = logs.reduce((s, l) => s + l.amount, 0);
    const progress = Math.min(totalIntake / DAILY_GOAL, 1);
    const goalReached = totalIntake >= DAILY_GOAL;
    const fillPercent = Math.min(progress * 100, 100);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <motion.div
                    className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0c1445 0%, #0a2342 40%, #0e3a5a 70%, #0c1445 100%)" }}
            >
                {/* Animated bubbles */}
                {[...Array(10)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-cyan-400/10 border border-cyan-400/20"
                        style={{
                            width: 8 + (i % 4) * 10,
                            height: 8 + (i % 4) * 10,
                            left: `${(i * 17 + 5) % 90}%`,
                            bottom: `${(i * 23 + 10) % 80}%`,
                        }}
                        animate={{
                            y: [0, -(20 + i * 8), 0],
                            opacity: [0.3, 0.8, 0.3],
                        }}
                        transition={{
                            duration: 3 + i * 0.4,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: "easeInOut",
                        }}
                    />
                ))}

                <div className="relative p-6 flex items-center gap-5">
                    {/* Big ring progress */}
                    <div className="relative flex-shrink-0">
                        <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="64" cy="64" r={RING_R} stroke="rgba(255,255,255,0.06)" strokeWidth="9" fill="none" />
                            <motion.circle
                                cx="64" cy="64" r={RING_R}
                                stroke="url(#waterRingGrad)"
                                strokeWidth="9"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRC}
                                initial={{ strokeDashoffset: RING_CIRC }}
                                animate={{ strokeDashoffset: RING_CIRC * (1 - progress) }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                            <defs>
                                <linearGradient id="waterRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="100%" stopColor="#22d3ee" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white">
                                {totalIntake >= 1000
                                    ? (totalIntake / 1000).toFixed(1)
                                    : totalIntake}
                            </span>
                            <span className="text-xs text-white/40 font-medium">
                                {totalIntake >= 1000 ? "L" : "ml"}
                            </span>
                        </div>
                    </div>

                    {/* Right text */}
                    <div className="flex-1">
                        <p className="text-cyan-400/60 text-xs font-semibold tracking-widest uppercase mb-1">Hydration</p>
                        <h1 className="text-2xl font-black text-white">
                            {goalReached ? "Goal Reached! 🎉" : `${Math.round(progress * 100)}% Done`}
                        </h1>
                        <p className="text-white/50 text-sm mt-1">
                            {goalReached
                                ? "You're fully hydrated today!"
                                : `${DAILY_GOAL - totalIntake}ml left to reach ${(DAILY_GOAL / 1000)}L goal`}
                        </p>

                        {/* Mini bar */}
                        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${fillPercent}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                        <p className="text-white/30 text-xs mt-1">Daily goal: {(DAILY_GOAL / 1000)}L</p>
                    </div>
                </div>

                {/* +amount toast that pops up */}
                <AnimatePresence>
                    {lastAdded && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.8 }}
                            className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-cyan-500 text-white text-sm font-bold shadow-lg"
                        >
                            +{lastAdded}ml
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── DATE NAV ── */}
            <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => goToDate(-1)} className="p-2.5 rounded-xl bg-card border border-border hover:border-cyan-500/40 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <div className="flex-1 text-center py-2.5 bg-card border border-border rounded-xl">
                    <p className="font-semibold text-sm">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <p className="text-xs text-cyan-500 font-medium">Today</p>}
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl bg-card border border-border hover:border-cyan-500/40 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </motion.button>
            </div>

            {/* ── QUICK ADD (today only) ── */}
            {selectedDate === today && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-3"
                >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Add</p>
                    <div className="grid grid-cols-4 gap-2.5">
                        {QUICK_AMOUNTS.map((item, i) => (
                            <motion.button
                                key={item.amount}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.06 }}
                                whileTap={{ scale: 0.88 }}
                                onClick={() => addWater(item.amount)}
                                className="relative overflow-hidden flex flex-col items-center gap-1.5 p-3.5 rounded-2xl bg-card border border-border hover:border-cyan-500/50 transition-colors group"
                            >
                                <div
                                    className="absolute inset-x-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity rounded-b-2xl"
                                    style={{ height: "40%", background: item.color }}
                                />
                                <span className="text-2xl">{item.emoji}</span>
                                <span className="text-xs font-bold" style={{ color: item.color }}>{item.amount}ml</span>
                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Custom amount */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
                            <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addWater(parseInt(customAmount) || 0)}
                                placeholder="Custom amount in ml"
                                className="w-full pl-9 pr-3 py-3 rounded-xl bg-card border border-border focus:border-cyan-500 outline-none text-sm transition-colors"
                            />
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => addWater(parseInt(customAmount) || 0)}
                            disabled={!customAmount || parseInt(customAmount) <= 0}
                            className="px-4 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-900/30 disabled:opacity-40 transition-opacity"
                        >
                            <Plus className="w-5 h-5" />
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* ── WEEKLY CHART ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card border border-border rounded-2xl p-4"
            >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">This Week</p>
                <div className="flex items-end justify-between gap-2 h-24">
                    {weeklyData.map((day, i) => {
                        const h = day.amount > 0 ? Math.max((day.amount / DAILY_GOAL) * 100, 6) : 0;
                        const isSel = day.date === selectedDate;
                        const isT = day.date === today;
                        const goalMet = day.amount >= DAILY_GOAL;
                        return (
                            <button
                                key={day.date}
                                onClick={() => setSelectedDate(day.date)}
                                className="flex-1 flex flex-col items-center gap-1"
                            >
                                <div className="w-full h-20 rounded-xl bg-secondary overflow-hidden flex items-end relative">
                                    <motion.div
                                        className={`w-full rounded-xl transition-colors ${goalMet ? "bg-gradient-to-t from-emerald-500 to-cyan-400" : isSel || isT ? "bg-gradient-to-t from-cyan-600 to-sky-400" : "bg-cyan-500/40"}`}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.min(h, 100)}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                    {isSel && (
                                        <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-400 rounded-full" />
                                    )}
                                </div>
                                <span className={`text-[9px] font-semibold ${isSel ? "text-cyan-400" : isT ? "text-cyan-500" : "text-muted-foreground"}`}>
                                    {format(parseISO(day.date), "EEE")}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-600 to-sky-400" />
                        <span className="text-xs text-muted-foreground">Partial</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
                        <span className="text-xs text-muted-foreground">Goal met ✓</span>
                    </div>
                </div>
            </motion.div>

            {/* ── LOG HISTORY ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card border border-border rounded-2xl p-4"
            >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Log History · {logs.length} entries
                </p>
                {logs.length === 0 ? (
                    <div className="text-center py-8">
                        <Droplets className="w-10 h-10 text-cyan-500/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No logs for this day</p>
                        {selectedDate === today && <p className="text-xs text-muted-foreground/60">Tap a quick-add button above to start</p>}
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        <AnimatePresence initial={false}>
                            {logs.map((log, i) => (
                                <motion.div
                                    key={log.id}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                                        <Droplets className="w-4 h-4 text-cyan-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm">{log.amount}ml</p>
                                        <p className="text-xs text-muted-foreground">{log.time}</p>
                                    </div>
                                    {selectedDate === today && (
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={() => deleteLog(log.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </motion.button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
