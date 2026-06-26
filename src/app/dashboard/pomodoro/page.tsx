"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday, getCurrentTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PomodoroSession } from "@/types";
import { Play, Pause, RotateCcw, Coffee, Brain, Check, Settings, X, Flame, Clock } from "lucide-react";

type SessionType = "work" | "short_break" | "long_break";

const DEFAULT_SETTINGS = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
};

const SESSION_CONFIG = {
    work: {
        label: "Focus",
        shortLabel: "Work",
        icon: Brain,
        grad: "from-violet-600 to-purple-700",
        ring: "#8b5cf6",
        ringGlow: "rgba(139,92,246,0.4)",
        heroBg: "linear-gradient(135deg, #1a0533 0%, #2d1160 40%, #1a0533 100%)",
        accent: "#a78bfa",
        tabActive: "from-violet-500 to-purple-600",
        emoji: "🧠",
    },
    short_break: {
        label: "Short Break",
        shortLabel: "Short",
        icon: Coffee,
        grad: "from-emerald-500 to-teal-600",
        ring: "#10b981",
        ringGlow: "rgba(16,185,129,0.4)",
        heroBg: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #022c22 100%)",
        accent: "#34d399",
        tabActive: "from-emerald-500 to-teal-600",
        emoji: "☕",
    },
    long_break: {
        label: "Long Break",
        shortLabel: "Long",
        icon: Coffee,
        grad: "from-sky-500 to-blue-700",
        ring: "#0ea5e9",
        ringGlow: "rgba(14,165,233,0.4)",
        heroBg: "linear-gradient(135deg, #0a1628 0%, #1e3a5f 40%, #0a1628 100%)",
        accent: "#38bdf8",
        tabActive: "from-sky-500 to-blue-600",
        emoji: "🌿",
    },
} as const;

