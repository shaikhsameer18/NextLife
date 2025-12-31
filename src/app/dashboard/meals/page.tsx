"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { MealLog } from "@/types";
import { Utensils, Plus, X, ChevronLeft, ChevronRight, Flame, Clock, Check } from "lucide-react";
import { format, parseISO, subDays, addDays } from "date-fns";

const MEAL_TYPES = [
    { value: "breakfast", label: "Breakfast", emoji: "🍳", time: "6-10 AM" },
    { value: "lunch", label: "Lunch", emoji: "🍲", time: "12-2 PM" },
    { value: "dinner", label: "Dinner", emoji: "🍽️", time: "7-9 PM" },
    { value: "snack", label: "Snack", emoji: "🍎", time: "Anytime" },
];

// Halal/Non-Veg Indian Food Calorie Guide
const CALORIE_GUIDE = [
    // Rice & Bread
    { food: "Rice (1 bowl)", cal: 200, category: "staples" },
    { food: "Roti (1 pc)", cal: 70, category: "staples" },
    { food: "Naan (1 pc)", cal: 260, category: "staples" },
    { food: "Paratha (1 pc)", cal: 180, category: "staples" },
    { food: "Fried Rice", cal: 350, category: "staples" },

    // Non-Veg Mains
    { food: "Chicken Biryani", cal: 450, category: "main" },
    { food: "Mutton Biryani", cal: 500, category: "main" },
    { food: "Chicken Curry", cal: 250, category: "main" },
    { food: "Mutton Curry", cal: 320, category: "main" },
    { food: "Chicken Kebab (4pc)", cal: 280, category: "main" },
    { food: "Seekh Kebab (4pc)", cal: 300, category: "main" },
    { food: "Butter Chicken", cal: 380, category: "main" },
    { food: "Chicken Tikka", cal: 200, category: "main" },
    { food: "Fish Fry", cal: 220, category: "main" },
    { food: "Egg Curry (2 eggs)", cal: 220, category: "main" },
    { food: "Omelette (2 eggs)", cal: 180, category: "main" },

    // Fast Food
    { food: "Chicken Burger", cal: 450, category: "fastfood" },
    { food: "Chicken Shawarma", cal: 400, category: "fastfood" },
    { food: "Pizza (2 slices)", cal: 500, category: "fastfood" },
    { food: "French Fries", cal: 320, category: "fastfood" },
    { food: "Chicken Momos (8pc)", cal: 350, category: "fastfood" },
    { food: "Fried Chicken (2pc)", cal: 400, category: "fastfood" },
    { food: "Chicken Roll", cal: 380, category: "fastfood" },

    // Dal & Veg
    { food: "Dal (1 bowl)", cal: 150, category: "sides" },
    { food: "Paneer (100g)", cal: 265, category: "sides" },
    { food: "Raita", cal: 80, category: "sides" },
    { food: "Salad", cal: 50, category: "sides" },

    // Drinks & Snacks
    { food: "Lassi", cal: 180, category: "drinks" },
    { food: "Cold Drink", cal: 140, category: "drinks" },
    { food: "Tea (1 cup)", cal: 30, category: "drinks" },
    { food: "Coffee", cal: 5, category: "drinks" },
    { food: "Mango Shake", cal: 250, category: "drinks" },

    // Fruits
    { food: "Banana", cal: 89, category: "fruits" },
    { food: "Apple", cal: 52, category: "fruits" },
    { food: "Mango", cal: 150, category: "fruits" },
    { food: "Dates (5pc)", cal: 140, category: "fruits" },
];

const CATEGORIES = [
    { id: "staples", label: "Rice/Bread" },
    { id: "main", label: "Non-Veg" },
    { id: "fastfood", label: "Fast Food" },
    { id: "sides", label: "Sides" },
    { id: "drinks", label: "Drinks" },
    { id: "fruits", label: "Fruits" },
];

