"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry } from "@/types";
import { BookOpen, Plus, X, Search, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const MOODS = [
    { value: 1, emoji: "😢", label: "Bad" },
    { value: 2, emoji: "😕", label: "Low" },
    { value: 3, emoji: "😐", label: "OK" },
    { value: 4, emoji: "🙂", label: "Good" },
    { value: 5, emoji: "😄", label: "Great" },
] as const;

export default function JournalPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formMood, setFormMood] = useState<1 | 2 | 3 | 4 | 5>(3);
    const [formTags, setFormTags] = useState("");

    const loadEntries = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const allEntries = await db.journalEntries.orderBy("date").reverse().toArray();
            setEntries(allEntries);
        } catch (error) {
            console.error("Failed to load journal entries:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadEntries(); }, [loadEntries]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formContent.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const tags = formTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
            const entry: JournalEntry = { id: generateId(), userId: user.id, date: getToday(), title: formTitle.trim() || undefined, content: formContent.trim(), mood: formMood, tags, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.journalEntries.add(entry);
            toast({ title: "Journal entry saved!" });
            setShowForm(false);
            setFormTitle(""); setFormContent(""); setFormMood(3); setFormTags("");
            loadEntries();
            syncToCloud(user.id, "journalEntries");
        } catch (error) {
            console.error("Failed to save entry:", error);
        }
    };

    const deleteEntry = async (entryId: string) => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            await db.journalEntries.delete(entryId);
            setSelectedEntry(null);
            toast({ title: "Entry deleted" });
            loadEntries();
            syncToCloud(user.id, "journalEntries");
        } catch (error) {
            console.error("Failed to delete entry:", error);
        }
    };

    const filteredEntries = entries.filter((entry) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return entry.content.toLowerCase().includes(query) || entry.title?.toLowerCase().includes(query) || entry.tags.some((t) => t.includes(query));
    });

    const getMoodEmoji = (mood: number) => MOODS.find((m) => m.value === mood)?.emoji || "😐";

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-slate-400 border-t-transparent rounded-full animate-spin" /></div>);
    }

    return (
        <div className="space-y-5 pb-24 md:pb-6 overflow-x-hidden">

            {/* Header - Diary Style */}
            <div className="flex items-center justify-between gap-2 relative">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                        <div className="p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg"><BookOpen className="w-5 h-5 md:w-6 md:h-6" /></div>
                        <span className="text-slate-800 dark:text-slate-100">Journal</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your thoughts & reflections</p>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold text-sm shadow-lg active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" /><span>New</span>
                </button>
            </div>

            {/* Search - Clean Diary Style */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search entries..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-300 dark:focus:border-blue-600 outline-none text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 shadow-sm" />
            </div>

            {filteredEntries.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border">
                    <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4"><BookOpen className="w-10 h-10 text-blue-400" /></div>
                    <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-1">{searchQuery ? "No matching entries" : "Start Your Journal"}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{searchQuery ? "Try a different search" : "Capture your thoughts & memories"}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                        <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left p-4 rounded-2xl bg-card border border-border hover:border-blue-400 dark:hover:border-blue-600 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-500 dark:text-blue-400">{format(parseISO(entry.date), "EEEE, MMM d")}</span>
                                <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                            </div>
                            {entry.title && <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1 line-clamp-1">{entry.title}</h3>}
                            <p className="text-slate-600 dark:text-slate-300 text-base line-clamp-2 leading-relaxed">{entry.content}</p>
                            {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">{entry.tags.slice(0, 3).map((tag) => (<span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium">#{tag}</span>))}</div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {selectedEntry && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEntry(null)}>
                    <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                        {/* Diary spine effect - subtle blue */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-blue-200 dark:from-blue-800 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 pl-6 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-3xl">{getMoodEmoji(selectedEntry.mood)}</span>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{selectedEntry.title || "Journal Entry"}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(parseISO(selectedEntry.date), "EEEE, MMMM d, yyyy")}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => deleteEntry(selectedEntry.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                <button onClick={() => setSelectedEntry(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
                            </div>
                        </div>

                        {/* Content - Clean reading experience */}
                        <div className="flex-1 overflow-y-auto p-6 pl-8">
                            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200 leading-8 text-base tracking-wide">{selectedEntry.content}</p>
                            {selectedEntry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-5 border-t border-slate-200 dark:border-slate-700">
                                    {selectedEntry.tags.map((tag) => (
                                        <span key={tag} className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-medium">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Entry Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-card border-t md:border border-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-bold">📝 New Entry</h2>
                            <button onClick={() => { setShowForm(false); setFormTitle(""); setFormContent(""); setFormMood(3); setFormTags(""); }} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1.5">Title (optional)</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Give a title..." className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-pink-500 outline-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold mb-2">Mood</label><div className="grid grid-cols-5 gap-1">{MOODS.map((mood) => (<button key={mood.value} type="button" onClick={() => setFormMood(mood.value as 1 | 2 | 3 | 4 | 5)} className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${formMood === mood.value ? "bg-pink-500/20 ring-2 ring-pink-500" : "bg-secondary"}`}><span className="text-xl">{mood.emoji}</span><span className="text-[9px] font-medium">{mood.label}</span></button>))}</div></div>
                            <div><label className="block text-sm font-semibold mb-1.5">What&apos;s on your mind?</label><textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Write..." rows={4} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-pink-500 outline-none resize-none text-sm" required /></div>
                            <div><label className="block text-sm font-semibold mb-1.5">Tags (comma separated)</label><input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="work, gratitude..." className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-pink-500 outline-none text-sm" /></div>
                            <div className="flex gap-2 pt-2 pb-4">
                                <button type="button" onClick={() => { setShowForm(false); setFormTitle(""); setFormContent(""); setFormMood(3); setFormTags(""); }} className="flex-1 py-3 rounded-xl bg-secondary font-semibold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
