"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { syncToCloud } from "@/lib/sync";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Plus, X, Scale, Flame, Trophy, Zap, Heart, Activity } from "lucide-react";
import { format, subDays } from "date-fns";

interface FitnessEntry {
    id: string; date: string; weight?: number; bodyFat?: number;
    muscleExercises?: MuscleExercise[]; cardioMinutes?: number;
    caloriesBurned?: number; notes?: string; createdAt: string;
}
interface MuscleExercise {
    name: string; sets: number; reps: number; weight: number; muscleGroup: string;
    duration?: number; distance?: number;
}

const MUSCLE_GROUPS = [
    { id: "chest",     label: "Chest",     emoji: "💪", color: "#f97316" },
    { id: "back",      label: "Back",      emoji: "🏋️",  color: "#3b82f6" },
    { id: "shoulders", label: "Shoulders", emoji: "🎯", color: "#8b5cf6" },
    { id: "arms",      label: "Arms",      emoji: "💪", color: "#ec4899" },
    { id: "legs",      label: "Legs",      emoji: "🦵", color: "#10b981" },
    { id: "core",      label: "Core",      emoji: "🔥", color: "#ef4444" },
    { id: "cardio",    label: "Cardio",    emoji: "❤️", color: "#f43f5e" },
];

const EXERCISE_PRESETS: Record<string, string[]> = {
    chest:     ["Bench Press", "Incline Press", "Dumbbell Fly", "Push-ups", "Cable Crossover"],
    back:      ["Deadlift", "Pull-ups", "Lat Pulldown", "Barbell Row", "Cable Row"],
    shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Shrugs"],
    arms:      ["Bicep Curl", "Tricep Dip", "Hammer Curl", "Skull Crusher", "Preacher Curl"],
    legs:      ["Squats", "Leg Press", "Lunges", "Leg Curl", "Calf Raise"],
    core:      ["Plank", "Crunches", "Leg Raise", "Russian Twist", "Ab Wheel"],
    cardio:    ["Treadmill", "Cycling", "Rowing", "Elliptical", "Jump Rope"],
};

