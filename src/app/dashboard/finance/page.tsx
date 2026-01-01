"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/types";
import { Wallet, Plus, X, Calendar, Trash2, IndianRupee, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";

const CATEGORIES = [
    { value: "food", label: "Food", emoji: "🍔" },
    { value: "transport", label: "Transport", emoji: "🚗" },
    { value: "shopping", label: "Shopping", emoji: "🛒" },
    { value: "bills", label: "Bills", emoji: "💡" },
    { value: "entertainment", label: "Fun", emoji: "🎬" },
    { value: "health", label: "Health", emoji: "💊" },
    { value: "education", label: "Education", emoji: "📚" },
    { value: "other", label: "Other", emoji: "📦" },
];

type ViewMode = "today" | "daily" | "monthly";

export default function FinancePage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("today");
    const [selectedDate, setSelectedDate] = useState(getToday());

    // Form state
    const [formAmount, setFormAmount] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formCategory, setFormCategory] = useState("food");
    const [formDate, setFormDate] = useState(getToday());

    const today = getToday();
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const loadExpenses = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.expenses.toArray();
            setAllExpenses(all);

            // Filter based on view mode
            let filtered: Expense[];
            if (viewMode === "today") {
                filtered = all.filter(e => e.date === today);
            } else if (viewMode === "daily") {
                filtered = all.filter(e => e.date === selectedDate);
            } else {
                filtered = all.filter(e => e.date >= monthStart && e.date <= monthEnd);
            }

            setExpenses(filtered.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
            ));
        } catch (error) {
            console.error("Failed to load expenses:", error);
        } finally {
            setLoading(false);
        }
    }, [user, viewMode, selectedDate, today, monthStart, monthEnd]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    const goToDate = (days: number) => {
        const newDate = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (newDate > today) return;
        setSelectedDate(newDate);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formAmount || !formDescription.trim()) return;

        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();

            const expense: Expense = {
                id: generateId(),
                userId: user.id,
                date: formDate,
                amount: parseFloat(formAmount),
                currency: "INR",
                category: formCategory,
                description: formDescription.trim(),
                isRecurring: false,
                createdAt: now,
                updatedAt: now,
                syncStatus: "pending",
                version: 1,
            };

            await db.expenses.add(expense);
            toast({ title: "Expense added! 💰" });
            setShowForm(false);
            setFormAmount("");
            setFormDescription("");
            setFormCategory("food");
            setFormDate(getToday());
            loadExpenses();
            syncToCloud(user.id, "expenses");
        } catch (error) {
            console.error("Failed to add expense:", error);
            toast({ title: "Failed to add expense", variant: "destructive" });
        }
    };

    const deleteExpense = async (expenseId: string) => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            await db.expenses.delete(expenseId);
            toast({ title: "Expense deleted" });
            loadExpenses();
            syncToCloud(user.id, "expenses");
        } catch (error) {
            console.error("Failed to delete expense:", error);
        }
    };

    // Calculate stats
    const currentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthExpenses = allExpenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // Daily breakdown for monthly view
    const dailyTotals = new Map<string, number>();
    if (viewMode === "monthly") {
        monthExpenses.forEach(e => {
            dailyTotals.set(e.date, (dailyTotals.get(e.date) || 0) + e.amount);
        });
    }

    const getCategoryInfo = (category: string) =>
        CATEGORIES.find((c) => c.value === category) || CATEGORIES[7];

    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-20 md:pb-6">
            {/* Header - Muted Gold Matte */}
            <div className="flex items-center justify-between relative">
                <h1 className="text-2xl font-bold flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-700 text-white shadow-lg">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-slate-800 dark:text-slate-100">Money</span>
                </h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-700 text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            </div>

            {/* View Mode Tabs - Matte */}
            <div className="flex gap-2">
                {[
                    { id: "today", label: "Today" },
                    { id: "daily", label: "By Date" },
                    { id: "monthly", label: "Monthly" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id as ViewMode)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${viewMode === tab.id
                            ? "bg-gradient-to-r from-amber-600 to-yellow-700 text-white shadow-lg"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Date Navigation (for daily view) - Matte */}
            {viewMode === "daily" && (
                <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-2xl p-3 border border-amber-200 dark:border-amber-800">
                    <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-amber-900/50 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    </button>
                    <div className="text-center">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                        {selectedDate === today && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Today</span>}
                    </div>
                    <button
                        onClick={() => goToDate(1)}
                        disabled={selectedDate >= today}
                        className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-amber-900/50 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    </button>
                </div>
            )}

            {/* Stats - Matte */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                        <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm text-amber-700 dark:text-amber-400">
                            {viewMode === "monthly" ? "This Month" : viewMode === "daily" ? "This Day" : "Today"}
                        </span>
                    </div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatINR(currentTotal)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/30 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Month Total</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatINR(monthTotal)}</p>
                </div>
            </div>

            {/* Daily Breakdown (monthly view) */}
            {viewMode === "monthly" && dailyTotals.size > 0 && (
                <div className="bg-card border-2 border-border rounded-xl p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Daily Spending
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Array.from(dailyTotals.entries())
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .map(([date, amount]) => (
                                <button
                                    key={date}
                                    onClick={() => {
                                        setSelectedDate(date);
                                        setViewMode("daily");
                                    }}
                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                                >
                                    <span className="text-sm font-medium">{format(parseISO(date), "EEE, MMM d")}</span>
                                    <span className="font-bold text-red-500">-{formatINR(amount)}</span>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {Object.keys(categoryTotals).length > 0 && (
                <div className="bg-card border-2 border-border rounded-xl p-4">
                    <h3 className="font-semibold mb-3">By Category</h3>
                    <div className="space-y-3">
                        {Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, amount]) => {
                                const info = getCategoryInfo(category);
                                const percentage = (amount / currentTotal) * 100;
                                return (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="flex items-center gap-2 text-sm font-medium">
                                                <span>{info.emoji}</span>
                                                <span>{info.label}</span>
                                            </span>
                                            <span className="font-bold">{formatINR(amount)}</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Expenses List */}
            <div className="bg-card border-2 border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Expenses</h3>
                {expenses.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6 text-sm">No expenses recorded</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {expenses.slice(0, 20).map((expense) => {
                            const info = getCategoryInfo(expense.category);
                            return (
                                <div
                                    key={expense.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                                >
                                    <span className="text-xl">{info.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{expense.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(parseISO(expense.date), "MMM d")} • {info.label}
                                        </p>
                                    </div>
                                    <p className="font-bold text-red-500 text-sm">-{formatINR(expense.amount)}</p>
                                    <button
                                        onClick={() => deleteExpense(expense.id)}
                                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Expense Modal - Gold Theme */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-card border-t-4 border-amber-500 rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 flex items-center justify-between p-4 border-b border-amber-200 dark:border-amber-800">
                            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">💸 Add Expense</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Amount (₹)</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        step="1"
                                        value={formAmount}
                                        onChange={(e) => setFormAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-emerald-500 outline-none text-lg font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Description</label>
                                <input
                                    type="text"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="What did you spend on?"
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Category</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setFormCategory(cat.value)}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${formCategory === cat.value
                                                ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                                                : "bg-secondary"
                                                }`}
                                        >
                                            <span className="text-lg">{cat.emoji}</span>
                                            <span className="text-[10px] font-medium">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1.5">Date</label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    max={getToday()}
                                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-emerald-500 outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 rounded-xl bg-secondary font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold"
                                >
                                    Add Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
