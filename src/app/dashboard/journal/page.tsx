"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId, getToday } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntry } from "@/types";
import { BookOpen, Plus, X, Search, Trash2, Pencil, Hash } from "lucide-react";
import { format, parseISO } from "date-fns";

const MOODS = [
    { value: 1 as const, emoji: "😢", label: "Bad",   color: "#ef4444" },
    { value: 2 as const, emoji: "😕", label: "Low",   color: "#f97316" },
    { value: 3 as const, emoji: "😐", label: "OK",    color: "#eab308" },
    { value: 4 as const, emoji: "🙂", label: "Good",  color: "#22c55e" },
    { value: 5 as const, emoji: "😄", label: "Great", color: "#10b981" },
] as const;

// Warm journal palette — dark paper tones
const JOURNAL_BG = {
    1: "linear-gradient(160deg,#1a0505 0%,#2d0a0a 100%)",
    2: "linear-gradient(160deg,#1a0d00 0%,#2d1a00 100%)",
    3: "linear-gradient(160deg,#141200 0%,#2a2400 100%)",
    4: "linear-gradient(160deg,#05150a 0%,#0a2918 100%)",
    5: "linear-gradient(160deg,#040e16 0%,#071e30 100%)",
};

export default function JournalPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const contentRef = useRef<HTMLTextAreaElement>(null);

    const [entries, setEntries]             = useState<JournalEntry[]>([]);
    const [loading, setLoading]             = useState(true);
    const [writing, setWriting]             = useState(false);
    const [searchQuery, setSearchQuery]     = useState("");
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

    const [formTitle,   setFormTitle]   = useState("");
    const [formContent, setFormContent] = useState("");
    const [formMood,    setFormMood]    = useState<1|2|3|4|5>(4);
    const [formTags,    setFormTags]    = useState("");

    const loadEntries = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.journalEntries.orderBy("date").reverse().toArray();
            setEntries(all);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadEntries(); }, [loadEntries]);

    // Auto-focus content when writing opens
    useEffect(() => {
        if (writing) setTimeout(() => contentRef.current?.focus(), 100);
    }, [writing]);

    const openWriter = () => {
        setFormTitle(""); setFormContent(""); setFormMood(4); setFormTags("");
        setWriting(true);
    };

    const handleSubmit = async () => {
        if (!user || !formContent.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const tags = formTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
            const entry: JournalEntry = {
                id: generateId(), userId: user.id, date: getToday(),
                title: formTitle.trim() || undefined, content: formContent.trim(), mood: formMood, tags,
                createdAt: now, updatedAt: now, syncStatus: "pending", version: 1,
            };
            await db.journalEntries.add(entry);
            toast({ title: "Entry saved" });
            setWriting(false);
            setFormTitle(""); setFormContent(""); setFormMood(4); setFormTags("");
            loadEntries();
            syncToCloud(user.id, "journalEntries");
        } catch { toast({ title: "Failed to save", variant: "destructive" }); }
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
        } catch { /* ignore */ }
    };

    const getMood  = (v: number) => MOODS.find(m => m.value === v) ?? MOODS[2];
    const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

    const filtered = entries.filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.content.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q) || e.tags.some(t => t.includes(q));
    });

    const totalEntries = entries.length;
    const avgMood = entries.length > 0 ? entries.reduce((s, e) => s + e.mood, 0) / entries.length : 0;
    const totalWords = entries.reduce((s, e) => s + wordCount(e.content), 0);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-pink-500/30 border-t-pink-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    return (
        <div className="space-y-5 pb-6">
            {/* ── HEADER ── */}
            <div
                className="relative rounded-3xl overflow-hidden p-5"
                style={{ background: "linear-gradient(135deg,#0f0520 0%,#1a0835 50%,#0f0520 100%)" }}
            >
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.04) 29px)" }} />
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" style={{ transform: "translate(33%,-33%)" }} />
                <div className="relative flex items-start justify-between">
                    <div>
                        <p className="text-pink-400/50 text-[10px] font-semibold tracking-widest uppercase">My Journal</p>
                        <h1 className="text-2xl font-black text-white mt-0.5">{format(new Date(), "EEEE, MMM d")}</h1>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="text-white/40 text-xs">{totalEntries} entries</span>
                            {avgMood > 0 && <span className="text-white/40 text-xs">{getMood(Math.round(avgMood)).emoji} avg mood</span>}
                            {totalWords > 0 && <span className="text-white/40 text-xs">{totalWords.toLocaleString()} words</span>}
                        </div>
                        {/* Mood strip */}
                        {entries.length > 0 && (
                            <div className="flex gap-1 mt-3">
                                {entries.slice(0, 10).reverse().map((e, i) => (
                                    <div key={i} className="w-5 h-1.5 rounded-full" style={{ background: getMood(e.mood).color, opacity: 0.7 }} />
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={openWriter}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-bold shadow-lg flex-shrink-0"
                    >
                        <Pencil className="w-4 h-4" /> Write
                    </button>
                </div>
            </div>

            {/* ── SEARCH ── */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search your journal..."
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border border-border focus:border-pink-500 outline-none text-sm transition-colors"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* ── ENTRY LIST ── */}
            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-pink-400/40" />
                    </div>
                    <p className="font-bold text-lg">{searchQuery ? "No results" : "Your journal is empty"}</p>
                    <p className="text-muted-foreground text-sm mt-1">{searchQuery ? "Try a different search" : "Start by writing your first entry"}</p>
                    {!searchQuery && (
                        <button onClick={openWriter} className="mt-5 px-6 py-3 rounded-xl bg-pink-600 text-white font-semibold text-sm">
                            Write First Entry
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((entry, i) => {
                        const mood = getMood(entry.mood);
                        const words = wordCount(entry.content);
                        const readMin = Math.max(1, Math.round(words / 200));
                        return (
                            <motion.button
                                key={entry.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                onClick={() => setSelectedEntry(entry)}
                                className="w-full text-left bg-card border border-border rounded-2xl overflow-hidden hover:border-pink-500/30 transition-all group"
                            >
                                {/* Mood bar top */}
                                <div className="h-0.5" style={{ background: mood.color }} />
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Date column */}
                                        <div className="flex-shrink-0 text-center w-12">
                                            <p className="text-xl font-black leading-none" style={{ color: mood.color }}>
                                                {format(parseISO(entry.date), "d")}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase">
                                                {format(parseISO(entry.date), "MMM")}
                                            </p>
                                        </div>
                                        {/* Divider */}
                                        <div className="w-px self-stretch bg-border flex-shrink-0" />
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="font-bold text-sm truncate">
                                                    {entry.title || format(parseISO(entry.date), "EEEE")}
                                                </p>
                                                <span className="text-lg flex-shrink-0">{mood.emoji}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{entry.content}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-muted-foreground">{readMin} min read</span>
                                                {entry.tags.slice(0, 2).map(t => (
                                                    <span key={t} className="text-[10px] text-muted-foreground/70">#{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            )}

            {/* ── FULL-SCREEN WRITING MODE ── */}
            <AnimatePresence>
                {writing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col"
                        style={{ background: "linear-gradient(160deg,#0f0520 0%,#140828 60%,#0a0415 100%)" }}
                    >
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
                            <div>
                                <p className="text-pink-400/60 text-[10px] font-semibold tracking-widest uppercase">New Entry</p>
                                <p className="text-white/90 font-bold text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!formContent.trim()}
                                    className="px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-sm disabled:opacity-40 hover:bg-pink-400 transition-colors"
                                >
                                    Save
                                </button>
                                <button onClick={() => setWriting(false)} className="p-2 rounded-xl hover:bg-white/10 text-white/50 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Writing area */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 max-w-2xl w-full mx-auto">
                            {/* Mood */}
                            <div className="flex items-center gap-2">
                                <span className="text-white/40 text-xs">Mood:</span>
                                <div className="flex gap-2">
                                    {MOODS.map(m => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => setFormMood(m.value)}
                                            className={`text-xl transition-all ${formMood === m.value ? "scale-125 opacity-100" : "opacity-30 hover:opacity-60"}`}
                                        >
                                            {m.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <input
                                type="text"
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="Title (optional)"
                                className="w-full bg-transparent text-white/90 text-2xl font-bold placeholder:text-white/15 outline-none border-none leading-tight"
                                style={{ fontFamily: "'Georgia', serif" }}
                            />

                            {/* Ruled divider */}
                            <div className="border-b border-white/10" />

                            {/* Content */}
                            <textarea
                                ref={contentRef}
                                value={formContent}
                                onChange={e => setFormContent(e.target.value)}
                                placeholder="What's on your mind today?&#10;&#10;Write freely — this is your space."
                                className="flex-1 w-full bg-transparent text-white/80 text-base placeholder:text-white/15 outline-none border-none resize-none leading-8"
                                style={{
                                    fontFamily: "'Georgia', serif",
                                    backgroundImage: "repeating-linear-gradient(transparent,transparent 30px,rgba(255,255,255,0.04) 31px)",
                                    backgroundAttachment: "local",
                                    minHeight: "280px",
                                }}
                            />

                            {/* Tags + word count */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-white/30 flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={formTags}
                                        onChange={e => setFormTags(e.target.value)}
                                        placeholder="Tags: gratitude, reflection, goals..."
                                        className="flex-1 bg-transparent text-white/50 text-sm placeholder:text-white/20 outline-none border-none"
                                    />
                                </div>
                                <p className="text-white/25 text-xs text-right">
                                    {wordCount(formContent)} words · {formContent.length} chars
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── ENTRY READER ── */}
            <AnimatePresence>
                {selectedEntry && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
                        style={{ background: "rgba(0,0,0,0.75)" }}
                        onClick={() => setSelectedEntry(null)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full md:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl border border-white/10 overflow-hidden"
                            style={{ background: JOURNAL_BG[selectedEntry.mood as keyof typeof JOURNAL_BG] }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Reader header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{getMood(selectedEntry.mood).emoji}</span>
                                    <div>
                                        <p className="font-black text-white max-w-[200px] truncate">{selectedEntry.title || "Journal Entry"}</p>
                                        <p className="text-xs text-white/40">{format(parseISO(selectedEntry.date), "EEEE, MMMM d, yyyy")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => deleteEntry(selectedEntry.id)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setSelectedEntry(null)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Reader content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <p
                                    className="text-white/80 leading-8 text-base whitespace-pre-wrap"
                                    style={{ fontFamily: "'Georgia', serif" }}
                                >
                                    {selectedEntry.content}
                                </p>
                                {selectedEntry.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-8 pt-5 border-t border-white/10">
                                        {selectedEntry.tags.map(tag => (
                                            <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-white/8 text-white/50 font-medium">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-white/20 text-xs mt-4">{wordCount(selectedEntry.content)} words</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
