"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types";
import { Plus, ListTodo, Circle, CheckCircle2, Clock, Flag, Trash2, X, Calendar } from "lucide-react";

const PRIORITIES = [
    { value: "low", label: "Low", color: "text-green-500", bg: "bg-green-500" },
    { value: "medium", label: "Med", color: "text-amber-500", bg: "bg-amber-500" },
    { value: "high", label: "High", color: "text-orange-500", bg: "bg-orange-500" },
    { value: "urgent", label: "Urgent", color: "text-red-500", bg: "bg-red-500" },
] as const;

type FilterStatus = "all" | "todo" | "in_progress" | "done";

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
            const allTasks = await db.tasks.orderBy("createdAt").reverse().toArray();
            setTasks(allTasks.filter((t) => t.status !== "cancelled"));
        } catch (error) {
            console.error("Failed to load tasks:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadTasks(); }, [loadTasks]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formTitle.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const task: Task = { id: generateId(), userId: user.id, title: formTitle.trim(), description: formDescription.trim() || undefined, priority: formPriority, status: "todo", dueDate: formDueDate || undefined, tags: [], order: tasks.length, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.tasks.add(task);
            toast({ title: "Task created!" });
            setShowForm(false);
            setFormTitle(""); setFormDescription(""); setFormPriority("medium"); setFormDueDate("");
            loadTasks();
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    const updateTaskStatus = async (taskId: string, status: Task["status"]) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.tasks.update(taskId, { status, updatedAt: Date.now() }); loadTasks(); } catch (error) { console.error("Failed to update task:", error); }
    };

    const deleteTask = async (taskId: string) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.tasks.delete(taskId); toast({ title: "Task deleted" }); loadTasks(); } catch (error) { console.error("Failed to delete task:", error); }
    };

    const filteredTasks = tasks.filter((task) => filter === "all" || task.status === filter);
    const todoTasks = filteredTasks.filter((t) => t.status === "todo");
    const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
    const doneTasks = filteredTasks.filter((t) => t.status === "done");
    const stats = { total: tasks.length, completed: tasks.filter((t) => t.status === "done").length, pending: tasks.filter((t) => t.status !== "done").length };

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>);
    }

    const renderTaskList = (taskList: Task[], title: string, emptyMessage: string) => (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title} ({taskList.length})</h3>
            {taskList.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center bg-secondary/50 rounded-lg">{emptyMessage}</p>
            ) : (
                taskList.map((task) => {
                    const priority = PRIORITIES.find((p) => p.value === task.priority);
                    const isOverdue = task.dueDate && task.dueDate < getToday() && task.status !== "done";
                    return (
                        <div key={task.id} className={`flex items-start gap-2 p-3 rounded-xl border ${task.status === "done" ? "bg-muted/50 border-border" : isOverdue ? "bg-destructive/5 border-destructive/30" : "bg-card border-border"}`}>
                            <button onClick={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done")} className="mt-0.5 flex-shrink-0">
                                {task.status === "done" ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : task.status === "in_progress" ? <Clock className="w-5 h-5 text-yellow-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${priority?.bg}/10 ${priority?.color}`}><Flag className="w-2.5 h-2.5" />{priority?.label}</span>
                                    {task.dueDate && (<span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}><Calendar className="w-2.5 h-2.5" />{task.dueDate}</span>)}
                                </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <div className="space-y-5 pb-24 md:pb-6 overflow-x-hidden">
            {/* Header - Indigo Matte Theme */}
            <div className="flex items-center justify-between gap-2 relative">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2.5">
                    <div className="p-2 md:p-2.5 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg"><ListTodo className="w-4 h-4 md:w-5 md:h-5" /></div>
                    <span className="text-slate-800 dark:text-slate-100">Tasks</span>
                </h1>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" /><span>Add</span>
                </button>
            </div>

            {/* Stats - Matte */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-200 dark:border-indigo-800 text-center"><p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.total}</p><p className="text-[10px] text-indigo-500 dark:text-indigo-400">Total</p></div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 text-center"><p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p><p className="text-[10px] text-amber-500 dark:text-amber-400">Pending</p></div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 text-center"><p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completed}</p><p className="text-[10px] text-green-500 dark:text-green-400">Done</p></div>
            </div>

            {/* Filter - Grid layout */}
            <div className="grid grid-cols-4 gap-1.5">
                {(["all", "todo", "in_progress", "done"] as FilterStatus[]).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${filter === f ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg" : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"}`}>
                        {f === "all" ? "All" : f === "in_progress" ? "Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Task Lists */}
            <div className="space-y-4">
                {(filter === "all" || filter === "todo") && renderTaskList(todoTasks, "To Do", "No pending tasks")}
                {(filter === "all" || filter === "in_progress") && renderTaskList(inProgressTasks, "In Progress", "No tasks in progress")}
                {(filter === "all" || filter === "done") && renderTaskList(doneTasks, "Completed", "No completed tasks")}
            </div>

            {/* Form Modal - Indigo Theme */}
            {showForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                    <div className="bg-card border-t-4 border-indigo-500 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 flex items-center justify-between p-4 border-b border-indigo-200 dark:border-indigo-800">
                            <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">📝 New Task</h2>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1.5">Title</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="What needs to be done?" className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-red-500 outline-none text-sm" required /></div>
                            <div><label className="block text-sm font-semibold mb-1.5">Description</label><textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Add details..." rows={2} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-red-500 outline-none text-sm resize-none" /></div>
                            <div><label className="block text-sm font-semibold mb-2">Priority</label><div className="grid grid-cols-4 gap-1.5">{PRIORITIES.map((p) => (<button key={p.value} type="button" onClick={() => setFormPriority(p.value)} className={`py-2 rounded-lg text-xs font-semibold transition-all ${formPriority === p.value ? `${p.bg} text-white` : "bg-secondary"}`}>{p.label}</button>))}</div></div>
                            <div><label className="block text-sm font-semibold mb-1.5">Due Date</label><input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} min={getToday()} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-red-500 outline-none text-sm" /></div>
                            <div className="flex gap-2 pt-2 pb-4">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-semibold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
