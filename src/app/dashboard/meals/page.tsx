"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { MealLog } from "@/types";
import { Plus, X, ChevronLeft, ChevronRight, Flame, Clock, Check, Search, Leaf, AlertCircle } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const MEAL_TYPES = [
    { value: "breakfast", label: "Breakfast", emoji: "🍳", time: "7–10 AM",  bg: "#f97316", light: "rgba(249,115,22,0.12)" },
    { value: "lunch",     label: "Lunch",     emoji: "🍲", time: "12–2 PM",  bg: "#10b981", light: "rgba(16,185,129,0.12)" },
    { value: "dinner",    label: "Dinner",    emoji: "🍽️", time: "7–9 PM",   bg: "#8b5cf6", light: "rgba(139,92,246,0.12)" },
    { value: "snack",     label: "Snack",     emoji: "🍎", time: "Anytime",  bg: "#0ea5e9", light: "rgba(14,165,233,0.12)" },
] as const;

/* quality: "good" = whole food, "ok" = moderate, "limit" = processed */
const FOOD_DB: { food: string; cal: number; p: number; c: number; f: number; category: string; quality: "good" | "ok" | "limit" }[] = [
    // Staples/Grains
    { food: "Rice (1 bowl)",    cal: 200, p: 4,  c: 44, f: 1,  category: "staples",  quality: "ok"    },
    { food: "Roti (1 pc)",      cal: 70,  p: 3,  c: 14, f: 1,  category: "staples",  quality: "good"  },
    { food: "Naan (1 pc)",      cal: 260, p: 8,  c: 46, f: 5,  category: "staples",  quality: "ok"    },
    { food: "Paratha (1 pc)",   cal: 180, p: 4,  c: 22, f: 8,  category: "staples",  quality: "ok"    },
    { food: "Brown Rice",       cal: 215, p: 5,  c: 45, f: 2,  category: "staples",  quality: "good"  },
    { food: "Oats (1 bowl)",    cal: 150, p: 5,  c: 27, f: 3,  category: "staples",  quality: "good"  },
    { food: "Poha",             cal: 180, p: 3,  c: 36, f: 3,  category: "staples",  quality: "ok"    },
    // Proteins / Main
    { food: "Chicken Biryani",  cal: 450, p: 25, c: 52, f: 14, category: "main",     quality: "ok"    },
    { food: "Mutton Biryani",   cal: 500, p: 28, c: 52, f: 18, category: "main",     quality: "ok"    },
    { food: "Chicken Curry",    cal: 250, p: 28, c: 8,  f: 12, category: "main",     quality: "good"  },
    { food: "Mutton Curry",     cal: 320, p: 25, c: 6,  f: 20, category: "main",     quality: "ok"    },
    { food: "Butter Chicken",   cal: 380, p: 30, c: 12, f: 22, category: "main",     quality: "ok"    },
    { food: "Chicken Tikka",    cal: 200, p: 30, c: 4,  f: 8,  category: "main",     quality: "good"  },
    { food: "Fish Curry",       cal: 220, p: 24, c: 6,  f: 10, category: "main",     quality: "good"  },
    { food: "Egg Curry (2 eggs)", cal: 220, p: 14, c: 8, f: 14, category: "main",   quality: "good"  },
    { food: "Omelette (2 eggs)", cal: 180, p: 12, c: 1, f: 14, category: "main",    quality: "good"  },
    { food: "Boiled Eggs (2)",   cal: 140, p: 12, c: 1, f: 10, category: "main",    quality: "good"  },
    { food: "Paneer Bhurji",    cal: 280, p: 18, c: 8,  f: 20, category: "main",    quality: "good"  },
    { food: "Dal (1 bowl)",     cal: 150, p: 9,  c: 22, f: 3,  category: "sides",   quality: "good"  },
    // Fast food
    { food: "Chicken Burger",   cal: 450, p: 22, c: 40, f: 22, category: "fastfood", quality: "limit" },
    { food: "Chicken Shawarma", cal: 400, p: 24, c: 34, f: 18, category: "fastfood", quality: "limit" },
    { food: "Pizza (2 slices)", cal: 500, p: 20, c: 58, f: 20, category: "fastfood", quality: "limit" },
    { food: "French Fries",     cal: 320, p: 3,  c: 42, f: 16, category: "fastfood", quality: "limit" },
    { food: "Chicken Momos (8pc)", cal: 350, p: 18, c: 38, f: 12, category: "fastfood", quality: "limit" },
    { food: "Chicken Roll",     cal: 380, p: 20, c: 36, f: 16, category: "fastfood", quality: "limit" },
    // Sides / Veg
    { food: "Paneer (100g)",    cal: 265, p: 18, c: 4,  f: 20, category: "sides",   quality: "good"  },
    { food: "Raita",            cal: 80,  p: 4,  c: 8,  f: 3,  category: "sides",   quality: "good"  },
    { food: "Salad",            cal: 50,  p: 2,  c: 8,  f: 1,  category: "sides",   quality: "good"  },
    { food: "Palak (1 bowl)",   cal: 90,  p: 5,  c: 10, f: 3,  category: "sides",   quality: "good"  },
    // Drinks
    { food: "Lassi",            cal: 180, p: 6,  c: 28, f: 5,  category: "drinks",  quality: "ok"    },
    { food: "Cold Drink",       cal: 140, p: 0,  c: 36, f: 0,  category: "drinks",  quality: "limit" },
    { food: "Tea (1 cup)",      cal: 30,  p: 1,  c: 5,  f: 1,  category: "drinks",  quality: "ok"    },
    { food: "Mango Shake",      cal: 250, p: 5,  c: 48, f: 5,  category: "drinks",  quality: "ok"    },
    { food: "Black Coffee",     cal: 5,   p: 0,  c: 1,  f: 0,  category: "drinks",  quality: "good"  },
    { food: "Protein Shake",    cal: 150, p: 25, c: 8,  f: 3,  category: "drinks",  quality: "good"  },
    // Fruits
    { food: "Banana",           cal: 89,  p: 1,  c: 23, f: 0,  category: "fruits",  quality: "good"  },
    { food: "Apple",            cal: 52,  p: 0,  c: 14, f: 0,  category: "fruits",  quality: "good"  },
    { food: "Mango",            cal: 150, p: 2,  c: 36, f: 1,  category: "fruits",  quality: "good"  },
    { food: "Dates (5pc)",      cal: 140, p: 1,  c: 36, f: 0,  category: "fruits",  quality: "good"  },
    { food: "Pomegranate",      cal: 83,  p: 2,  c: 19, f: 1,  category: "fruits",  quality: "good"  },
];

