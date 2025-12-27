"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Dumbbell,
    Plus,
    X,
    Scale,
    Flame,
    Target,
    TrendingUp,
    Calendar,
    Trophy,
    Timer,
    Zap,
    Heart,
    Activity,
    Award,
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

interface FitnessEntry {
    id: string;
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleExercises?: MuscleExercise[];
    cardioMinutes?: number;
    caloriesBurned?: number;
    notes?: string;
    createdAt: string;
}

interface MuscleExercise {
    name: string;
    sets: number;
    reps: number;
    weight: number;
    muscleGroup: string;
}

const MUSCLE_GROUPS = [
    { id: "chest", label: "Chest", emoji: "💪" },
    { id: "back", label: "Back", emoji: "🏋️" },
    { id: "shoulders", label: "Shoulders", emoji: "🎯" },
    { id: "arms", label: "Arms", emoji: "💪" },
    { id: "legs", label: "Legs", emoji: "🦵" },
    { id: "core", label: "Core", emoji: "🔥" },
    { id: "cardio", label: "Cardio", emoji: "❤️" },
];

const EXERCISE_PRESETS: Record<string, string[]> = {
    chest: ["Bench Press", "Incline Press", "Dumbbell Fly", "Push-ups", "Cable Crossover"],
    back: ["Deadlift", "Pull-ups", "Lat Pulldown", "Barbell Row", "Cable Row"],
    shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Face Pull", "Shrugs"],
    arms: ["Bicep Curl", "Tricep Dip", "Hammer Curl", "Skull Crusher", "Preacher Curl"],
    legs: ["Squats", "Leg Press", "Lunges", "Leg Curl", "Calf Raise"],
    core: ["Plank", "Crunches", "Leg Raise", "Russian Twist", "Ab Wheel"],
    cardio: ["Treadmill", "Cycling", "Rowing", "Elliptical", "Jump Rope"],
};