const RING_SIZE = 220;
const RING_R = 90;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function PomodoroPage() {
    const { user } = useUser();
    const { toast } = useToast();

    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [draftSettings, setDraftSettings] = useState(DEFAULT_SETTINGS);
    const [sessionType, setSessionType] = useState<SessionType>("work");
    const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);
    const [justCompleted, setJustCompleted] = useState(false);

    const rafIdRef = useRef<number | null>(null);
    const timerStartRef = useRef<{ at: number; from: number } | null>(null);
    const startTimeRef = useRef<string>("");

    const cfg = SESSION_CONFIG[sessionType];
    const Icon = cfg.icon;

    const getDuration = useCallback((type: SessionType) => {
        switch (type) {
            case "work": return settings.workDuration * 60;
            case "short_break": return settings.shortBreakDuration * 60;
            case "long_break": return settings.longBreakDuration * 60;
        }
    }, [settings]);

    const loadTodaySessions = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const sessions = await db.pomodoroSessions.where("date").equals(getToday()).toArray();
            setTodaySessions(sessions);
            setSessionsCompleted(sessions.filter(s => s.type === "work" && s.completed).length);
        } catch (err) {
            console.error("Failed to load sessions:", err);
        }
    }, [user?.id]);

    useEffect(() => {
        loadTodaySessions();
    }, [loadTodaySessions]);

    const handleSessionComplete = useCallback(async () => {
        setIsRunning(false);
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1500);

        try { const a = new Audio("/notification.mp3"); a.play().catch(() => {}); } catch {}

        if (user && sessionType === "work") {
            try {
                const db = getUserDatabase(user.id);
                const now = Date.now();
                const session: PomodoroSession = {
                    id: generateId(), userId: user.id, date: getToday(),
                    startTime: startTimeRef.current || getCurrentTime(),
                    endTime: getCurrentTime(),
                    duration: settings.workDuration, type: "work", completed: true,
                    createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
                };
                await db.pomodoroSessions.add(session);
                syncToCloud(user.id, "pomodoroSessions");
                loadTodaySessions();
            } catch {}
        }

        toast({
            title: sessionType === "work" ? "Focus session complete! 🎉" : "Break time over!",
            description: sessionType === "work" ? "Time for a break." : "Ready to focus again?",
        });

        if (sessionType === "work") {
            const newCount = sessionsCompleted + 1;
            setSessionsCompleted(newCount);
            if (newCount % settings.sessionsBeforeLongBreak === 0) {
                setSessionType("long_break");
                setTimeLeft(settings.longBreakDuration * 60);
            } else {
                setSessionType("short_break");
                setTimeLeft(settings.shortBreakDuration * 60);
            }
        } else {
            setSessionType("work");
            setTimeLeft(settings.workDuration * 60);
        }
    }, [user?.id, sessionType, settings, sessionsCompleted, toast, loadTodaySessions]);

    // Always-current ref to avoid stale closures in RAF callback
    const handleSessionCompleteRef = useRef(handleSessionComplete);
    useEffect(() => { handleSessionCompleteRef.current = handleSessionComplete; });

    // Wall-clock based timer: compute remaining from timestamps, never drifts, immune to batching/Strict Mode
    useEffect(() => {
        if (!isRunning) {
            if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
            timerStartRef.current = null;
            return;
        }
        timerStartRef.current = { at: Date.now(), from: timeLeft };
        const tick = () => {
            if (!timerStartRef.current) return;
            const remaining = Math.max(0, timerStartRef.current.from - Math.floor((Date.now() - timerStartRef.current.at) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) { handleSessionCompleteRef.current(); return; }
            rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
        return () => { if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRunning]); // timeLeft captured in timerStartRef.from at start — intentionally not a dep

    const toggleTimer = () => {
        if (!isRunning) startTimeRef.current = getCurrentTime();
        setIsRunning(p => !p);
    };

    const resetTimer = () => { setIsRunning(false); setTimeLeft(getDuration(sessionType)); };

    const switchSession = (type: SessionType) => {
        setIsRunning(false);
        setSessionType(type);
        setTimeLeft(getDuration(type));
    };

    const openSettings = () => {
        setDraftSettings({ ...settings });
        setShowSettings(true);
    };

    const saveSettings = () => {
        setSettings({ ...draftSettings });
        setTimeLeft(draftSettings.workDuration * 60);
        setSessionType("work");
        setIsRunning(false);
        setShowSettings(false);
    };

    const formatTime = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const progress = 1 - timeLeft / getDuration(sessionType);
    const totalFocusMin = todaySessions.filter(s => s.type === "work" && s.completed).reduce((sum, s) => sum + s.duration, 0);
    const sessUntilLong = settings.sessionsBeforeLongBreak - (sessionsCompleted % settings.sessionsBeforeLongBreak);
    const filledDots = sessionsCompleted % settings.sessionsBeforeLongBreak;

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO TIMER ── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f0020 0%, #1a0040 40%, #0f0020 100%)" }}
            >
                {/* Ambient blobs — color shifts with session via animate */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: 140 + i * 60,
                            height: 140 + i * 60,
                            top: `-${30 + i * 20}%`,
                            right: `-${10 + i * 10}%`,
                            filter: "blur(40px)",
                        }}
                        animate={{
                            background: cfg.ring,
                            opacity: [0.05, 0.10, 0.05],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i }}
                    />
                ))}

                <div className="relative p-6 pb-8">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">Focus Timer</p>
                            <h1 className="text-xl font-black text-white mt-0.5">{cfg.emoji} {cfg.label}</h1>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={openSettings}
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                        >
                            <Settings className="w-5 h-5 text-white/70" />
                        </motion.button>
                    </div>

                    {/* Session type tabs */}
                    <div className="flex gap-2 mb-8">
                        {(["work", "short_break", "long_break"] as SessionType[]).map(type => {
                            const c = SESSION_CONFIG[type];
                            const active = sessionType === type;
                            return (
                                <motion.button
                                    key={type}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => switchSession(type)}
                                    className={`relative flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all overflow-hidden ${active ? "text-white" : "text-white/40 hover:text-white/60"}`}
                                >
                                    {active && (
                                        <motion.div
                                            layoutId="pomTab"
                                            className={`absolute inset-0 rounded-xl bg-gradient-to-r ${c.tabActive}`}
                                            style={{ boxShadow: `0 4px 16px ${c.ringGlow}` }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    {!active && <div className="absolute inset-0 rounded-xl bg-white/5" />}
                                    <span className="relative">{c.shortLabel}</span>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Timer ring */}
                    <div className="flex flex-col items-center">
                        <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
                            {/* Outer glow when running */}
                            <AnimatePresence>
                                {isRunning && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 rounded-full"
                                        style={{ boxShadow: `0 0 60px ${cfg.ringGlow}, 0 0 120px ${cfg.ringGlow}` }}
                                    />
                                )}
                            </AnimatePresence>

                            <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={{ transform: "rotate(-90deg)" }}>
                                <circle
                                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                                    stroke="rgba(255,255,255,0.07)" strokeWidth="12" fill="none"
                                />
                                <motion.circle
                                    cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                                    strokeWidth="12"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={RING_CIRC}
                                    initial={{ strokeDashoffset: RING_CIRC, stroke: cfg.accent }}
                                    animate={{
                                        strokeDashoffset: RING_CIRC * (1 - progress),
                                        stroke: cfg.accent,
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </svg>

                            {/* Center — plain div so React can update text freely without Framer interference */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                {justCompleted ? (
                                    <Check className="w-14 h-14" style={{ color: cfg.accent }} />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Icon className="w-9 h-9 mb-2" style={{ color: cfg.accent }} />
                                        <span className="text-4xl font-black font-mono text-white tracking-tight tabular-nums">
                                            {formatTime(timeLeft)}
                                        </span>
                                        <span className="text-xs mt-1 font-medium" style={{ color: cfg.accent + "99" }}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-5 mt-7">
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={resetTimer}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
                            >
                                <RotateCcw className="w-5 h-5 text-white/60" />
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={toggleTimer}
                                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl bg-gradient-to-br ${cfg.grad}`}
                                style={{ boxShadow: `0 8px 32px ${cfg.ringGlow}` }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={isRunning ? "pause" : "play"}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {isRunning ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={handleSessionComplete}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors"
                            >
                                <Check className="w-5 h-5 text-white/60" />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── STATS ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="grid grid-cols-3 gap-3"
            >
                {[
                    { icon: Brain, label: "Sessions", value: sessionsCompleted, color: "#a78bfa" },
                    { icon: Clock, label: "Focus Time", value: `${totalFocusMin}m`, color: "#f59e0b" },
                    { icon: Flame, label: "Until Long", value: sessUntilLong, color: "#f97316" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1"
                    >
                        <stat.icon className="w-5 h-5 mb-1" style={{ color: stat.color }} />
                        <p className="text-2xl font-black">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── SESSION DOTS ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border rounded-2xl p-4"
            >
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progress to Long Break</p>
                    <span className="text-xs font-bold text-violet-400">
                        {filledDots}/{settings.sessionsBeforeLongBreak}
                    </span>
                </div>
                <div className="flex gap-2">
                    {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => {
                        const filled = i < filledDots;
                        return (
                            <motion.div
                                key={i}
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ delay: 0.35 + i * 0.05 }}
                                style={{ originX: 0 }}
                                className="flex-1 h-2.5 rounded-full overflow-hidden bg-secondary"
                            >
                                {filled && (
                                    <motion.div
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        style={{ originX: 0 }}
                                        className="w-full h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full"
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {sessUntilLong === settings.sessionsBeforeLongBreak
                        ? "Start your first session!"
                        : `${sessUntilLong} more session${sessUntilLong === 1 ? "" : "s"} until a long break`}
                </p>
            </motion.div>

            {/* ── TODAY'S SESSIONS ── */}
            {todaySessions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-2xl p-4"
                >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Today · {todaySessions.filter(s => s.completed && s.type === "work").length} completed
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {[...todaySessions].reverse().map((session, i) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.45 + i * 0.04 }}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-base flex-shrink-0">
                                    {session.type === "work" ? "🧠" : "☕"}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">
                                        {session.type === "work" ? `${session.duration}min Focus` : "Break"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{session.startTime} – {session.endTime}</p>
                                </div>
                                {session.completed && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── SETTINGS MODAL ── */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
                    >
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-card border border-border rounded-2xl shadow-2xl w-full md:max-w-md overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h2 className="text-base font-bold flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-violet-400" /> Timer Settings
                                </h2>
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-secondary">
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>
                            <div className="p-4 space-y-5">
                                {[
                                    { key: "workDuration", label: "Focus Duration", unit: "min", min: 1, max: 60 },
                                    { key: "shortBreakDuration", label: "Short Break", unit: "min", min: 1, max: 30 },
                                    { key: "longBreakDuration", label: "Long Break", unit: "min", min: 1, max: 60 },
                                    { key: "sessionsBeforeLongBreak", label: "Sessions Before Long Break", unit: "", min: 1, max: 10 },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-semibold mb-2 text-muted-foreground">
                                            {field.label} {field.unit && <span className="text-xs font-normal">({field.unit})</span>}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setDraftSettings(d => ({ ...d, [field.key]: Math.max(field.min, (d as Record<string,number>)[field.key] - 1) }))}
                                                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg hover:bg-secondary/80"
                                            >
                                                −
                                            </motion.button>
                                            <p className="flex-1 text-center text-xl font-black">{(draftSettings as Record<string,number>)[field.key]}</p>
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setDraftSettings(d => ({ ...d, [field.key]: Math.min(field.max, (d as Record<string,number>)[field.key] + 1) }))}
                                                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-lg hover:bg-secondary/80"
                                            >
                                                +
                                            </motion.button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 pt-0 flex gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setDraftSettings({ ...DEFAULT_SETTINGS })}
                                    className="flex-1 py-3 rounded-xl bg-secondary font-semibold text-sm"
                                >
                                    Reset
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={saveSettings}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-violet-900/30"
                                >
                                    Save
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
