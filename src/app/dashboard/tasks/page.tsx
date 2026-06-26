"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types";
import { Plus, Circle, CheckCircle2, Clock, Flag, Trash2, X, Calendar, ListTodo } from "lucide-react";

const PRIORITIES = [
    { value: "low",    label: "Low",    color: "#22c55e", bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)"  },
    { value: "medium", label: "Med",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
    { value: "high",   label: "High",   color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
    { value: "urgent", label: "Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)"  },
] as const;

const STATUS_CONFIG = {
    todo:        { icon: Circle,       color: "#6366f1", label: "To Do"      },
    in_progress: { icon: Clock,        color: "#f59e0b", label: "In Progress" },
    done:        { icon: CheckCircle2, color: "#22c55e", label: "Done"       },
} as const;

type FilterStatus = "all" | "todo" | "in_progress" | "done";
const FILTERS: { id: FilterStatus; label: string }[] = [
    { id: "all",         label: "All"      },
    { id: "todo",        label: "To Do"    },
    { id: "in_progress", label: "Progress" },
    { id: "done",        label: "Done"     },
];

export default function TasksPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<FilterStatus>("all");

    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formPriority, setFormPriority] = useState<Task["priority"]>("medium");
    const [formDueDate, setFormDueDate] = useState("");

    const loadTasks = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.tasks.orderBy("createdAt").reverse().toArray();
            setTasks(all.filter(t => t.status !== "cancelled"));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formTitle.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const task: Task = {
                id: generateId(), userId: user.id, title: formTitle.trim(),
                description: formDescription.trim() || undefined, priority: formPriority,
                status: "todo", dueDate: formDueDate || undefined,
                tags: [], order: tasks.length, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
            };
            await db.tasks.add(task);
            toast({ title: "Task created!" });
            setShowForm(false);
            setFormTitle(""); setFormDescription(""); setFormPriority("medium"); setFormDueDate("");
            loadTasks();
            syncToCloud(user.id, "tasks");
        } catch (e) { console.error(e); }
    };

    const cycleStatus = async (task: Task) => {
        if (!user) return;
        const next: Task["status"] = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
        try {
            const db = getUserDatabase(user.id);
            await db.tasks.update(task.id, { status: next, updatedAt: Date.now() });
            syncToCloud(user.id, "tasks");
        } catch (e) { console.error(e); }
    };

    const deleteTask = async (taskId: string) => {
        if (!user) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            const db = getUserDatabase(user.id);
            await db.tasks.delete(taskId);
            syncToCloud(user.id, "tasks");
        } catch (e) { console.error(e); }
    };

    const filtered = tasks.filter(t => filter === "all" || t.status === filter);
    const stats = {
        total: tasks.length,
        done: tasks.filter(t => t.status === "done").length,
        pending: tasks.filter(t => t.status === "todo").length,
        progress: tasks.filter(t => t.status === "in_progress").length,
    };
    const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-3xl overflow-hidden p-5"
                style={{ background: "linear-gradient(135deg, #1e0a3c 0%, #2d1b69 45%, #1e0a3c 100%)" }}
            >
                <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />

                <div className="relative flex items-start justify-between mb-5">
                    <div>
                        <p className="text-violet-400/50 text-[10px] font-semibold tracking-widest uppercase">Task Manager</p>
                        <h1 className="text-2xl font-black text-white mt-0.5">
                            {stats.done}/{stats.total} Done
                        </h1>
                        <p className="text-white/40 text-sm mt-0.5">
                            {stats.pending} pending · {stats.progress} in progress
                        </p>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold shadow-lg shadow-violet-900/50"
                    >
                        <Plus className="w-4 h-4" /> New
                    </motion.button>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                        { label: "Total",    value: stats.total,    color: "#a78bfa" },
                        { label: "Pending",  value: stats.pending,  color: "#fbbf24" },
                        { label: "Done",     value: stats.done,     color: "#34d399" },
                    ].map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="bg-white/5 rounded-2xl p-3 border border-white/8"
                        >
                            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-white/40 text-[10px] mt-0.5">{s.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-300"
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                <p className="text-white/20 text-xs mt-1">{completionPct}% complete</p>
            </motion.div>

            {/* ── FILTER TABS ── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILTERS.map(f => (
                    <motion.button
                        key={f.id}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setFilter(f.id)}
                        className={`relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === f.id ? "text-white" : "bg-card border border-border text-muted-foreground"}`}
                    >
                        {filter === f.id && (
                            <motion.div
                                layoutId="taskFilter"
                                className="absolute inset-0 rounded-xl bg-violet-600"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative">{f.label}</span>
                        {f.id !== "all" && (
                            <span className="relative ml-1.5 text-xs opacity-60">
                                {f.id === "todo" ? stats.pending : f.id === "in_progress" ? stats.progress : stats.done}
                            </span>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* ── TASK LIST ── */}
            {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                        <ListTodo className="w-8 h-8 text-violet-400/40" />
                    </div>
                    <p className="font-bold text-lg">No tasks here</p>
                    <p className="text-muted-foreground text-sm mt-1">
                        {filter === "all" ? "Create your first task" : `No ${filter.replace("_", " ")} tasks`}
                    </p>
                    {filter === "all" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowForm(true)}
                            className="mt-4 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm"
                        >
                            Create Task
                        </motion.button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                        {filtered.map((task, idx) => {
                            const priority = PRIORITIES.find(p => p.value === task.priority)!;
                            const statusCfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
                            const StatusIcon = statusCfg.icon;
                            const isOverdue = task.dueDate && task.dueDate < getToday() && task.status !== "done";
                            const isDone = task.status === "done";

                            return (
                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-violet-500/30 transition-colors"
                                >
                                    <div className="flex items-start gap-3 p-4">
                                        {/* Status toggle */}
                                        <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => cycleStatus(task)}
                                            className="mt-0.5 flex-shrink-0 transition-transform"
                                        >
                                            <StatusIcon className="w-5 h-5" style={{ color: statusCfg.color }} />
                                        </motion.button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                                {task.title}
                                            </p>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                                            )}
                                            <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                                {/* Priority badge */}
                                                <span
                                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                                    style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}
                                                >
                                                    <Flag className="w-2.5 h-2.5" /> {priority.label}
                                                </span>
                                                {/* Due date */}
                                                {task.dueDate && (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                                        style={{
                                                            background: isOverdue ? "rgba(239,68,68,0.12)" : "var(--secondary)",
                                                            color: isOverdue ? "#ef4444" : undefined,
                                                        }}
                                                    >
                                                        <Calendar className="w-2.5 h-2.5" /> {task.dueDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            onClick={() => deleteTask(task.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </motion.button>
                                    </div>

                                    {/* Priority left accent */}
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ background: priority.color }} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── ADD TASK MODAL ── */}
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
                            className="bg-card rounded-t-3xl md:rounded-3xl w-full md:max-w-md border border-border overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Dynamic header based on selected priority */}
                            {(() => {
                                const prio = PRIORITIES.find(p => p.value === formPriority)!;
                                return (
                                    <div
                                        className="relative p-5 overflow-hidden"
                                        style={{
                                            background: `linear-gradient(135deg, ${prio.bg} 0%, transparent 100%)`,
                                            borderBottom: `1px solid ${prio.border}`,
                                        }}
                                    >
                                        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20" style={{ background: prio.color }} />
                                        <div className="relative flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: prio.bg, border: `1.5px solid ${prio.border}` }}>
                                                    <Flag className="w-5 h-5" style={{ color: prio.color }} />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-black">New Task</h2>
                                                    <p className="text-xs font-semibold mt-0.5" style={{ color: prio.color }}>{prio.label} Priority</p>
                                                </div>
                                            </div>
                                            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-black/10 transition-colors">
                                                <X className="w-5 h-5" />
                                            </motion.button>
                                        </div>
                                    </div>
                                );
                            })()}

                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Task Title</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={e => setFormTitle(e.target.value)}
                                        placeholder="What needs to be done?"
                                        className="w-full px-4 py-3.5 rounded-xl bg-secondary border-2 border-transparent focus:border-violet-500 outline-none text-sm font-medium transition-colors"
                                        required autoFocus
                                    />
                                </div>

                                {/* Priority */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PRIORITIES.map(p => (
                                            <motion.button
                                                key={p.value}
                                                type="button"
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setFormPriority(p.value)}
                                                className="relative py-3 rounded-xl text-xs font-bold border-2 transition-all"
                                                style={{
                                                    background: formPriority === p.value ? p.bg : "var(--secondary)",
                                                    borderColor: formPriority === p.value ? p.border : "transparent",
                                                    color: formPriority === p.value ? p.color : undefined,
                                                    boxShadow: formPriority === p.value ? `0 2px 8px ${p.color}30` : undefined,
                                                }}
                                            >
                                                {p.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                        Notes <span className="font-normal normal-case">(optional)</span>
                                    </label>
                                    <textarea
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="Add extra details…"
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-violet-500 outline-none text-sm resize-none transition-colors"
                                    />
                                </div>

                                {/* Due date */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" /> Due Date <span className="font-normal normal-case">(optional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formDueDate}
                                        onChange={e => setFormDueDate(e.target.value)}
                                        min={getToday()}
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-violet-500 outline-none text-sm transition-colors"
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1 pb-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.97 }}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-900/30"
                                    >
                                        Create Task
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
