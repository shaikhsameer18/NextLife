"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/types";
import { Plus, X, Calendar, Trash2, IndianRupee, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";

const CATEGORIES = [
    { value: "food",          label: "Food",      emoji: "🍔", color: "#f97316", bg: "rgba(249,115,22,0.15)"  },
    { value: "transport",     label: "Transport", emoji: "🚗", color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
    { value: "shopping",      label: "Shopping",  emoji: "🛒", color: "#c084fc", bg: "rgba(192,132,252,0.15)" },
    { value: "bills",         label: "Bills",     emoji: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.15)"  },
    { value: "entertainment", label: "Fun",       emoji: "🎬", color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
    { value: "health",        label: "Health",    emoji: "💊", color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
    { value: "education",     label: "Study",     emoji: "📚", color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
    { value: "other",         label: "Other",     emoji: "📦", color: "#94a3b8", bg: "rgba(148,163,184,0.15)" },
] as const;

type ViewMode = "today" | "daily" | "monthly";

const getCat = (v: string) => CATEGORIES.find(c => c.value === v) ?? CATEGORIES[7];
const formatINR = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function FinancePage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [expenses, setExpenses]       = useState<Expense[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showForm, setShowForm]       = useState(false);
    const [viewMode, setViewMode]       = useState<ViewMode>("today");
    const [selectedDate, setSelectedDate] = useState(getToday());

    const [formAmount,      setFormAmount]      = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formCategory,    setFormCategory]    = useState("food");
    const [formDate,        setFormDate]        = useState(getToday());

    const today      = getToday();
    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd   = format(endOfMonth(new Date()),   "yyyy-MM-dd");

    const loadExpenses = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.expenses.toArray();
            setAllExpenses(all);
            let filtered: Expense[];
            if (viewMode === "today")      filtered = all.filter(e => e.date === today);
            else if (viewMode === "daily") filtered = all.filter(e => e.date === selectedDate);
            else                           filtered = all.filter(e => e.date >= monthStart && e.date <= monthEnd);
            setExpenses(filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id, viewMode, selectedDate, today, monthStart, monthEnd]);

    useEffect(() => { loadExpenses(); }, [loadExpenses]);

    const goToDate = (days: number) => {
        const n = days > 0
            ? format(addDays(parseISO(selectedDate), days), "yyyy-MM-dd")
            : format(subDays(parseISO(selectedDate), Math.abs(days)), "yyyy-MM-dd");
        if (n > today) return;
        setSelectedDate(n);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formAmount || !formDescription.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const expense: Expense = {
                id: generateId(), userId: user.id, date: formDate,
                amount: parseFloat(formAmount), currency: "INR",
                category: formCategory, description: formDescription.trim(),
                isRecurring: false, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
            };
            await db.expenses.add(expense);
            toast({ title: "Expense added" });
            setShowForm(false);
            setFormAmount(""); setFormDescription(""); setFormCategory("food"); setFormDate(getToday());
            loadExpenses();
            syncToCloud(user.id, "expenses");
        } catch { toast({ title: "Failed", variant: "destructive" }); }
    };

    const deleteExpense = async (id: string) => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            await db.expenses.delete(id);
            toast({ title: "Deleted" });
            loadExpenses();
            syncToCloud(user.id, "expenses");
        } catch { /* ignore */ }
    };

    /* ── Computed ── */
    const currentTotal    = expenses.reduce((s, e) => s + e.amount, 0);
    const monthExpenses   = allExpenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
    const monthTotal      = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const todayTotal      = allExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);

    // 7-day trend
    const trend7: { date: string; total: number }[] = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
        return { date: d, total: allExpenses.filter(e => e.date === d).reduce((s, e) => s + e.amount, 0) };
    });
    const trend7Max = Math.max(...trend7.map(t => t.total), 1);

    // Category breakdown
    const categoryTotals = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    // Group expenses by date
    const grouped: { date: string; items: Expense[] }[] = [];
    const seen = new Set<string>();
    for (const e of expenses) {
        if (!seen.has(e.date)) { seen.add(e.date); grouped.push({ date: e.date, items: [] }); }
        grouped.find(g => g.date === e.date)!.items.push(e);
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <div
                className="relative rounded-3xl overflow-hidden p-5"
                style={{ background: "linear-gradient(135deg,#150a00 0%,#2c1800 50%,#150a00 100%)" }}
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" style={{ transform: "translate(33%,-33%)" }} />
                <div className="relative">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <p className="text-amber-400/50 text-[10px] font-semibold tracking-widest uppercase">Money Tracker</p>
                            <p className="text-white/40 text-sm mt-0.5">{format(new Date(), "MMMM yyyy")}</p>
                            <p className="text-3xl font-black text-white mt-1">{formatINR(monthTotal)}</p>
                            <p className="text-white/40 text-sm mt-0.5">
                                Today {formatINR(todayTotal)}
                                {todayTotal > 0 && monthTotal > 0 && (
                                    <span className="ml-2 text-amber-400">{((todayTotal / monthTotal) * 100).toFixed(0)}% of month</span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-lg"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>

                    {/* 7-day bar chart */}
                    <div className="mb-5">
                        <p className="text-white/30 text-[10px] font-semibold tracking-wider uppercase mb-2">Last 7 days</p>
                        <div className="flex items-end gap-1.5 h-14">
                            {trend7.map(({ date, total }, i) => {
                                const heightPct = trend7Max > 0 ? (total / trend7Max) * 100 : 0;
                                const isToday = date === today;
                                return (
                                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex items-end justify-center" style={{ height: "44px" }}>
                                            <div
                                                className="w-full rounded-t-md transition-all"
                                                style={{
                                                    height: `${Math.max(heightPct, 4)}%`,
                                                    background: isToday
                                                        ? "linear-gradient(180deg,#f59e0b,#d97706)"
                                                        : "rgba(251,191,36,0.25)",
                                                }}
                                            />
                                        </div>
                                        <p className={`text-[9px] font-medium ${isToday ? "text-amber-400" : "text-white/25"}`}>
                                            {format(parseISO(date), "EEE").charAt(0)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* View mode tabs */}
                    <div className="flex gap-2">
                        {(["today", "daily", "monthly"] as ViewMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setViewMode(m)}
                                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                    viewMode === m ? "bg-amber-600 text-white" : "bg-white/5 text-white/30 hover:text-white/60"
                                }`}
                            >
                                {m === "daily" ? "By Date" : m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── DATE NAV (daily) ── */}
            <AnimatePresence>
                {viewMode === "daily" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2">
                        <button onClick={() => goToDate(-1)} className="p-2.5 rounded-xl bg-card border border-border hover:border-amber-500/40 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1 text-center py-2.5 bg-card border border-border rounded-xl">
                            <p className="font-semibold text-sm">{format(parseISO(selectedDate), "EEEE, MMM d")}</p>
                            {selectedDate === today && <p className="text-xs text-amber-500 font-medium">Today</p>}
                        </div>
                        <button onClick={() => goToDate(1)} disabled={selectedDate >= today} className="p-2.5 rounded-xl bg-card border border-border hover:border-amber-500/40 disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CATEGORY BREAKDOWN ── */}
            {Object.keys(categoryTotals).length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5" /> Spending Breakdown
                    </p>
                    <div className="space-y-3">
                        {Object.entries(categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amount]) => {
                                const info = getCat(cat);
                                const pct = currentTotal > 0 ? (amount / currentTotal) * 100 : 0;
                                return (
                                    <div key={cat} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-2 text-sm font-semibold">
                                                <span className="text-base">{info.emoji}</span>
                                                {info.label}
                                            </span>
                                            <div className="text-right">
                                                <span className="font-bold text-sm">{formatINR(amount)}</span>
                                                <span className="text-muted-foreground text-xs ml-1.5">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ background: info.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* ── TRANSACTION LIST (grouped by date) ── */}
            {grouped.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <IndianRupee className="w-8 h-8 text-amber-400/40" />
                    </div>
                    <p className="font-bold text-lg">No expenses</p>
                    <p className="text-muted-foreground text-sm mt-1">Tap + Add to log your first expense</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {grouped.map(({ date, items }) => {
                        const dayTotal = items.reduce((s, e) => s + e.amount, 0);
                        const isToday = date === today;
                        return (
                            <div key={date}>
                                {/* Date group header */}
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {isToday ? "Today" : format(parseISO(date), "EEEE, MMM d")}
                                    </p>
                                    <p className="text-xs font-bold text-amber-500">{formatINR(dayTotal)}</p>
                                </div>
                                <div className="space-y-2">
                                    {items.map((expense, i) => {
                                        const info = getCat(expense.category);
                                        return (
                                            <motion.div
                                                key={expense.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="group flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-amber-500/20 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: info.bg }}>
                                                    {info.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm truncate">{expense.description}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{info.label}</p>
                                                </div>
                                                <p className="font-black text-sm flex-shrink-0" style={{ color: info.color }}>
                                                    −{formatINR(expense.amount)}
                                                </p>
                                                <button
                                                    onClick={() => deleteExpense(expense.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── ADD EXPENSE MODAL ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
                        onClick={() => setShowForm(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-card rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[92vh] overflow-y-auto border border-border"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Colored header based on selected category */}
                            {(() => {
                                const selCat = getCat(formCategory);
                                return (
                                    <div
                                        className="relative p-5 rounded-t-3xl overflow-hidden"
                                        style={{ background: `linear-gradient(135deg, ${selCat.color}22 0%, ${selCat.color}10 100%)`, borderBottom: `1px solid ${selCat.color}30` }}
                                    >
                                        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: selCat.color }} />
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: selCat.bg }}>
                                                    {selCat.emoji}
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-black">Add Expense</h2>
                                                    <p className="text-xs font-medium mt-0.5" style={{ color: selCat.color }}>{selCat.label}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-black/10 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Amount — big, center-stage */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Amount (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                                        <input
                                            type="number"
                                            step="1"
                                            value={formAmount}
                                            onChange={e => setFormAmount(e.target.value)}
                                            placeholder="0"
                                            inputMode="numeric"
                                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 focus:border-amber-500 outline-none text-2xl font-black text-amber-400 transition-colors placeholder:text-amber-500/30"
                                            required autoFocus
                                        />
                                    </div>
                                    {/* Quick amounts */}
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {[50, 100, 200, 500].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setFormAmount(String(amt))}
                                                className="py-2 rounded-lg text-xs font-bold transition-colors border"
                                                style={{
                                                    background: formAmount === String(amt) ? "rgba(245,158,11,0.2)" : "var(--secondary)",
                                                    borderColor: formAmount === String(amt) ? "rgba(245,158,11,0.5)" : "transparent",
                                                    color: formAmount === String(amt) ? "#f59e0b" : undefined,
                                                }}
                                            >
                                                ₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">What for?</label>
                                    <input
                                        type="text"
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="e.g. Biryani, Uber, Groceries…"
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-amber-500 outline-none text-sm transition-colors"
                                        required
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <motion.button
                                                key={cat.value}
                                                type="button"
                                                whileTap={{ scale: 0.92 }}
                                                onClick={() => setFormCategory(cat.value)}
                                                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all"
                                                style={{
                                                    borderColor: formCategory === cat.value ? cat.color : "transparent",
                                                    background: formCategory === cat.value ? cat.bg : "var(--secondary)",
                                                }}
                                            >
                                                <span className="text-xl">{cat.emoji}</span>
                                                <span className="text-[10px] font-bold" style={{ color: formCategory === cat.value ? cat.color : undefined }}>
                                                    {cat.label}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formDate}
                                        onChange={e => setFormDate(e.target.value)}
                                        max={getToday()}
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-amber-500 outline-none text-sm transition-colors"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2 pb-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 rounded-xl bg-secondary font-semibold text-sm hover:bg-muted transition-colors">
                                        Cancel
                                    </button>
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.97 }}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-900/30"
                                    >
                                        Add Expense
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