export default function FitnessPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [entries, setEntries] = useState<FitnessEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState<"log" | "workout">("log");

    // Form state
    const [weight, setWeight] = useState("");
    const [bodyFat, setBodyFat] = useState("");
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
    const [exercises, setExercises] = useState<MuscleExercise[]>([]);
    const [cardioMinutes, setCardioMinutes] = useState("");
    const [caloriesBurned, setCaloriesBurned] = useState("");

    // Current exercise being added
    const [currentExercise, setCurrentExercise] = useState({
        name: "",
        sets: 3,
        reps: 10,
        weight: 0,
    });

    const loadEntries = useCallback(async () => {
        if (!user?.id) return;
        try {
            const db = getUserDatabase(user.id);
            const data = await (db as unknown as { fitness?: { toArray: () => Promise<FitnessEntry[]> } }).fitness?.toArray() || [];
            setEntries(data.sort((a: FitnessEntry, b: FitnessEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            console.error("Failed to load fitness data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const addExercise = () => {
        if (!currentExercise.name || !selectedMuscleGroup) return;
        setExercises([
            ...exercises,
            {
                ...currentExercise,
                muscleGroup: selectedMuscleGroup,
            },
        ]);
        setCurrentExercise({ name: "", sets: 3, reps: 10, weight: 0 });
    };

    const removeExercise = (index: number) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!user?.id) return;
        if (!weight && exercises.length === 0 && !cardioMinutes) {
            toast({ title: "Please log at least one metric" });
            return;
        }

        try {
            const db = getUserDatabase(user.id);
            const entry: FitnessEntry = {
                id: generateId(),
                date: getToday(),
                weight: weight ? parseFloat(weight) : undefined,
                bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
                muscleExercises: exercises.length > 0 ? exercises : undefined,
                cardioMinutes: cardioMinutes ? parseInt(cardioMinutes) : undefined,
                caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : undefined,
                createdAt: new Date().toISOString(),
            };

            await (db as unknown as { fitness?: { add: (entry: FitnessEntry) => Promise<unknown> } }).fitness?.add(entry);
            await loadEntries();

            // Reset form
            setWeight("");
            setBodyFat("");
            setExercises([]);
            setCardioMinutes("");
            setCaloriesBurned("");
            setSelectedMuscleGroup("");
            setShowModal(false);

            toast({ title: "Workout logged! 💪" });
        } catch (error) {
            console.error("Failed to save fitness data:", error);
            toast({ title: "Failed to save data" });
        }
    };

    // Calculate stats
    const todayEntry = entries.find(e => e.date === getToday());
    const last7Days = entries.filter(e => {
        const entryDate = new Date(e.date);
        const sevenDaysAgo = subDays(new Date(), 7);
        return entryDate >= sevenDaysAgo;
    });
    const last30Days = entries.filter(e => {
        const entryDate = new Date(e.date);
        const thirtyDaysAgo = subDays(new Date(), 30);
        return entryDate >= thirtyDaysAgo;
    });

    const totalWorkouts = last7Days.filter(e => e.muscleExercises && e.muscleExercises.length > 0).length;
    const totalSets = last7Days.reduce((sum, e) =>
        sum + (e.muscleExercises?.reduce((s, ex) => s + ex.sets, 0) || 0), 0);
    const totalVolume = last7Days.reduce((sum, e) =>
        sum + (e.muscleExercises?.reduce((s, ex) => s + (ex.sets * ex.reps * ex.weight), 0) || 0), 0);

    // Calculate streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
        const checkDate = format(subDays(today, i), "yyyy-MM-dd");
        if (entries.some(e => e.date === checkDate && e.muscleExercises && e.muscleExercises.length > 0)) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    // Weight progress for line chart (last 30 days)
    const weightData = last30Days
        .filter(e => e.weight)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10);

    const minWeight = weightData.length > 0 ? Math.min(...weightData.map(e => e.weight!)) - 2 : 0;
    const maxWeight = weightData.length > 0 ? Math.max(...weightData.map(e => e.weight!)) + 2 : 100;

    // New Year countdown
    const newYear = new Date(2025, 0, 1);
    const daysUntilNewYear = differenceInDays(newYear, today);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                            <Dumbbell className="w-6 h-6" />
                        </div>
                        Gym Tracker
                    </h1>
                    <p className="text-muted-foreground mt-1">New Year, New You 🎯</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:scale-105 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:inline">Log Workout</span>
                </button>
            </div>

            {/* New Year Motivation Banner */}
            {daysUntilNewYear > 0 && daysUntilNewYear <= 30 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 rounded-2xl p-6 text-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative">
                        <h2 className="text-xl font-bold mb-2">🎆 {daysUntilNewYear} Days Until 2025!</h2>
                        <p className="text-white/80">Start your fitness journey now. Build the habit, crush the new year!</p>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Scale className="w-4 h-4" />
                        <span className="text-sm">Weight</span>
                    </div>
                    <p className="text-2xl font-bold">{todayEntry?.weight || entries[0]?.weight || "--"} <span className="text-sm text-muted-foreground">kg</span></p>
                </div>
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm">Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-500">{streak} <span className="text-sm">days</span></p>
                </div>
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Workouts (7d)</span>
                    </div>
                    <p className="text-2xl font-bold text-teal-500">{totalWorkouts}</p>
                </div>
                <div className="bg-card border-2 border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">Total Sets</span>
                    </div>
                    <p className="text-2xl font-bold">{totalSets}</p>
                </div>
            </div>

            {/* Weight Progress - Line Chart */}
            {weightData.length > 1 && (
                <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-teal-500" />
                        Weight Progress
                    </h2>
                    <div className="relative h-48">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-muted-foreground w-10">
                            <span>{maxWeight.toFixed(0)}</span>
                            <span>{((maxWeight + minWeight) / 2).toFixed(0)}</span>
                            <span>{minWeight.toFixed(0)}</span>
                        </div>
                        {/* Chart area */}
                        <div className="ml-12 h-full relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="border-t border-dashed border-border" />
                                ))}
                            </div>
                            {/* Line chart */}
                            <svg className="w-full h-full" viewBox={`0 0 ${weightData.length * 100} 200`} preserveAspectRatio="none">
                                {/* Area fill */}
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`M 0 200 ${weightData.map((e, i) => {
                                        const x = (i / (weightData.length - 1)) * (weightData.length * 100 - 50) + 25;
                                        const y = 200 - ((e.weight! - minWeight) / (maxWeight - minWeight)) * 180;
                                        return `L ${x} ${y}`;
                                    }).join(" ")} L ${weightData.length * 100} 200 Z`}
                                    fill="url(#areaGradient)"
                                />
                                {/* Line */}
                                <path
                                    d={weightData.map((e, i) => {
                                        const x = (i / (weightData.length - 1)) * (weightData.length * 100 - 50) + 25;
                                        const y = 200 - ((e.weight! - minWeight) / (maxWeight - minWeight)) * 180;
                                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                                    }).join(" ")}
                                    fill="none"
                                    stroke="#14b8a6"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Points */}
                                {weightData.map((e, i) => {
                                    const x = (i / (weightData.length - 1)) * (weightData.length * 100 - 50) + 25;
                                    const y = 200 - ((e.weight! - minWeight) / (maxWeight - minWeight)) * 180;
                                    return (
                                        <circle
                                            key={i}
                                            cx={x}
                                            cy={y}
                                            r="6"
                                            fill="#14b8a6"
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    );
                                })}
                            </svg>
                            {/* X-axis labels */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground mt-2">
                                {weightData.map((e, i) => (
                                    <span key={i}>{format(new Date(e.date), "MMM d")}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Muscle Groups Hit This Week */}
            <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-500" />
                    Muscle Groups This Week
                </h2>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {MUSCLE_GROUPS.map((group) => {
                        const count = last7Days.reduce((sum, e) =>
                            sum + (e.muscleExercises?.filter(ex => ex.muscleGroup === group.id).length || 0), 0);
                        const isHit = count > 0;
                        return (
                            <div
                                key={group.id}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${isHit
                                    ? "bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border-2 border-teal-500/30"
                                    : "bg-secondary/50 border-2 border-transparent"
                                    }`}
                            >
                                <span className="text-xl">{group.emoji}</span>
                                <span className="text-xs font-medium">{group.label}</span>
                                {isHit && <span className="text-xs text-teal-500">{count}x</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Workouts */}
            <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Recent Workouts
                </h2>
                {entries.length === 0 ? (
                    <div className="text-center py-12">
                        <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">No workouts logged yet.</p>
                        <p className="text-sm text-muted-foreground">Start your fitness journey today! 💪</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.slice(0, 7).map((entry) => (
                            <div key={entry.id} className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold">{format(new Date(entry.date), "EEEE, MMM d")}</span>
                                    {entry.caloriesBurned && (
                                        <span className="text-sm text-orange-500 flex items-center gap-1">
                                            <Flame className="w-4 h-4" /> {entry.caloriesBurned} cal
                                        </span>
                                    )}
                                </div>
                                {entry.muscleExercises && entry.muscleExercises.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {entry.muscleExercises.map((ex, i) => (
                                            <span key={i} className="text-xs px-2 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                                {ex.name} • {ex.sets}×{ex.reps} @ {ex.weight}kg
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {entry.weight && (
                                    <p className="text-sm text-muted-foreground mt-2">Weight: {entry.weight} kg</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <div className="bg-card border-2 border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-teal-500" />
                                Log Workout
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-secondary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setModalTab("log")}
                                className={`flex-1 py-3 font-medium transition-colors ${modalTab === "log"
                                    ? "text-teal-500 border-b-2 border-teal-500"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                Quick Log
                            </button>
                            <button
                                onClick={() => setModalTab("workout")}
                                className={`flex-1 py-3 font-medium transition-colors ${modalTab === "workout"
                                    ? "text-teal-500 border-b-2 border-teal-500"
                                    : "text-muted-foreground"
                                    }`}
                            >
                                Full Workout
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto flex-1">
                            {modalTab === "log" && (
                                <div className="space-y-4">
                                    {/* Weight */}
                                    <div>
                                        <label className="text-sm font-medium mb-1 flex items-center gap-2">
                                            <Scale className="w-4 h-4" /> Weight (kg)
                                        </label>
                                        <input
                                            type="number"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="e.g., 75"
                                            step="0.1"
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-teal-500 outline-none"
                                        />
                                    </div>

                                    {/* Body Fat */}
                                    <div>
                                        <label className="text-sm font-medium mb-1 flex items-center gap-2">
                                            <Target className="w-4 h-4" /> Body Fat % (optional)
                                        </label>
                                        <input
                                            type="number"
                                            value={bodyFat}
                                            onChange={(e) => setBodyFat(e.target.value)}
                                            placeholder="e.g., 18"
                                            step="0.1"
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-teal-500 outline-none"
                                        />
                                    </div>

                                    {/* Cardio */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-medium mb-1 flex items-center gap-2">
                                                <Heart className="w-4 h-4" /> Cardio (min)
                                            </label>
                                            <input
                                                type="number"
                                                value={cardioMinutes}
                                                onChange={(e) => setCardioMinutes(e.target.value)}
                                                placeholder="30"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-teal-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 flex items-center gap-2">
                                                <Flame className="w-4 h-4" /> Calories
                                            </label>
                                            <input
                                                type="number"
                                                value={caloriesBurned}
                                                onChange={(e) => setCaloriesBurned(e.target.value)}
                                                placeholder="300"
                                                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-teal-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === "workout" && (
                                <div className="space-y-4">
                                    {/* Muscle Group Selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Target Muscle Group</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {MUSCLE_GROUPS.map((group) => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => {
                                                        setSelectedMuscleGroup(group.id);
                                                        setCurrentExercise({ ...currentExercise, name: "" });
                                                    }}
                                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selectedMuscleGroup === group.id
                                                        ? "bg-teal-500/20 border-2 border-teal-500"
                                                        : "bg-secondary border-2 border-transparent"
                                                        }`}
                                                >
                                                    <span>{group.emoji}</span>
                                                    <span className="text-xs">{group.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Exercise Selection */}
                                    {selectedMuscleGroup && (
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium">Exercise</label>
                                            <div className="flex flex-wrap gap-2">
                                                {EXERCISE_PRESETS[selectedMuscleGroup]?.map((ex) => (
                                                    <button
                                                        key={ex}
                                                        onClick={() => setCurrentExercise({ ...currentExercise, name: ex })}
                                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${currentExercise.name === ex
                                                            ? "bg-teal-500 text-white"
                                                            : "bg-secondary hover:bg-secondary/80"
                                                            }`}
                                                    >
                                                        {ex}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Sets, Reps, Weight OR Duration for cardio */}
                                            {selectedMuscleGroup === "cardio" ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Duration (min)</label>
                                                        <input
                                                            type="number"
                                                            value={currentExercise.sets}
                                                            onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) || 0 })}
                                                            placeholder="30"
                                                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-teal-500 outline-none text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Distance (km)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={currentExercise.weight}
                                                            onChange={(e) => setCurrentExercise({ ...currentExercise, weight: parseFloat(e.target.value) || 0 })}
                                                            placeholder="5"
                                                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-teal-500 outline-none text-center"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Sets</label>
                                                        <input
                                                            type="number"
                                                            value={currentExercise.sets}
                                                            onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-teal-500 outline-none text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Reps</label>
                                                        <input
                                                            type="number"
                                                            value={currentExercise.reps}
                                                            onChange={(e) => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-teal-500 outline-none text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium mb-1 block">Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            value={currentExercise.weight}
                                                            onChange={(e) => setCurrentExercise({ ...currentExercise, weight: parseFloat(e.target.value) || 0 })}
                                                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-background focus:border-teal-500 outline-none text-center"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={addExercise}
                                                disabled={!currentExercise.name}
                                                className="w-full py-2 rounded-xl bg-secondary hover:bg-secondary/80 font-medium disabled:opacity-50"
                                            >
                                                + Add Exercise
                                            </button>
                                        </div>
                                    )}

                                    {/* Added Exercises */}
                                    {exercises.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Added Exercises</label>
                                            {exercises.map((ex, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-teal-500/10">
                                                    <div>
                                                        <span className="font-medium">{ex.name}</span>
                                                        <span className="text-sm text-muted-foreground ml-2">
                                                            {ex.sets}×{ex.reps} @ {ex.weight}kg
                                                        </span>
                                                    </div>
                                                    <button onClick={() => removeExercise(i)} className="p-1 hover:bg-red-500/20 rounded">
                                                        <X className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border">
                            <button
                                onClick={handleSubmit}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold hover:scale-[1.02] transition-transform"
                            >
                                💪 Save Workout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
