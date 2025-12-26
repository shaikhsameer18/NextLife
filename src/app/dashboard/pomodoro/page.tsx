"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday, getCurrentTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { PomodoroSession } from "@/types";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Check, Settings, X } from "lucide-react";

type SessionType = "work" | "short_break" | "long_break";

const DEFAULT_SETTINGS = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
};

export default function PomodoroPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [sessionType, setSessionType] = useState<SessionType>("work");
    const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [todaySessions, setTodaySessions] = useState<PomodoroSession[]>([]);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<string>("");

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
            setSessionsCompleted(sessions.filter((s) => s.type === "work" && s.completed).length);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    }, [user]);

    useEffect(() => {
        loadTodaySessions();
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [loadTodaySessions]);

    const handleSessionComplete = useCallback(async () => {
        setIsRunning(false);
        try { const audio = new Audio("/notification.mp3"); audio.play().catch(() => { }); } catch { }

        if (user && sessionType === "work") {
            try {
                const db = getUserDatabase(user.id);
                const now = Date.now();
                const session: PomodoroSession = {
                    id: generateId(), userId: user.id, date: getToday(),
                    startTime: startTimeRef.current || getCurrentTime(), endTime: getCurrentTime(),
                    duration: settings.workDuration, type: "work", completed: true,
                    createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
                };
                await db.pomodoroSessions.add(session);
                loadTodaySessions();
            } catch (error) {
                console.error("Failed to save session:", error);
            }
        }

        toast({
            title: sessionType === "work" ? "Great work! 🎉" : "Break's over!",
            description: sessionType === "work" ? "Time for a break!" : "Ready to focus again?",
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
    }, [user, sessionType, settings, sessionsCompleted, toast, loadTodaySessions]);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) { handleSessionComplete(); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning, handleSessionComplete]);

    const toggleTimer = () => {
        if (!isRunning) startTimeRef.current = getCurrentTime();
        setIsRunning(!isRunning);
    };

    const resetTimer = () => { setIsRunning(false); setTimeLeft(getDuration(sessionType)); };

    const switchSession = (type: SessionType) => { setIsRunning(false); setSessionType(type); setTimeLeft(getDuration(type)); };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = 1 - timeLeft / getDuration(sessionType);
    const totalFocusMinutes = todaySessions.filter((s) => s.type === "work" && s.completed).reduce((sum, s) => sum + s.duration, 0);

    const sessionConfig = {
        work: { icon: Brain, color: "text-red-500", bg: "bg-red-500", gradient: "from-red-500 to-orange-500", label: "Focus" },
        short_break: { icon: Coffee, color: "text-green-500", bg: "bg-green-500", gradient: "from-green-500 to-emerald-500", label: "Short" },
        long_break: { icon: Coffee, color: "text-blue-500", bg: "bg-blue-500", gradient: "from-blue-500 to-cyan-500", label: "Long" },
    };

    const current = sessionConfig[sessionType];
    const Icon = current.icon;

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
                            <Timer className="w-6 h-6" />
                        </div>
                        Pomodoro
                    </h1>
                    <p className="text-muted-foreground mt-1">Focus in intervals, rest, repeat</p>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                    <p className="text-2xl md:text-3xl font-bold">{sessionsCompleted}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Sessions Today</p>
                </div>
                <div className="p-4 rounded-xl md:rounded-2xl bg-card border-2 border-border">
                    <p className="text-2xl md:text-3xl font-bold">{totalFocusMinutes}m</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Focus Time</p>
                </div>
                <div className="p-4 rounded-xl md:rounded-2xl bg-card border-2 border-border">
                    <p className="text-2xl md:text-3xl font-bold">{settings.sessionsBeforeLongBreak - (sessionsCompleted % settings.sessionsBeforeLongBreak)}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Until Long Break</p>
                </div>
                <div className="p-4 rounded-xl md:rounded-2xl bg-card border-2 border-border">
                    <p className="text-2xl md:text-3xl font-bold text-yellow-500">🔥 {Math.floor(totalFocusMinutes / 60)}h</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Hours</p>
                </div>
            </div>

            {/* Timer */}
            <div className="flex flex-col items-center justify-center py-6 md:py-8">
                {/* Session Type Tabs */}
                <div className="flex gap-2 mb-6 md:mb-8">
                    {(["work", "short_break", "long_break"] as SessionType[]).map((type) => {
                        const config = sessionConfig[type];
                        return (
                            <button key={type} onClick={() => switchSession(type)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${sessionType === type ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg` : "bg-secondary hover:bg-secondary/80"}`}>
                                {config.label}
                            </button>
                        );
                    })}
                </div>

                {/* Timer Circle */}
                <div className="relative w-64 h-64 md:w-72 md:h-72">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="8" fill="none" className="text-secondary" />
                        <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="8" fill="none"
                            strokeDasharray={`${2 * Math.PI * 46}%`}
                            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}%`}
                            strokeLinecap="round" className={`${current.color} transition-all duration-1000`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Icon className={`w-8 h-8 md:w-10 md:h-10 ${current.color} mb-2`} />
                        <span className="text-4xl md:text-5xl font-bold font-mono">{formatTime(timeLeft)}</span>
                        <span className="text-xs md:text-sm text-muted-foreground mt-2">{current.label} Time</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 mt-6 md:mt-8">
                    <button onClick={resetTimer} className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                        <RotateCcw className="w-6 h-6" />
                    </button>
                    <button onClick={toggleTimer} className={`w-16 h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center text-white transition-all shadow-xl bg-gradient-to-r ${current.gradient} hover:opacity-90`}>
                        {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                    <button onClick={handleSessionComplete} className="p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                        <Check className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
                    <div className="bg-card border-t md:border border-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95">
                        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-bold">⚙️ Timer Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 md:p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Focus Duration (minutes)</label>
                                <input type="number" value={settings.workDuration} onChange={(e) => setSettings({ ...settings, workDuration: parseInt(e.target.value) || 25 })} min={1} max={60} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-yellow-500 outline-none font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Short Break (minutes)</label>
                                <input type="number" value={settings.shortBreakDuration} onChange={(e) => setSettings({ ...settings, shortBreakDuration: parseInt(e.target.value) || 5 })} min={1} max={30} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-yellow-500 outline-none font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Long Break (minutes)</label>
                                <input type="number" value={settings.longBreakDuration} onChange={(e) => setSettings({ ...settings, longBreakDuration: parseInt(e.target.value) || 15 })} min={1} max={60} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-yellow-500 outline-none font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Sessions Before Long Break</label>
                                <input type="number" value={settings.sessionsBeforeLongBreak} onChange={(e) => setSettings({ ...settings, sessionsBeforeLongBreak: parseInt(e.target.value) || 4 })} min={1} max={10} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-yellow-500 outline-none font-bold" />
                            </div>
                        </div>
                        <div className="p-4 flex gap-3 border-t border-border">
                            <button onClick={() => { setSettings(DEFAULT_SETTINGS); setTimeLeft(DEFAULT_SETTINGS.workDuration * 60); }} className="flex-1 py-3 rounded-xl bg-secondary font-semibold">Reset</button>
                            <button onClick={() => { setShowSettings(false); setTimeLeft(getDuration(sessionType)); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
