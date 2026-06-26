"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SleepLog } from "@/types";
import { Moon, Sun, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { format, parseISO, addDays, subDays, differenceInMinutes, parse } from "date-fns";

const QUALITY = [
    { val: 1 as const, emoji: "😴", label: "Terrible", color: "#ef4444" },
    { val: 2 as const, emoji: "😕", label: "Poor",     color: "#f97316" },
    { val: 3 as const, emoji: "😐", label: "Fair",     color: "#eab308" },
    { val: 4 as const, emoji: "🙂", label: "Good",     color: "#22c55e" },
    { val: 5 as const, emoji: "😄", label: "Amazing",  color: "#10b981" },
];
const IDEAL_MIN = 8 * 60;

/* ── Custom time wheel ── */
function TimeWheel({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
    const [h, m, period] = (() => {
        const [hh, mm] = value.split(":").map(Number);
        const per = hh >= 12 ? "PM" : "AM";
        const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
        return [h12, mm, per];
    })();

    const setTime = (newH: number, newM: number, newPeriod: string) => {
        let h24 = newH % 12;
        if (newPeriod === "PM") h24 += 12;
        onChange(`${String(h24).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);
    };

    const Spinner = ({ value: val, onUp, onDown, label }: { value: string; onUp: () => void; onDown: () => void; label?: string }) => (
        <div className="flex flex-col items-center gap-1 min-w-[52px]">
            {label && <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest mb-0.5">{label}</span>}
            <motion.button whileTap={{ scale: 0.88 }} onClick={onUp}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                <ChevronUp className="w-4 h-4 text-white/50" />
            </motion.button>
            <div className="w-14 h-12 rounded-xl flex items-center justify-center font-black text-2xl text-white tabular-nums"
                style={{ background: `${accent}25`, border: `1.5px solid ${accent}50` }}>
                {val}
            </div>
            <motion.button whileTap={{ scale: 0.88 }} onClick={onDown}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                <ChevronDown className="w-4 h-4 text-white/50" />
            </motion.button>
        </div>
    );

    return (
        <div className="flex items-center justify-center gap-3 py-2">
            <Spinner
                label="Hour"
                value={String(h).padStart(2, "0")}
                onUp={() => setTime(h === 12 ? 1 : h + 1, m, period)}
                onDown={() => setTime(h === 1 ? 12 : h - 1, m, period)}
            />
            <span className="text-2xl font-black text-white/40 mb-1">:</span>
            <Spinner
                label="Min"
                value={String(m).padStart(2, "0")}
                onUp={() => setTime(h, (m + 5) % 60, period)}
                onDown={() => setTime(h, m === 0 ? 55 : m - 5, period)}
            />
            <div className="flex flex-col gap-1.5 ml-1">
                <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">AM/PM</span>
                {["AM", "PM"].map(p => (
                    <motion.button key={p} whileTap={{ scale: 0.9 }}
                        onClick={() => setTime(h, m, p)}
                        className="w-12 h-[22px] rounded-lg text-xs font-bold transition-all"
                        style={{ background: period === p ? accent : "rgba(255,255,255,0.06)", color: period === p ? "#fff" : "rgba(255,255,255,0.35)" }}>
                        {p}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

export default function SleepPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [sleepLog, setSleepLog] = useState<SleepLog | null>(null);
    const [weeklyLogs, setWeeklyLogs] = useState<SleepLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const prevDateRef = useRef(selectedDate);

    const [bedtime, setBedtime] = useState("22:00");
    const [wakeTime, setWakeTime] = useState("06:00");
    const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

    const today = getToday();

    useEffect(() => {
        if (prevDateRef.current !== selectedDate) {
            setSleepLog(null); setBedtime("22:00"); setWakeTime("06:00"); setQuality(4); setLoading(true);
            prevDateRef.current = selectedDate;
        }
    }, [selectedDate]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const log = await db.sleepLogs.where("date").equals(selectedDate).first();
            setSleepLog(log || null);
            if (log) { setBedtime(log.bedtime); setWakeTime(log.wakeTime); setQuality(log.quality); }
            const weekAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
            const all = await db.sleepLogs.toArray();
            setWeeklyLogs(all.filter(l => l.date >= weekAgo && l.date <= today));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id, selectedDate, today]);

    useEffect(() => { loadData(); }, [loadData]);

    const calcDuration = (bed: string, wake: string) => {
        const b = parse(bed, "HH:mm", new Date());
        let w = parse(wake, "HH:mm", new Date());
        if (w <= b) w = addDays(w, 1);
        return differenceInMinutes(w, b);
    };

    const saveSleep = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const duration = calcDuration(bedtime, wakeTime);
            if (sleepLog) {
                await db.sleepLogs.update(sleepLog.id, { bedtime, wakeTime, duration, quality, updatedAt: now });
            } else {
                const log: SleepLog = { id: generateId(), userId: user.id, date: selectedDate, bedtime, wakeTime, duration, quality, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
                await db.sleepLogs.add(log);
            }
            toast({ title: "Sleep logged! 😴" });
            loadData();
            syncToCloud(user.id, "sleepLogs");
        } catch { toast({ title: "Failed to save", variant: "destructive" }); }
        finally { setSaving(false); }
    };

    const goToDate = (d: number) => {
        const n = d > 0 ? format(addDays(parseISO(selectedDate), d), "yyyy-MM-dd") : format(subDays(parseISO(selectedDate), Math.abs(d)), "yyyy-MM-dd");
        if (n > today) return;
        setSelectedDate(n);
    };

    const duration = calcDuration(bedtime, wakeTime);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const pct = Math.min(duration / IDEAL_MIN, 1);
    const avgDur = weeklyLogs.length > 0 ? weeklyLogs.reduce((s, l) => s + l.duration, 0) / weeklyLogs.length : 0;
    const qualCfg = QUALITY.find(q => q.val === quality)!;
    const durationColor = hours >= 7 ? "#10b981" : hours >= 5 ? "#f59e0b" : "#ef4444";

    const chartData = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
        const log = weeklyLogs.find(l => l.date === date);
        return { date, duration: log?.duration ?? 0, quality: log?.quality ?? 0, hasData: !!log };
    });

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-4 pb-6">
            {/* ── HERO ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="relative rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #07082a 0%, #0f1048 50%, #07082a 100%)" }}>
                {/* Stars */}
                {[...Array(18)].map((_, i) => (
                    <motion.div key={i} className="absolute rounded-full bg-white"
                        style={{ width: i % 4 === 0 ? 2 : 1, height: i % 4 === 0 ? 2 : 1, top: `${(i * 43 + 8) % 88}%`, left: `${(i * 61 + 5) % 94}%` }}
                        animate={{ opacity: [0.15, 0.9, 0.15] }}
                        transition={{ duration: 2.5 + (i % 3), repeat: Infinity, delay: i * 0.2 }} />
                ))}
                <div className="relative p-5 flex items-center gap-4">
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="48" cy="48" r="38" stroke="rgba(255,255,255,0.07)" strokeWidth="8" fill="none" />
                            <motion.circle cx="48" cy="48" r="38" stroke="#818cf8" strokeWidth="8" fill="none"
                                strokeLinecap="round" strokeDasharray={2 * Math.PI * 38}
                                initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - pct) }}
                                transition={{ duration: 1, ease: "easeOut" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Moon className="w-4 h-4 text-indigo-300 mb-0.5" />
                            <span className="text-xl font-black text-white">{hours}h</span>
                            {mins > 0 && <span className="text-[10px] text-white/40">{mins}m</span>}
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-indigo-400/50 text-[10px] font-semibold tracking-widest uppercase">Sleep</p>
                        <h1 className="text-xl font-black text-white mt-0.5">
                            {sleepLog ? (hours >= 7 ? "Well Rested ✨" : hours >= 5 ? "Decent Night" : "Poor Sleep") : "Track Tonight"}
                        </h1>
                        <p className="text-white/40 text-sm mt-0.5">Avg {Math.floor(avgDur / 60)}h {Math.round(avgDur % 60)}m · Goal 8h</p>
                        <div className="mt-2.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full bg-indigo-400"
                                initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }}
                                transition={{ duration: 1, ease: "easeOut" }} />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── DATE NAV ── */}
            <div className="flex items-center gap-2">
                <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl bg-card border border-border hover:border-indigo-500/40 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center py-2.5 bg-card border border-border rounded-xl">
                    <p className="font-semibold text-sm">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <p className="text-xs text-indigo-500 font-medium">Tonight</p>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today}
                    className="p-2.5 rounded-xl bg-card border border-border hover:border-indigo-500/40 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* ── WEEKLY CHART ── */}
            <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">This Week</p>
                <div className="flex items-end justify-between gap-2 h-20">
                    {chartData.map((day, i) => {
                        const h = day.duration > 0 ? Math.max((day.duration / IDEAL_MIN) * 100, 6) : 0;
                        const q = QUALITY.find(q => q.val === day.quality);
                        const isSel = day.date === selectedDate;
                        return (
                            <button key={day.date} onClick={() => setSelectedDate(day.date)} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full h-16 bg-secondary rounded-lg overflow-hidden flex items-end">
                                    <motion.div className={`w-full rounded-lg ${isSel ? "bg-indigo-500" : day.hasData ? "bg-indigo-500/50" : ""}`}
                                        initial={{ height: 0 }} animate={{ height: `${Math.min(h, 100)}%` }}
                                        transition={{ duration: 0.4, delay: i * 0.04 }} />
                                </div>
                                <div className="w-2 h-2 rounded-full" style={{ background: day.hasData && q ? q.color : "transparent" }} />
                                <span className={`text-[9px] font-semibold ${isSel ? "text-indigo-400" : "text-muted-foreground"}`}>
                                    {format(parseISO(day.date), "EEE")}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── SLEEP LOGGER ── */}
            <div className="rounded-3xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0c0c30 0%, #131345 100%)" }}>
                <div className="p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-white">Log Sleep</p>
                        <AnimatePresence>
                            {sleepLog && (
                                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                    className="text-xs px-2.5 py-1 rounded-full font-semibold text-indigo-300"
                                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)" }}>
                                    Saved ✓
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Times side by side */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Bedtime */}
                        <div className="rounded-2xl p-3" style={{ background: "rgba(79,70,229,0.15)", border: "1px solid rgba(79,70,229,0.3)" }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-wider">Bedtime</span>
                            </div>
                            <TimeWheel value={bedtime} onChange={setBedtime} accent="#818cf8" />
                        </div>
                        {/* Wake Up */}
                        <div className="rounded-2xl p-3" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Sun className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Wake Up</span>
                            </div>
                            <TimeWheel value={wakeTime} onChange={setWakeTime} accent="#f59e0b" />
                        </div>
                    </div>

                    {/* Duration display */}
                    <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-3xl font-black tabular-nums" style={{ color: durationColor }}>
                            {hours}h {mins}m
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                            {hours >= 7 ? "Optimal ✨" : hours >= 5 ? "A bit short ⚠️" : "Not enough ❌"}
                        </p>
                    </div>

                    {/* Quality */}
                    <div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">Sleep Quality</p>
                        <div className="grid grid-cols-5 gap-2">
                            {QUALITY.map(q => (
                                <motion.button key={q.val} whileTap={{ scale: 0.92 }}
                                    onClick={() => setQuality(q.val)}
                                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                                    style={{
                                        borderColor: quality === q.val ? q.color : "rgba(255,255,255,0.06)",
                                        background: quality === q.val ? q.color + "20" : "rgba(255,255,255,0.03)",
                                    }}>
                                    <span className={`text-xl transition-transform duration-150 ${quality === q.val ? "scale-125" : ""}`}>{q.emoji}</span>
                                    <span className="text-[9px] font-semibold" style={{ color: quality === q.val ? q.color : "rgba(255,255,255,0.35)" }}>{q.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Save */}
                    <motion.button whileTap={{ scale: 0.97 }}
                        onClick={saveSleep}
                        disabled={saving}
                        className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 8px 24px rgba(79,70,229,0.4)" }}>
                        {saving ? "Saving…" : sleepLog ? "Update Sleep 🌙" : "Save Sleep 🌙"}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