const FOOD_CATS = [
    { id: "main",     label: "Protein", emoji: "🍗" },
    { id: "staples",  label: "Grains",  emoji: "🌾" },
    { id: "fastfood", label: "Fast",    emoji: "🍔" },
    { id: "sides",    label: "Sides",   emoji: "🫙" },
    { id: "drinks",   label: "Drinks",  emoji: "🥤" },
    { id: "fruits",   label: "Fruits",  emoji: "🍎" },
];

const CALORIE_GOAL = 2000;
const PROTEIN_GOAL = 120; // grams
const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R;

const qualityColor = { good: "#10b981", ok: "#f59e0b", limit: "#ef4444" };
const qualityLabel = { good: "Whole food", ok: "Moderate", limit: "Processed" };

export default function MealsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [meals, setMeals]             = useState<MealLog[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showForm, setShowForm]       = useState(false);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showGuide, setShowGuide]     = useState(false);
    const [guideSearch, setGuideSearch] = useState("");
    const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState("main");

    const [formType, setFormType]               = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
    const [formDescription, setFormDescription] = useState("");
    const [formCalories, setFormCalories]       = useState("");
    const [formTime, setFormTime]               = useState(format(new Date(), "HH:mm"));

    const today     = getToday();
    const yesterday = format(subDays(parseISO(today), 1), "yyyy-MM-dd");

    const loadMeals = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.mealLogs.where("date").equals(selectedDate).toArray();
            setMeals(all.sort((a, b) => a.time.localeCompare(b.time)));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [user?.id, selectedDate]);

    useEffect(() => { loadMeals(); }, [loadMeals]);

    const goToDate = (days: number) => {
        const n = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (n > today) return;
        setSelectedDate(n);
    };

    // Track selected foods' macros
    const [formMacros, setFormMacros] = useState({ p: 0, c: 0, f: 0 });

    const toggleFood = (food: string) => {
        const next = new Set(selectedFoods);
        if (next.has(food)) next.delete(food); else next.add(food);
        setSelectedFoods(next);
        let cal = 0, p = 0, c = 0, f = 0;
        const names: string[] = [];
        next.forEach(fn => {
            const item = FOOD_DB.find(g => g.food === fn);
            if (item) { cal += item.cal; p += item.p; c += item.c; f += item.f; names.push(fn); }
        });
        setFormCalories(cal > 0 ? String(cal) : "");
        setFormMacros({ p, c, f });
        if (names.length > 0) setFormDescription(names.join(", "));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formDescription.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const meal: MealLog = {
                id: generateId(), userId: user.id, date: selectedDate, type: formType,
                description: formDescription.trim(),
                calories: formCalories ? parseInt(formCalories) : undefined,
                time: formTime, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
            };
            await db.mealLogs.add(meal);
            toast({ title: "Meal logged" });
            setShowForm(false);
            setFormDescription(""); setFormCalories(""); setSelectedFoods(new Set()); setFormMacros({ p: 0, c: 0, f: 0 }); setShowGuide(false);
            loadMeals();
            syncToCloud(user.id, "mealLogs");
        } catch { toast({ title: "Failed to log meal", variant: "destructive" }); }
    };

    const deleteMeal = async (mealId: string) => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            await db.mealLogs.delete(mealId);
            toast({ title: "Removed" });
            loadMeals();
            syncToCloud(user.id, "mealLogs");
        } catch { /* ignore */ }
    };

    const totalCalories  = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const calorieProgress = Math.min(totalCalories / CALORIE_GOAL, 1);
    const canEdit = selectedDate === today || selectedDate === yesterday;

    // Nutrition quality score based on meals
    const goodMeals = meals.filter(m => {
        const q = FOOD_DB.find(f => m.description.toLowerCase().includes(f.food.toLowerCase()))?.quality;
        return q === "good";
    }).length;
    const nutritionScore = meals.length > 0 ? Math.round((goodMeals / meals.length) * 100) : 0;

    const filteredGuide = FOOD_DB.filter(f =>
        f.category === activeCategory &&
        (guideSearch === "" || f.food.toLowerCase().includes(guideSearch.toLowerCase()))
    );

    const nutritionTip = totalCalories === 0
        ? "Start by logging your first meal of the day."
        : totalCalories < 1000
        ? "You&apos;re below half your calorie goal — make sure you&apos;re eating enough."
        : totalCalories > CALORIE_GOAL
        ? "You&apos;ve exceeded your daily goal. Consider lighter portions next meal."
        : meals.filter(m => m.type === "breakfast").length === 0
        ? "Don&apos;t skip breakfast — it sets your metabolism for the day."
        : "Great progress! Keep meals balanced with protein, grains, and vegetables.";

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-12 h-12 rounded-full border-2 border-orange-500/30 border-t-orange-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <div
                className="relative rounded-3xl overflow-hidden"
                style={{ background: "linear-gradient(135deg,#1c0a00 0%,#3d1500 40%,#1c0a00 100%)" }}
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl" style={{ transform: "translate(33%,-33%)" }} />

                <div className="relative p-5 flex items-center gap-5">
                    {/* Calorie ring */}
                    <div className="flex-shrink-0 relative">
                        <svg width="120" height="120" viewBox="0 0 128 128" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="64" cy="64" r={RING_R} stroke="rgba(255,255,255,0.07)" strokeWidth="9" fill="none" />
                            <circle
                                cx="64" cy="64" r={RING_R}
                                stroke="url(#mealGrad)"
                                strokeWidth="9"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRC}
                                style={{
                                    strokeDashoffset: RING_CIRC * (1 - calorieProgress),
                                    transition: "stroke-dashoffset 1s ease-out",
                                }}
                            />
                            <defs>
                                <linearGradient id="mealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#fb923c" />
                                    <stop offset="100%" stopColor="#f59e0b" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white leading-none">{totalCalories}</span>
                            <span className="text-[10px] text-white/40">kcal</span>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex-1 min-w-0">
                        <p className="text-orange-400/60 text-[10px] font-semibold tracking-widest uppercase mb-1">Daily Nutrition</p>
                        <h1 className="text-xl font-black text-white leading-tight">
                            {totalCalories >= CALORIE_GOAL ? "Goal Reached!" : `${CALORIE_GOAL - totalCalories} kcal left`}
                        </h1>
                        <p className="text-white/40 text-xs mt-0.5">Goal: {CALORIE_GOAL} kcal · {meals.length} meals</p>

                        {/* Macro bars */}
                        <div className="mt-3 space-y-1.5">
                            {[
                                { label: "Carbs", goal: 250, icon: "🌾", color: "#f59e0b" },
                                { label: "Protein", goal: PROTEIN_GOAL, icon: "💪", color: "#10b981" },
                                { label: "Fat", goal: 65, icon: "🫒", color: "#8b5cf6" },
                            ].map(macro => (
                                <div key={macro.label} className="flex items-center gap-2">
                                    <span className="text-[10px] text-white/30 w-10 text-right font-medium">{macro.label}</span>
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ background: macro.color, width: "0%", transition: "width 1s ease-out" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Add button */}
                <button
                    onClick={() => setShowForm(true)}
                    disabled={!canEdit}
                    className="absolute top-5 right-5 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg disabled:opacity-40"
                >
                    <Plus className="w-4 h-4" /> Log
                </button>
            </div>

            {/* ── NUTRITION TIP ── */}
            {meals.length >= 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/8 border border-orange-500/15">
                    <Leaf className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-200/70">{nutritionTip}</p>
                </div>
            )}

            {/* ── DATE NAV ── */}
            <div className="flex items-center gap-2">
                <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl bg-card border border-border hover:border-orange-500/40 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center py-2.5 bg-card border border-border rounded-xl">
                    <p className="font-semibold text-sm">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <p className="text-xs text-orange-500 font-medium">Today</p>}
                </div>
                <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl bg-card border border-border hover:border-orange-500/40 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* ── MEAL SECTIONS ── */}
            <div className="space-y-3">
                {MEAL_TYPES.map((type, idx) => {
                    const typeMeals = meals.filter(m => m.type === type.value);
                    const typeKcal  = typeMeals.reduce((s, m) => s + (m.calories || 0), 0);
                    return (
                        <motion.div
                            key={type.value}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.07 }}
                            className="bg-card border border-border rounded-2xl overflow-hidden"
                        >
                            {/* Section header */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: type.light }}>
                                    {type.emoji}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{type.label}</p>
                                    <p className="text-xs text-muted-foreground">{type.time}</p>
                                </div>
                                {typeKcal > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Flame className="w-3.5 h-3.5" style={{ color: type.bg }} />
                                        <span className="text-sm font-bold" style={{ color: type.bg }}>{typeKcal}</span>
                                        <span className="text-xs text-muted-foreground">kcal</span>
                                    </div>
                                )}
                            </div>

                            {/* Meal entries */}
                            <div className="p-3">
                                {typeMeals.length === 0 ? (
                                    <p className="text-xs text-muted-foreground/50 text-center py-2">Not logged yet</p>
                                ) : (
                                    <div className="space-y-2">
                                        {typeMeals.map(meal => (
                                            <div key={meal.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 group">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{meal.description}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">{meal.time}</span>
                                                        {meal.calories && (
                                                            <span className="text-xs font-semibold" style={{ color: type.bg }}>{meal.calories} kcal</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => deleteMeal(meal.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {canEdit && (
                                    <button
                                        onClick={() => { setFormType(type.value as typeof formType); setShowForm(true); }}
                                        className="w-full mt-2 py-2 rounded-xl border border-dashed border-border/50 hover:border-orange-500/40 text-xs text-muted-foreground hover:text-orange-500 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add {type.label}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── LOG MEAL MODAL ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-card rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto border border-border"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-border bg-card/95 backdrop-blur-sm rounded-t-3xl">
                                <div>
                                    <h2 className="text-lg font-black">Log Meal</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Track what you eat</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-secondary">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                                {/* Meal type */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Meal Type</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {MEAL_TYPES.map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormType(type.value as typeof formType)}
                                                className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-xs font-semibold"
                                                style={{
                                                    borderColor: formType === type.value ? type.bg : "transparent",
                                                    background: formType === type.value ? type.light : "var(--secondary)",
                                                    color: formType === type.value ? type.bg : undefined,
                                                }}
                                            >
                                                <span className="text-xl">{type.emoji}</span>
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">What did you eat?</label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="e.g. Chicken Biryani, 2 Rotis, Dal..."
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm transition-colors"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Calories + Food guide toggle */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Calories {selectedFoods.size > 0 && <span className="text-orange-500 normal-case">({selectedFoods.size} items)</span>}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => { setShowGuide(g => !g); setGuideSearch(""); }}
                                            className="text-xs text-orange-500 font-bold px-2.5 py-1 rounded-lg bg-orange-500/10 flex items-center gap-1"
                                        >
                                            {showGuide ? <X className="w-3 h-3" /> : <Search className="w-3 h-3" />}
                                            {showGuide ? "Close" : "Food Guide"}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        value={formCalories}
                                        onChange={e => setFormCalories(e.target.value)}
                                        placeholder="Total kcal (or pick from guide below)"
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm font-medium transition-colors"
                                    />

                                    {/* Macro preview */}
                                    {(formMacros.p > 0 || formMacros.c > 0 || formMacros.f > 0) && (
                                        <div className="flex gap-3 mt-2 px-1">
                                            {[
                                                { label: "Protein", val: formMacros.p, color: "#10b981" },
                                                { label: "Carbs",   val: formMacros.c, color: "#f59e0b" },
                                                { label: "Fat",     val: formMacros.f, color: "#8b5cf6" },
                                            ].map(m => (
                                                <div key={m.label} className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                                                    <span className="text-xs text-muted-foreground">{m.label} <span className="font-bold" style={{ color: m.color }}>{m.val}g</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Food guide panel */}
                                    <AnimatePresence>
                                        {showGuide && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 rounded-xl border border-orange-500/20 overflow-hidden bg-card"
                                            >
                                                {/* Search */}
                                                <div className="flex items-center gap-2 p-2 border-b border-border">
                                                    <Search className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                                                    <input
                                                        type="text"
                                                        value={guideSearch}
                                                        onChange={e => setGuideSearch(e.target.value)}
                                                        placeholder="Search food..."
                                                        className="flex-1 bg-transparent text-xs outline-none"
                                                    />
                                                </div>
                                                {/* Category tabs */}
                                                {!guideSearch && (
                                                    <div className="flex overflow-x-auto gap-1 p-2 border-b border-border scrollbar-hide">
                                                        {FOOD_CATS.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => setActiveCategory(cat.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${activeCategory === cat.id ? "bg-orange-500 text-white" : "bg-secondary"}`}
                                                            >
                                                                {cat.emoji} {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Food items */}
                                                <div className="p-2 max-h-52 overflow-y-auto space-y-1">
                                                    {(guideSearch
                                                        ? FOOD_DB.filter(f => f.food.toLowerCase().includes(guideSearch.toLowerCase()))
                                                        : filteredGuide
                                                    ).map(item => {
                                                        const sel = selectedFoods.has(item.food);
                                                        return (
                                                            <button
                                                                key={item.food}
                                                                type="button"
                                                                onClick={() => toggleFood(item.food)}
                                                                className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-left text-xs transition-all ${sel ? "bg-orange-500/15 border border-orange-500/40" : "bg-secondary/60 hover:bg-secondary border border-transparent"}`}
                                                            >
                                                                {/* Quality dot */}
                                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: qualityColor[item.quality] }} title={qualityLabel[item.quality]} />
                                                                <span className="flex-1 font-medium">{item.food}</span>
                                                                <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                                                                    <span>P:{item.p}g</span>
                                                                    <span className="font-bold text-orange-400">{item.cal}kcal</span>
                                                                </div>
                                                                {sel && <Check className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {/* Legend */}
                                                <div className="p-2 border-t border-border flex items-center gap-4">
                                                    {(["good", "ok", "limit"] as const).map(q => (
                                                        <div key={q} className="flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full" style={{ background: qualityColor[q] }} />
                                                            <span className="text-[10px] text-muted-foreground">{qualityLabel[q]}</span>
                                                        </div>
                                                    ))}
                                                    {selectedFoods.size > 0 && (
                                                        <button type="button" onClick={() => { setSelectedFoods(new Set()); setFormCalories(""); setFormMacros({ p: 0, c: 0, f: 0 }); }} className="ml-auto text-[10px] text-orange-500 font-bold">Clear</button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Time */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formTime}
                                        onChange={e => setFormTime(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm font-medium transition-colors"
                                    />
                                </div>

                                <div className="flex gap-3 pt-1 pb-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-xl bg-secondary font-semibold text-sm">Cancel</button>
                                    <button type="submit" className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-lg">
                                        Log Meal
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