export default function MealsPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [meals, setMeals] = useState<MealLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showCalorieGuide, setShowCalorieGuide] = useState(false);
    const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState("main");

    // Form state
    const [formType, setFormType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
    const [formDescription, setFormDescription] = useState("");
    const [formCalories, setFormCalories] = useState("");
    const [formTime, setFormTime] = useState(format(new Date(), "HH:mm"));

    const today = getToday();
    const yesterday = format(subDays(parseISO(today), 1), "yyyy-MM-dd");

    const loadMeals = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const allMeals = await db.mealLogs.where("date").equals(selectedDate).toArray();
            setMeals(allMeals.sort((a, b) => a.time.localeCompare(b.time)));
        } catch (error) {
            console.error("Failed to load meals:", error);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate]);

    useEffect(() => {
        loadMeals();
    }, [loadMeals]);

    const goToDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const toggleFood = (food: string, cal: number) => {
        const newSelected = new Set(selectedFoods);
        if (newSelected.has(food)) {
            newSelected.delete(food);
        } else {
            newSelected.add(food);
        }
        setSelectedFoods(newSelected);

        // Calculate total calories
        let total = 0;
        const foods: string[] = [];
        newSelected.forEach(f => {
            const item = CALORIE_GUIDE.find(g => g.food === f);
            if (item) {
                total += item.cal;
                foods.push(f);
            }
        });
        setFormCalories(total > 0 ? String(total) : "");
        if (foods.length > 0 && !formDescription) {
            setFormDescription(foods.join(", "));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formDescription.trim()) return;

        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();

            const meal: MealLog = {
                id: generateId(),
                userId: user.id,
                date: selectedDate,
                type: formType,
                description: formDescription.trim(),
                calories: formCalories ? parseInt(formCalories) : undefined,
                time: formTime,
                createdAt: now,
                updatedAt: now,
                syncStatus: "pending",
                version: 1,
            };

            await db.mealLogs.add(meal);
            toast({ title: "Meal logged! 🍽️" });
            setShowForm(false);
            setFormDescription("");
            setFormCalories("");
            setSelectedFoods(new Set());
            loadMeals();
        } catch (error) {
            console.error("Failed to add meal:", error);
            toast({ title: "Failed to add meal", variant: "destructive" });
        }
    };

    const deleteMeal = async (mealId: string) => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            await db.mealLogs.delete(mealId);
            toast({ title: "Meal deleted" });
            loadMeals();
        } catch (error) {
            console.error("Failed to delete meal:", error);
        }
    };

    const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const getMealTypeInfo = (type: string) => MEAL_TYPES.find(t => t.value === type) || MEAL_TYPES[3];
    const filteredFoods = CALORIE_GUIDE.filter(f => f.category === activeCategory);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-orange-700 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-4">
            {/* Header - Terracotta Matte */}
            <div className="flex items-center justify-between gap-2 relative">
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                    <div className="p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-gradient-to-br from-orange-600 to-amber-700 text-white shadow-lg">
                        <Utensils className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <span className="text-slate-800 dark:text-slate-100">Meals</span>
                </h1>
                <button
                    onClick={() => setShowForm(true)}
                    disabled={selectedDate !== today && selectedDate !== yesterday}
                    className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Meal</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>

            {/* Date Navigation - Matte */}
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 rounded-2xl p-3 border border-orange-200 dark:border-orange-800">
                <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-orange-900/50 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                </button>
                <div className="text-center">
                    <p className="font-semibold text-sm md:text-base text-slate-700 dark:text-slate-200">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                    {selectedDate === today && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Today</span>}
                </div>
                <button
                    onClick={() => goToDate(1)}
                    disabled={selectedDate >= today}
                    className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-orange-900/50 disabled:opacity-30 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                </button>
            </div>

            {/* Total Calories - Matte */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <span className="font-semibold text-sm md:text-base text-slate-700 dark:text-slate-200">Total</span>
                    </div>
                    <span className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">{totalCalories} kcal</span>
                </div>
            </div>

            {/* Meals by Type */}
            {MEAL_TYPES.map((mealType) => {
                const typeMeals = meals.filter(m => m.type === mealType.value);
                const typeCalories = typeMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

                return (
                    <div key={mealType.value} className="bg-card border border-border rounded-xl p-3 md:p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{mealType.emoji}</span>
                                <span className="font-semibold text-sm md:text-base">{mealType.label}</span>
                            </div>
                            {typeCalories > 0 && (
                                <span className="text-xs md:text-sm font-medium text-orange-500">{typeCalories} kcal</span>
                            )}
                        </div>

                        {typeMeals.length === 0 ? (
                            <p className="text-xs md:text-sm text-muted-foreground">Not logged</p>
                        ) : (
                            <div className="space-y-2">
                                {typeMeals.map((meal) => (
                                    <div
                                        key={meal.id}
                                        className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-secondary/50"
                                    >
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="font-medium text-sm truncate">{meal.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {meal.time}
                                                {meal.calories && <span className="text-orange-500">• {meal.calories} kcal</span>}
                                            </div>
                                        </div>
                                        {(selectedDate === today || selectedDate === yesterday) && (
                                            <button
                                                onClick={() => deleteMeal(meal.id)}
                                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add Meal Modal - Terracotta Theme */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-card border-t-4 border-orange-500 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] md:max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 flex items-center justify-between p-4 border-b border-orange-200 dark:border-orange-800">
                            <h2 className="text-lg font-bold text-orange-800 dark:text-orange-200">🍽️ Log Meal</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Meal Type */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Meal Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {MEAL_TYPES.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormType(type.value as typeof formType)}
                                            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${formType === type.value
                                                ? "bg-gradient-to-br from-orange-500 to-red-500 text-white"
                                                : "bg-secondary"
                                                }`}
                                        >
                                            <span className="text-lg">{type.emoji}</span>
                                            <span className="text-[10px] font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5">What did you eat?</label>
                                <input
                                    type="text"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="e.g., Chicken Biryani, Roti"
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm"
                                    required
                                />
                            </div>

                            {/* Calories with Guide */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-semibold">
                                        Calories {selectedFoods.size > 0 && `(${selectedFoods.size} items)`}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCalorieGuide(!showCalorieGuide)}
                                        className="text-xs text-orange-500 font-medium"
                                    >
                                        {showCalorieGuide ? "Hide" : "Food Guide"}
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={formCalories}
                                    onChange={(e) => setFormCalories(e.target.value)}
                                    placeholder="Enter or select from guide below"
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm font-medium"
                                />

                                {showCalorieGuide && (
                                    <div className="mt-3 rounded-xl bg-orange-500/5 border border-orange-500/20 overflow-hidden">
                                        {/* Category tabs */}
                                        <div className="flex overflow-x-auto gap-1 p-2 border-b border-orange-500/10">
                                            {CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setActiveCategory(cat.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat.id
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-secondary"
                                                        }`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Food items */}
                                        <div className="p-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                                            {filteredFoods.map((item) => {
                                                const isSelected = selectedFoods.has(item.food);
                                                return (
                                                    <button
                                                        key={item.food}
                                                        type="button"
                                                        onClick={() => toggleFood(item.food, item.cal)}
                                                        className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-all ${isSelected
                                                            ? "bg-orange-500 text-white"
                                                            : "bg-secondary hover:bg-secondary/80"
                                                            }`}
                                                    >
                                                        <span className="truncate flex-1">{item.food}</span>
                                                        <span className={`ml-1 font-bold ${isSelected ? "text-white" : "text-orange-500"}`}>
                                                            {item.cal}
                                                        </span>
                                                        {isSelected && <Check className="w-3 h-3 ml-1" />}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {selectedFoods.size > 0 && (
                                            <div className="p-2 border-t border-orange-500/10 flex items-center justify-between bg-orange-500/10">
                                                <span className="text-xs font-medium">{selectedFoods.size} items selected</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFoods(new Set());
                                                        setFormCalories("");
                                                    }}
                                                    className="text-xs text-orange-500 font-semibold"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Time</label>
                                <input
                                    type="time"
                                    value={formTime}
                                    onChange={(e) => setFormTime(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-orange-500 outline-none text-sm"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2 pb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 rounded-xl bg-secondary font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold"
                                >
                                    Log Meal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