export default function FitnessPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [entries, setEntries] = useState<FitnessEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState<"log" | "workout">("log");

    const [weight, setWeight] = useState("");
    const [bodyFat, setBodyFat] = useState("");
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
    const [exercises, setExercises] = useState<MuscleExercise[]>([]);
    const [cardioMinutes, setCardioMinutes] = useState("");
    const [caloriesBurned, setCaloriesBurned] = useState("");
    const [currentExercise, setCurrentExercise] = useState({ name: "", sets: 3, reps: 10, weight: 0, duration: 0, distance: 0 });

    const loadEntries = useCallback(async () => {
        if (!user?.id) return;
        try {
            const db = getUserDatabase(user.id);
            const data = await (db as unknown as { fitness?: { toArray: () => Promise<FitnessEntry[]> } }).fitness?.toArray() || [];
            setEntries(data.sort((a: FitnessEntry, b: FitnessEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadEntries(); }, [loadEntries]);

    const addExercise = () => {
        if (!currentExercise.name || !selectedMuscleGroup) return;
        const isCardio = selectedMuscleGroup === "cardio";
        setExercises(prev => [...prev, { name: currentExercise.name, muscleGroup: selectedMuscleGroup, sets: isCardio ? 0 : currentExercise.sets, reps: isCardio ? 0 : currentExercise.reps, weight: isCardio ? 0 : currentExercise.weight, duration: isCardio ? currentExercise.duration : undefined, distance: isCardio ? currentExercise.distance : undefined }]);
        setCurrentExercise({ name: "", sets: 3, reps: 10, weight: 0, duration: 0, distance: 0 });
    };

    const handleSubmit = async () => {
        if (!user?.id) return;
        if (!weight && exercises.length === 0 && !cardioMinutes) { toast({ title: "Please log at least one metric" }); return; }
        try {
            const db = getUserDatabase(user.id);
            const entry: FitnessEntry = { id: generateId(), date: getToday(), weight: weight ? parseFloat(weight) : undefined, bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, muscleExercises: exercises.length > 0 ? exercises : undefined, cardioMinutes: cardioMinutes ? parseInt(cardioMinutes) : undefined, caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : undefined, createdAt: new Date().toISOString() };
            await (db as unknown as { fitness?: { add: (e: FitnessEntry) => Promise<unknown> } }).fitness?.add(entry);
            await loadEntries();
            syncToCloud(user.id, "fitness");
            setWeight(""); setBodyFat(""); setExercises([]); setCardioMinutes(""); setCaloriesBurned(""); setSelectedMuscleGroup(""); setShowModal(false);
            toast({ title: "Workout logged! 💪" });
        } catch (e) { console.error(e); toast({ title: "Failed to save" }); }
    };

    const todayEntry = entries.find(e => e.date === getToday());
    const last7 = entries.filter(e => new Date(e.date) >= subDays(new Date(), 7));
    const totalWorkouts = last7.filter(e => e.muscleExercises && e.muscleExercises.length > 0).length;
    const totalSets     = last7.reduce((s, e) => s + (e.muscleExercises?.reduce((ss, ex) => ss + ex.sets, 0) || 0), 0);

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        if (entries.some(e => e.date === d && e.muscleExercises && e.muscleExercises.length > 0)) streak++;
        else if (i > 0) break;
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-teal-500/30 border-t-teal-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden p-5" style={{ background: "linear-gradient(135deg, #011a14 0%, #052e22 45%, #011a14 100%)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/8 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
                <div className="relative flex items-start justify-between mb-5">
                    <div>
                        <p className="text-teal-400/50 text-[10px] font-semibold tracking-widest uppercase">Gym Tracker</p>
                        <h1 className="text-2xl font-black text-white mt-0.5">
                            {todayEntry ? "Worked Out Today ✅" : "Not Yet Today"}
                        </h1>
                        <p className="text-white/40 text-sm mt-0.5">{streak} day streak · {totalWorkouts} sessions this week</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-900/50">
                        <Plus className="w-4 h-4" /> Log
                    </motion.button>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2.5">
                    {[
                        { icon: Scale,    label: "Weight",   value: `${todayEntry?.weight ?? entries[0]?.weight ?? "--"}kg`, color: "#94a3b8" },
                        { icon: Trophy,   label: "Streak",   value: `${streak}d`,     color: "#fbbf24" },
                        { icon: Zap,      label: "Sessions", value: totalWorkouts,    color: "#34d399" },
                        { icon: Activity, label: "Sets",     value: totalSets,        color: "#60a5fa" },
                    ].map((s, i) => (
                        <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-white/5 rounded-2xl p-3 border border-white/8">
                            <s.icon className="w-4 h-4 mb-1.5" style={{ color: s.color }} />
                            <p className="text-lg font-black text-white">{s.value}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* ── MUSCLE GROUPS THIS WEEK ── */}
            <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Muscles Hit This Week</p>
                <div className="grid grid-cols-7 gap-1.5">
                    {MUSCLE_GROUPS.map(g => {
                        const count = last7.reduce((s, e) => s + (e.muscleExercises?.filter(ex => ex.muscleGroup === g.id).length || 0), 0);
                        const hit = count > 0;
                        return (
                            <motion.div key={g.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors"
                                style={{ borderColor: hit ? g.color + "50" : "transparent", background: hit ? g.color + "15" : "var(--secondary)" }}>
                                <span className="text-base">{g.emoji}</span>
                                <span className="text-[9px] font-semibold" style={{ color: hit ? g.color : undefined }}>{g.label}</span>
                                {hit && <span className="text-[9px] font-black" style={{ color: g.color }}>{count}×</span>}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── RECENT WORKOUTS ── */}
            <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Workouts</p>
                {entries.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                            <Dumbbell className="w-8 h-8 text-teal-400/40" />
                        </div>
                        <p className="font-bold text-lg">No workouts yet</p>
                        <p className="text-muted-foreground text-sm mt-1">Start your fitness journey today!</p>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowModal(true)} className="mt-4 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm">Log First Workout</motion.button>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {entries.slice(0, 7).map((entry, i) => (
                            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-card border border-border rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-sm">{format(new Date(entry.date), "EEEE, MMM d")}</p>
                                        {entry.weight && <p className="text-xs text-muted-foreground mt-0.5"><Scale className="w-3 h-3 inline mr-1" />{entry.weight} kg</p>}
                                    </div>
                                    {entry.caloriesBurned && <span className="text-sm text-orange-400 flex items-center gap-1 font-semibold"><Flame className="w-4 h-4" />{entry.caloriesBurned} cal</span>}
                                </div>
                                {entry.muscleExercises && entry.muscleExercises.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {entry.muscleExercises.map((ex, j) => {
                                            const g = MUSCLE_GROUPS.find(g => g.id === ex.muscleGroup);
                                            return (
                                                <span key={j} className="text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{ background: (g?.color ?? "#94a3b8") + "20", color: g?.color ?? "#94a3b8" }}>
                                                    {ex.name} · {ex.muscleGroup === "cardio" ? `${ex.duration || 0}min` : `${ex.sets}×${ex.reps}@${ex.weight}kg`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {entry.cardioMinutes && (
                                    <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{entry.cardioMinutes}min cardio</p>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* ── LOG MODAL ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => setShowModal(false)}>
                        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-card rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <div><h2 className="text-lg font-black">Log Workout</h2><p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), "EEEE, MMM d")}</p></div>
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></motion.button>
                            </div>
                            {/* Tabs */}
                            <div className="flex border-b border-border">
                                {(["log","workout"] as const).map(t => (
                                    <button key={t} onClick={() => setModalTab(t)} className={`flex-1 py-3 text-sm font-semibold transition-colors ${modalTab === t ? "text-teal-400 border-b-2 border-teal-500" : "text-muted-foreground"}`}>
                                        {t === "log" ? "Quick Log" : "Full Workout"}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-5">
                                {modalTab === "log" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5"><Scale className="w-4 h-4 text-muted-foreground" /> Weight (kg)</label>
                                            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 75" step="0.1" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-sm transition-colors" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-muted-foreground">Body Fat % <span className="font-normal">(optional)</span></label>
                                            <input type="number" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="e.g. 18" step="0.1" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-sm transition-colors" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-400" /> Cardio (min)</label>
                                                <input type="number" value={cardioMinutes} onChange={e => setCardioMinutes(e.target.value)} placeholder="30" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-sm transition-colors" />
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold mb-1.5 flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-400" /> Calories</label>
                                                <input type="number" value={caloriesBurned} onChange={e => setCaloriesBurned(e.target.value)} placeholder="300" className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-sm transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {modalTab === "workout" && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold mb-2 block">Target Muscle Group</label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MUSCLE_GROUPS.map(g => (
                                                    <motion.button key={g.id} whileTap={{ scale: 0.9 }} onClick={() => { setSelectedMuscleGroup(g.id); setCurrentExercise({ ...currentExercise, name: "" }); }}
                                                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-colors"
                                                        style={{ borderColor: selectedMuscleGroup === g.id ? g.color : "transparent", background: selectedMuscleGroup === g.id ? g.color + "20" : "var(--secondary)", color: selectedMuscleGroup === g.id ? g.color : undefined }}>
                                                        <span>{g.emoji}</span>{g.label}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                        {selectedMuscleGroup && (
                                            <div className="space-y-3">
                                                <label className="text-sm font-semibold">Exercise</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {EXERCISE_PRESETS[selectedMuscleGroup]?.map(ex => (
                                                        <motion.button key={ex} whileTap={{ scale: 0.93 }} onClick={() => setCurrentExercise({ ...currentExercise, name: ex })}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                                            style={{ background: currentExercise.name === ex ? MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.color + "30" : "var(--secondary)", color: currentExercise.name === ex ? MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.color : undefined }}>
                                                            {ex}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                                {selectedMuscleGroup === "cardio" ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div><label className="text-xs font-semibold mb-1 block">Duration (min)</label><input type="number" value={currentExercise.duration || ""} onChange={e => setCurrentExercise({ ...currentExercise, duration: parseInt(e.target.value) || 0 })} placeholder="30" className="w-full px-3 py-2 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-center text-sm transition-colors" /></div>
                                                        <div><label className="text-xs font-semibold mb-1 block">Distance (km)</label><input type="number" step="0.1" value={currentExercise.distance || ""} onChange={e => setCurrentExercise({ ...currentExercise, distance: parseFloat(e.target.value) || 0 })} placeholder="5" className="w-full px-3 py-2 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-center text-sm transition-colors" /></div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div><label className="text-xs font-semibold mb-1 block">Sets</label><input type="number" value={currentExercise.sets} onChange={e => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-center text-sm transition-colors" /></div>
                                                        <div><label className="text-xs font-semibold mb-1 block">Reps</label><input type="number" value={currentExercise.reps} onChange={e => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-center text-sm transition-colors" /></div>
                                                        <div><label className="text-xs font-semibold mb-1 block">Weight (kg)</label><input type="number" value={currentExercise.weight} onChange={e => setCurrentExercise({ ...currentExercise, weight: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 rounded-xl bg-secondary border-2 border-transparent focus:border-teal-500 outline-none text-center text-sm transition-colors" /></div>
                                                    </div>
                                                )}
                                                <motion.button whileTap={{ scale: 0.95 }} onClick={addExercise} disabled={!currentExercise.name} className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 font-semibold text-sm disabled:opacity-50 transition-colors">
                                                    + Add Exercise
                                                </motion.button>
                                                {exercises.length > 0 && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Added</label>
                                                        {exercises.map((ex, i) => {
                                                            const g = MUSCLE_GROUPS.find(g => g.id === ex.muscleGroup);
                                                            return (
                                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border" style={{ background: (g?.color ?? "#94a3b8") + "10" }}>
                                                                    <div><span className="font-semibold text-sm">{ex.name}</span><span className="text-xs text-muted-foreground ml-2">{ex.muscleGroup === "cardio" ? `${ex.duration}min` : `${ex.sets}×${ex.reps}@${ex.weight}kg`}</span></div>
                                                                    <button onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))} className="p-1 hover:bg-destructive/15 rounded-lg"><X className="w-4 h-4 text-destructive" /></button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t border-border">
                                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-900/30">
                                    💪 Save Workout
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
