"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { syncToCloud } from "@/lib/sync";
import { generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { VaultItem } from "@/types";
import { Plus, Search, FileText, Link2, Sparkles, Star, StarOff, Trash2, X, ExternalLink, Lock, KeyRound, Shield, ShieldCheck, Delete, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type ItemType = "note" | "link" | "idea";
type FilterType = "all" | ItemType | "favorites";

const hashPasscode = (pin: string): string => {
    // Multiple-round hash — significantly harder to brute-force than single-pass djb2
    let h = 5381;
    for (let round = 0; round < 2000; round++) {
        for (let i = 0; i < pin.length; i++) {
            h = Math.imul(h ^ 33, pin.charCodeAt(i) + round + 1);
        }
    }
    return (h >>> 0).toString(36);
};

const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

const TYPE_CONFIG = {
    note:  { icon: FileText,  label: "Note",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
    link:  { icon: Link2,     label: "Link",  color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)"  },
    idea:  { icon: Sparkles,  label: "Idea",  color: "#c084fc", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.3)" },
} as const;

export default function VaultPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcodeInput, setPasscodeInput] = useState("");
    const [isSettingPasscode, setIsSettingPasscode] = useState(false);
    const [confirmPasscode, setConfirmPasscode] = useState("");
    const [passcodeError, setPasscodeError] = useState("");
    const [hasPasscode, setHasPasscode] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotConfirmInput, setForgotConfirmInput] = useState("");
    const [resettingPin, setResettingPin] = useState(false);
    const hasInitialized = useRef(false);

    const [formType, setFormType] = useState<ItemType>("note");
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formUrl, setFormUrl] = useState("");
    const [formTags, setFormTags] = useState("");

    useEffect(() => {
        if (user && !hasInitialized.current) {
            hasInitialized.current = true;
            const storedHash = localStorage.getItem(`vault_passcode_${user.id}`);
            setHasPasscode(!!storedHash);
            setIsUnlocked(false);
        }
    }, [user?.id]);

    const handlePasscodeDigit = (digit: string) => {
        if (passcodeInput.length >= 4) return;
        const newInput = passcodeInput + digit;
        setPasscodeInput(newInput);
        setPasscodeError("");
        if (newInput.length === 4) {
            if (isSettingPasscode) {
                if (!confirmPasscode) { setConfirmPasscode(newInput); setPasscodeInput(""); }
                else {
                    if (newInput === confirmPasscode) {
                        localStorage.setItem(`vault_passcode_${user?.id}`, hashPasscode(newInput));
                        setIsUnlocked(true); setHasPasscode(true);
                        toast({ title: "Vault secured! 🔐" });
                        setIsSettingPasscode(false); setConfirmPasscode("");
                    } else { setPasscodeError("PINs don't match"); setConfirmPasscode(""); }
                    setPasscodeInput("");
                }
            } else {
                const storedHash = localStorage.getItem(`vault_passcode_${user?.id}`);
                if (hashPasscode(newInput) === storedHash) { setIsUnlocked(true); }
                else { setPasscodeError("Wrong PIN"); }
                setPasscodeInput("");
            }
        }
    };

    const handleResetPin = async () => {
        if (forgotConfirmInput !== "RESET" || !user) return;
        setResettingPin(true);
        try {
            const db = getUserDatabase(user.id);
            await db.vaultItems.clear();
            localStorage.removeItem(`vault_passcode_${user.id}`);
            setHasPasscode(false);
            setIsUnlocked(false);
            setIsSettingPasscode(false);
            setPasscodeInput("");
            setConfirmPasscode("");
            setShowForgotModal(false);
            setForgotConfirmInput("");
            toast({ title: "Vault reset", description: "All vault data cleared. Set a new PIN." });
        } catch { /* ignore */ }
        finally { setResettingPin(false); }
    };

    const loadItems = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const all = await db.vaultItems.toArray();
            setItems(all.filter(i => !i.isArchived).sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { if (isUnlocked) loadItems(); }, [loadItems, isUnlocked]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formTitle.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const tags = formTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
            const item: VaultItem = { id: generateId(), userId: user.id, type: formType, title: formTitle.trim(), content: formContent.trim(), url: formType === "link" ? formUrl.trim() : undefined, tags, isFavorite: false, isArchived: false, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.vaultItems.add(item);
            toast({ title: "Saved! 💡" });
            setShowForm(false);
            setFormType("note"); setFormTitle(""); setFormContent(""); setFormUrl(""); setFormTags("");
            loadItems(); syncToCloud(user.id, "vaultItems");
        } catch (e) { console.error(e); }
    };

    const toggleFavorite = async (itemId: string, current: boolean) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.vaultItems.update(itemId, { isFavorite: !current, updatedAt: Date.now() }); loadItems(); syncToCloud(user.id, "vaultItems"); } catch {}
    };

    const deleteItem = async (itemId: string) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.vaultItems.delete(itemId); setSelectedItem(null); toast({ title: "Deleted" }); loadItems(); syncToCloud(user.id, "vaultItems"); } catch {}
    };

    const filteredItems = items.filter(item => {
        if (filter === "favorites" && !item.isFavorite) return false;
        if (filter !== "all" && filter !== "favorites" && item.type !== filter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || item.tags.some(t => t.includes(q));
    });

    // ── PIN SCREEN ──
    if (!isUnlocked && (hasPasscode || isSettingPasscode)) {
        return (
            <>
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-7">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-900/40">
                            {isSettingPasscode ? <ShieldCheck className="w-10 h-10 text-white" /> : <Lock className="w-10 h-10 text-white" />}
                        </div>
                        <div className="text-center">
                            <h1 className="text-xl font-black">{isSettingPasscode ? (confirmPasscode ? "Confirm PIN" : "Set PIN") : "Enter PIN"}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{isSettingPasscode ? (confirmPasscode ? "Enter the PIN again" : "Create a 4-digit PIN") : "Unlock your vault"}</p>
                        </div>
                    </div>
                    <div className="flex justify-center gap-3">
                        {[0,1,2,3].map(i => (
                            <motion.div key={i} animate={i < passcodeInput.length ? { scale: 1.1 } : { scale: 1 }} className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-colors ${i < passcodeInput.length ? "border-cyan-500 bg-cyan-500/15" : "border-border bg-secondary"}`}>
                                {i < passcodeInput.length ? "●" : ""}
                            </motion.div>
                        ))}
                    </div>
                    {passcodeError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 text-center font-semibold">{passcodeError}</motion.p>}
                    <div className="grid grid-cols-3 gap-3">
                        {[1,2,3,4,5,6,7,8,9,null,0,"del"].map((digit, i) => (
                            digit === null ? <div key={i} /> :
                            digit === "del" ? (
                                <motion.button key="del" whileTap={{ scale: 0.9 }} onClick={() => { setPasscodeInput(p => p.slice(0,-1)); setPasscodeError(""); }} className="h-14 rounded-2xl bg-secondary flex items-center justify-center">
                                    <Delete className="w-5 h-5" />
                                </motion.button>
                            ) : (
                                <motion.button key={digit} whileTap={{ scale: 0.9 }} onClick={() => handlePasscodeDigit(digit.toString())} className="h-14 rounded-2xl bg-card border border-border hover:border-cyan-500 text-xl font-black transition-colors">
                                    {digit}
                                </motion.button>
                            )
                        ))}
                    </div>
                    {isSettingPasscode && !confirmPasscode ? (
                        <button onClick={() => { setIsSettingPasscode(false); setIsUnlocked(true); }} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground">
                            Skip for now
                        </button>
                    ) : !isSettingPasscode && (
                        <button onClick={() => { setShowForgotModal(true); setForgotConfirmInput(""); }} className="w-full py-2 text-sm text-muted-foreground hover:text-red-400 transition-colors">
                            Forgot PIN?
                        </button>
                    )}
                </motion.div>
            </div>

            {/* ── FORGOT PIN MODAL ── */}
            <AnimatePresence>
                {showForgotModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowForgotModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                            className="bg-card rounded-3xl w-full max-w-sm border border-border overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
                                    <Shield className="w-7 h-7 text-red-400" />
                                </div>
                                <h2 className="text-lg font-black mb-1">Reset Vault PIN</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This will <span className="text-red-400 font-semibold">permanently delete all vault data</span> and reset your PIN. This cannot be undone.
                                </p>
                            </div>
                            <div className="px-6 pb-6 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Type RESET to confirm</label>
                                    <input
                                        type="text"
                                        value={forgotConfirmInput}
                                        onChange={e => setForgotConfirmInput(e.target.value.toUpperCase())}
                                        placeholder="RESET"
                                        className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-red-500 outline-none text-sm font-mono text-center tracking-widest transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowForgotModal(false); setForgotConfirmInput(""); }}
                                        className="flex-1 py-3 rounded-xl bg-secondary font-semibold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleResetPin}
                                        disabled={forgotConfirmInput !== "RESET" || resettingPin}
                                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500 transition-colors"
                                    >
                                        {resettingPin ? "Resetting..." : "Reset Vault"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            </>
        );
    }

    if (!hasPasscode && !isUnlocked && user) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-7 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center mx-auto">
                        <Shield className="w-12 h-12 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">Secure Your Vault</h1>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">Protect your notes, links, and ideas with a 4-digit PIN.</p>
                    </div>
                    <div className="space-y-3">
                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setIsSettingPasscode(true)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30">
                            <KeyRound className="w-5 h-5" /> Set PIN
                        </motion.button>
                        <button onClick={() => setIsUnlocked(true)} className="w-full py-3 rounded-2xl bg-secondary font-semibold text-sm">Skip for now</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <motion.div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
    );

    const notes = items.filter(i => i.type === "note").length;
    const links = items.filter(i => i.type === "link").length;
    const ideas = items.filter(i => i.type === "idea").length;
    const favs  = items.filter(i => i.isFavorite).length;

    return (
        <div className="space-y-5 pb-6">
            {/* ── HERO ── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-3xl overflow-hidden p-5" style={{ background: "linear-gradient(135deg, #031020 0%, #061e3a 45%, #031020 100%)" }}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/8 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
                <div className="relative flex items-start justify-between mb-4">
                    <div>
                        <p className="text-cyan-400/50 text-[10px] font-semibold tracking-widest uppercase">My Vault</p>
                        <h1 className="text-2xl font-black text-white mt-0.5">{items.length} Items</h1>
                        <p className="text-white/40 text-sm mt-0.5">{favs} starred · {notes}n {links}l {ideas}i</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-bold shadow-lg shadow-cyan-900/50">
                        <Plus className="w-4 h-4" /> Add
                    </motion.button>
                </div>
                {/* Filter pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {(["all", "note", "link", "idea", "favorites"] as FilterType[]).map(f => {
                        const active = filter === f;
                        return (
                            <motion.button key={f} whileTap={{ scale: 0.9 }} onClick={() => setFilter(f)}
                                className={`relative flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${active ? "text-white" : "text-white/30 hover:text-white/50"}`}>
                                {active && <motion.div layoutId="vaultFilter" className="absolute inset-0 rounded-xl bg-cyan-600" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                                {!active && <div className="absolute inset-0 rounded-xl bg-white/5" />}
                                <span className="relative capitalize">{f === "favorites" ? "⭐ Stars" : f}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>

            {/* ── SEARCH ── */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vault..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border focus:border-cyan-500 outline-none text-sm transition-colors" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
            </div>

            {/* ── ITEM LIST ── */}
            {filteredItems.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-cyan-400/40" />
                    </div>
                    <p className="font-bold text-lg">{searchQuery || filter !== "all" ? "No matches" : "Vault is empty"}</p>
                    <p className="text-muted-foreground text-sm mt-1">{searchQuery ? "Try a different search" : "Save notes, links, ideas"}</p>
                    {!searchQuery && filter === "all" && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} className="mt-4 px-6 py-3 rounded-xl bg-cyan-600 text-white font-semibold text-sm">Add First Item</motion.button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-2.5">
                    <AnimatePresence initial={false}>
                        {filteredItems.map((item, i) => {
                            const cfg = TYPE_CONFIG[item.type];
                            const Icon = cfg.icon;
                            return (
                                <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.03 }}
                                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-center gap-3 p-4">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                                        </div>
                                        <button onClick={() => setSelectedItem(item)} className="flex-1 min-w-0 text-left">
                                            <p className="font-bold text-sm truncate">{item.title}</p>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.content || item.url || "No content"}</p>
                                        </button>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleFavorite(item.id, item.isFavorite)} className="p-1.5 rounded-lg hover:bg-secondary">
                                                {item.isFavorite ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                                            </motion.button>
                                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                                    </div>
                                    {item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                            {item.tags.slice(0,4).map(tag => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>#{tag}</span>)}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* ── ITEM DETAIL MODAL ── */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => setSelectedItem(null)}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} className="w-full md:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl overflow-hidden border border-border bg-card" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-border" style={{ background: TYPE_CONFIG[selectedItem.type].bg }}>
                                <div className="flex items-center gap-3">
                                    {(() => { const cfg = TYPE_CONFIG[selectedItem.type]; const Icon = cfg.icon; return <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}><Icon className="w-5 h-5" style={{ color: cfg.color }} /></div>; })()}
                                    <div>
                                        <p className="font-black">{selectedItem.title}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{selectedItem.type} · {format(selectedItem.createdAt, "MMM d, yyyy")}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => deleteItem(selectedItem.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></motion.button>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></motion.button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedItem.type === "link" && selectedItem.url && isSafeUrl(selectedItem.url) && (
                                    <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline mb-5 text-sm font-semibold">
                                        <ExternalLink className="w-4 h-4" /> Open Link
                                    </a>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed text-sm">{selectedItem.content}</p>
                                {selectedItem.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-border">
                                        {selectedItem.tags.map(tag => <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-secondary font-medium text-muted-foreground">#{tag}</span>)}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── ADD MODAL ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => setShowForm(false)}>
                        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-card rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto border border-border" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-border bg-card/95 backdrop-blur-sm rounded-t-3xl">
                                <div><h2 className="text-lg font-black">Add to Vault</h2><p className="text-xs text-muted-foreground mt-0.5">Save something worth keeping</p></div>
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-secondary"><X className="w-5 h-5" /></motion.button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["note","link","idea"] as ItemType[]).map(type => {
                                            const cfg = TYPE_CONFIG[type];
                                            const Icon = cfg.icon;
                                            return (
                                                <motion.button key={type} type="button" whileTap={{ scale: 0.93 }} onClick={() => setFormType(type)}
                                                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm capitalize transition-colors"
                                                    style={{ borderColor: formType === type ? cfg.border : "transparent", background: formType === type ? cfg.bg : "var(--secondary)", color: formType === type ? cfg.color : undefined }}>
                                                    <Icon className="w-4 h-4" /> {type}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div><label className="text-sm font-semibold mb-1.5 block">Title</label><input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={`${formType} title...`} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm transition-colors" required autoFocus /></div>
                                {formType === "link" && <div><label className="text-sm font-semibold mb-1.5 block">URL</label><input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm transition-colors" /></div>}
                                <div><label className="text-sm font-semibold mb-1.5 block">Content</label><textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Write something..." rows={3} className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none resize-none text-sm transition-colors" /></div>
                                <div><label className="text-sm font-semibold mb-1.5 block text-muted-foreground">Tags <span className="font-normal">(comma separated)</span></label><input type="text" value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="work, reference..." className="w-full px-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm transition-colors" /></div>
                                <div className="flex gap-3 pt-1 pb-2">
                                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-secondary font-semibold text-sm">Cancel</button>
                                    <motion.button type="submit" whileTap={{ scale: 0.97 }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-900/30">Save</motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
