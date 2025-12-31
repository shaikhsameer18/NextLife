"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { getUserDatabase } from "@/lib/db/database";
import { generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { VaultItem } from "@/types";
import { Lightbulb, Plus, Search, FileText, Link2, Sparkles, Star, StarOff, Trash2, X, ExternalLink, Brain, Lock, KeyRound, Shield, ShieldCheck, Delete } from "lucide-react";
import { format } from "date-fns";

type ItemType = "note" | "link" | "idea";
type FilterType = "all" | ItemType | "favorites";

// Simple hash function for passcode (not for high security, just basic protection)
const hashPasscode = (pin: string): string => {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

export default function VaultPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

    // Passcode protection
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [passcodeInput, setPasscodeInput] = useState("");
    const [isSettingPasscode, setIsSettingPasscode] = useState(false);
    const [confirmPasscode, setConfirmPasscode] = useState("");
    const [passcodeError, setPasscodeError] = useState("");
    const [hasPasscode, setHasPasscode] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [formType, setFormType] = useState<ItemType>("note");
    const [formTitle, setFormTitle] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formUrl, setFormUrl] = useState("");
    const [formTags, setFormTags] = useState("");

    // Track if this is initial mount
    const hasInitialized = useRef(false);

    // Check for existing passcode on mount - only lock on initial page load
    useEffect(() => {
        if (user && !hasInitialized.current) {
            hasInitialized.current = true;
            const storedHash = localStorage.getItem(`vault_passcode_${user.id}`);
            setHasPasscode(!!storedHash);
            // Always require PIN on page visit (initial mount only)
            setIsUnlocked(false);
        }
    }, [user]);

    // Handle passcode input
    const handlePasscodeDigit = (digit: string) => {
        if (passcodeInput.length < 4) {
            const newInput = passcodeInput + digit;
            setPasscodeInput(newInput);
            setPasscodeError("");

            if (newInput.length === 4) {
                if (isSettingPasscode) {
                    if (!confirmPasscode) {
                        setConfirmPasscode(newInput);
                        setPasscodeInput("");
                    } else {
                        if (newInput === confirmPasscode) {
                            // Save passcode
                            localStorage.setItem(`vault_passcode_${user?.id}`, hashPasscode(newInput));
                            setIsUnlocked(true);
                            setHasPasscode(true);
                            sessionStorage.setItem(`vault_unlocked_${user?.id}`, "true");
                            toast({ title: "Vault passcode set! 🔐" });
                            setIsSettingPasscode(false);
                            setConfirmPasscode("");
                        } else {
                            setPasscodeError("PINs don't match. Try again.");
                            setConfirmPasscode("");
                        }
                        setPasscodeInput("");
                    }
                } else {
                    // Verify passcode
                    const storedHash = localStorage.getItem(`vault_passcode_${user?.id}`);
                    if (hashPasscode(newInput) === storedHash) {
                        setIsUnlocked(true);
                        sessionStorage.setItem(`vault_unlocked_${user?.id}`, "true");
                    } else {
                        setPasscodeError("Wrong PIN. Try again.");
                    }
                    setPasscodeInput("");
                }
            }
        }
    };

    const handleBackspace = () => {
        setPasscodeInput(prev => prev.slice(0, -1));
        setPasscodeError("");
    };

    const loadItems = useCallback(async () => {
        if (!user) return;
        try {
            const db = getUserDatabase(user.id);
            const allItems = await db.vaultItems.toArray();
            const activeItems = allItems.filter(item => !item.isArchived).sort((a, b) => b.createdAt - a.createdAt);
            setItems(activeItems);
        } catch (error) {
            console.error("Failed to load vault items:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { if (isUnlocked) loadItems(); }, [loadItems, isUnlocked]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formTitle.trim()) return;
        try {
            const db = getUserDatabase(user.id);
            const now = Date.now();
            const tags = formTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
            const item: VaultItem = { id: generateId(), userId: user.id, type: formType, title: formTitle.trim(), content: formContent.trim(), url: formType === "link" ? formUrl.trim() : undefined, tags, isFavorite: false, isArchived: false, createdAt: now, updatedAt: now, syncStatus: "pending", version: 1 };
            await db.vaultItems.add(item);
            toast({ title: "Saved to vault! 💡" });
            setShowForm(false);
            setFormType("note"); setFormTitle(""); setFormContent(""); setFormUrl(""); setFormTags("");
            loadItems();
        } catch (error) {
            console.error("Failed to save item:", error);
        }
    };

    const toggleFavorite = async (itemId: string, currentValue: boolean) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.vaultItems.update(itemId, { isFavorite: !currentValue, updatedAt: Date.now() }); loadItems(); } catch (error) { console.error("Failed to toggle favorite:", error); }
    };

    const deleteItem = async (itemId: string) => {
        if (!user) return;
        try { const db = getUserDatabase(user.id); await db.vaultItems.delete(itemId); setSelectedItem(null); toast({ title: "Item deleted" }); loadItems(); } catch (error) { console.error("Failed to delete item:", error); }
    };

    const filteredItems = items.filter((item) => {
        if (filter === "favorites" && !item.isFavorite) return false;
        if (filter !== "all" && filter !== "favorites" && item.type !== filter) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query) || item.tags.some((t) => t.includes(query));
    });

    const getTypeIcon = (type: ItemType) => { switch (type) { case "note": return FileText; case "link": return Link2; case "idea": return Sparkles; } };
    const getTypeStyle = (type: ItemType) => { switch (type) { case "note": return { gradient: "from-blue-500 to-cyan-500" }; case "link": return { gradient: "from-green-500 to-emerald-500" }; case "idea": return { gradient: "from-purple-500 to-pink-500" }; } };

    // Show lock screen if not unlocked
    if (!isUnlocked && (hasPasscode || isSettingPasscode)) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-xs space-y-6">
                    {/* Lock Icon */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            {isSettingPasscode ? <ShieldCheck className="w-10 h-10 text-white" /> : <Lock className="w-10 h-10 text-white" />}
                        </div>
                        <h1 className="text-xl font-bold">
                            {isSettingPasscode ? (confirmPasscode ? "Confirm PIN" : "Set PIN") : "Enter PIN"}
                        </h1>
                        <p className="text-sm text-muted-foreground text-center">
                            {isSettingPasscode
                                ? (confirmPasscode ? "Enter the PIN again to confirm" : "Create a 4-digit PIN to protect your vault")
                                : "Enter your 4-digit PIN to unlock"
                            }
                        </p>
                    </div>

                    {/* PIN Display */}
                    <div className="flex justify-center gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${i < passcodeInput.length
                                    ? "border-cyan-500 bg-cyan-500/10"
                                    : "border-border bg-secondary"
                                    }`}
                            >
                                {i < passcodeInput.length ? "●" : ""}
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {passcodeError && (
                        <p className="text-sm text-red-500 text-center">{passcodeError}</p>
                    )}

                    {/* Number Pad */}
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((digit, i) => (
                            digit === null ? (
                                <div key={i} />
                            ) : digit === "del" ? (
                                <button
                                    key={i}
                                    onClick={handleBackspace}
                                    className="h-14 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-95"
                                >
                                    <Delete className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    key={i}
                                    onClick={() => handlePasscodeDigit(digit.toString())}
                                    className="h-14 rounded-xl bg-card border-2 border-border hover:border-cyan-500 text-xl font-bold transition-all active:scale-95"
                                >
                                    {digit}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Skip setup option */}
                    {isSettingPasscode && !confirmPasscode && (
                        <button
                            onClick={() => { setIsSettingPasscode(false); setIsUnlocked(true); }}
                            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            Skip for now
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Prompt to set passcode on first use
    if (!hasPasscode && !isUnlocked && user) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-6 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mx-auto">
                        <Shield className="w-12 h-12 text-cyan-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Protect Your Vault</h1>
                        <p className="text-muted-foreground">Set a 4-digit PIN to keep your notes, links, and ideas secure.</p>
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={() => setIsSettingPasscode(true)}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                        >
                            <KeyRound className="w-5 h-5" />
                            Set PIN
                        </button>
                        <button
                            onClick={() => setIsUnlocked(true)}
                            className="w-full py-3 rounded-xl bg-secondary font-medium"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>);
    }

    return (
        <div className="space-y-4 pb-24 md:pb-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                    <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Brain className="w-4 h-4 md:w-5 md:h-5" /></div>
                    Vault
                </h1>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm">
                    <Plus className="w-4 h-4" /><span>Add</span>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:border-cyan-500 outline-none text-sm" />
            </div>

            {/* Filter - Grid layout */}
            <div className="grid grid-cols-5 gap-1">
                {(["all", "note", "link", "idea", "favorites"] as FilterType[]).map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "bg-secondary"}`}>
                        {f === "favorites" ? "⭐" : f}
                    </button>
                ))}
            </div>

            {/* Items */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3"><Lightbulb className="w-7 h-7 text-cyan-500/50" /></div>
                    <h3 className="font-semibold mb-1">{searchQuery || filter !== "all" ? "No matching items" : "Vault is empty"}</h3>
                    <p className="text-muted-foreground text-sm">{searchQuery || filter !== "all" ? "Try different filter" : "Save notes, links, ideas"}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredItems.map((item) => {
                        const Icon = getTypeIcon(item.type);
                        const style = getTypeStyle(item.type);
                        return (
                            <div key={item.id} className="p-3 rounded-xl bg-card border border-border hover:border-cyan-500/50 transition-all">
                                <div className="flex items-start gap-2">
                                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${style.gradient} text-white flex-shrink-0`}><Icon className="w-3.5 h-3.5" /></div>
                                    <button onClick={() => setSelectedItem(item)} className="flex-1 min-w-0 text-left">
                                        <h3 className="font-bold text-sm line-clamp-1">{item.title}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{item.content || "No description"}</p>
                                    </button>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button onClick={() => toggleFavorite(item.id, item.isFavorite)} className="p-1">
                                            {item.isFavorite ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                                        </button>
                                        <button onClick={() => deleteItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">{item.tags.slice(0, 3).map((tag) => (<span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">#{tag}</span>))}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Item Detail Modal - Centered Popup */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-card border-t-4 border-cyan-500 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/30 flex items-center justify-between p-4 border-b border-cyan-200 dark:border-cyan-800">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${getTypeStyle(selectedItem.type).gradient} text-white`}>
                                    {(() => { const Icon = getTypeIcon(selectedItem.type); return <Icon className="w-4 h-4" />; })()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-cyan-800 dark:text-cyan-200 truncate">{selectedItem.title}</p>
                                    <p className="text-xs text-cyan-600 dark:text-cyan-400 capitalize">{selectedItem.type} • {format(selectedItem.createdAt, "MMM d, yyyy")}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {selectedItem.type === "link" && selectedItem.url && (
                                <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-cyan-500 hover:underline mb-4 text-sm font-medium"><ExternalLink className="w-4 h-4" />Open Link</a>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{selectedItem.content}</p>
                            {selectedItem.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">{selectedItem.tags.map((tag) => (<span key={tag} className="px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-xs font-medium">#{tag}</span>))}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-card border-t md:border border-border rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-bold">💡 Add to Vault</h2>
                            <button onClick={() => { setShowForm(false); setFormType("note"); setFormTitle(""); setFormContent(""); setFormUrl(""); setFormTags(""); }} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div><label className="block text-sm font-semibold mb-2">Type</label><div className="grid grid-cols-3 gap-1.5">{(["note", "link", "idea"] as ItemType[]).map((type) => { const Icon = getTypeIcon(type); const style = getTypeStyle(type); return (<button key={type} type="button" onClick={() => setFormType(type)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all capitalize font-semibold text-sm ${formType === type ? `bg-gradient-to-r ${style.gradient} text-white` : "bg-secondary"}`}><Icon className="w-4 h-4" />{type}</button>); })}</div></div>
                            <div><label className="block text-sm font-semibold mb-1.5">Title</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={formType === "note" ? "Note title..." : formType === "link" ? "Link title..." : "Idea name..."} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm" required /></div>
                            {formType === "link" && (<div><label className="block text-sm font-semibold mb-1.5">URL</label><input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm" /></div>)}
                            <div><label className="block text-sm font-semibold mb-1.5">{formType === "idea" ? "Description" : "Content"}</label><textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Add details..." rows={3} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none resize-none text-sm" /></div>
                            <div><label className="block text-sm font-semibold mb-1.5">Tags (comma separated)</label><input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="work, reference..." className="w-full px-3 py-2.5 rounded-xl bg-secondary border-2 border-transparent focus:border-cyan-500 outline-none text-sm" /></div>
                            <div className="flex gap-2 pt-2 pb-4">
                                <button type="button" onClick={() => { setShowForm(false); setFormType("note"); setFormTitle(""); setFormContent(""); setFormUrl(""); setFormTags(""); }} className="flex-1 py-3 rounded-xl bg-secondary font-semibold">Cancel</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
