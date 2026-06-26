"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/components/providers";
import { getUserDatabase, deleteUserDatabase } from "@/lib/db/database";
import { updateUserProfile, updateUserPassword, sendPasswordReset, signOut } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
    Settings, User, Bell, Shield, Pin, Trash2, Camera,
    Pencil, Check, X, KeyRound, Download, AlertTriangle,
    LogOut, Eye, EyeOff, Sun, Moon, BellRing, CheckCircle2,
} from "lucide-react";

const NAV_OPTIONS = [
    { id: "home",    label: "Home",    emoji: "🏠" },
    { id: "habits",  label: "Habits",  emoji: "✅" },
    { id: "prayer",  label: "Namaz",   emoji: "🌙" },
    { id: "journal", label: "Journal", emoji: "📖" },
    { id: "finance", label: "Money",   emoji: "💰" },
    { id: "tasks",   label: "Tasks",   emoji: "📝" },
    { id: "fitness", label: "Fitness", emoji: "💪" },
    { id: "water",   label: "Water",   emoji: "💧" },
    { id: "sleep",   label: "Sleep",   emoji: "😴" },
    { id: "store",   label: "Themes",  emoji: "🎨" },
];

const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function SettingsPage() {
    const { user } = useUser();
    const { theme, setTheme, session } = useAuth();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "customize" | "account">("profile");

    // Profile
    const [avatar, setAvatar] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [savingName, setSavingName] = useState(false);

    // Password change
    const [showPwSection, setShowPwSection] = useState(false);
    const [newPw, setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [showPw, setShowPw]   = useState(false);
    const [savingPw, setSavingPw] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Notifications
    const [notifEnabled, setNotifEnabled] = useState(false);

    // Customize nav
    const [pinnedNav, setPinnedNav] = useState<string[]>(["home", "habits", "prayer", "journal", "finance"]);

    // Delete modal
    const [showDelete, setShowDelete] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [deleting, setDeleting] = useState(false);

    // Export
    const [exporting, setExporting] = useState(false);

    // Load saved prefs
    useEffect(() => {
        if (!user) return;
        const saved = localStorage.getItem(`nextlife_avatar_${user.id}`);
        if (saved) setAvatar(saved);
        const savedName = localStorage.getItem(`nextlife_name_${user.id}`);
        setDisplayName(savedName || user.name || "");

        if ("Notification" in window) setNotifEnabled(Notification.permission === "granted");
        const savedNav = localStorage.getItem("nextlife-pinned-nav");
        if (savedNav) { try { setPinnedNav(JSON.parse(savedNav)); } catch { /* ignore */ } }
    }, [user?.id]);

    /* ─────────────────────── AVATAR ─────────────────────── */
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (file.size > 2 * 1024 * 1024) { toast({ title: "Image too large", description: "Max 2 MB", variant: "destructive" }); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const b64 = ev.target?.result as string;
            setAvatar(b64);
            localStorage.setItem(`nextlife_avatar_${user.id}`, b64);
            window.dispatchEvent(new CustomEvent("nextlife-profile-updated"));
            toast({ title: "Photo updated" });
        };
        reader.readAsDataURL(file);
    };

    /* ─────────────────────── NAME ─────────────────────── */
    const startEditName = () => { setNameInput(displayName); setEditingName(true); };
    const cancelEditName = () => { setEditingName(false); setNameInput(""); };
    const saveName = async () => {
        if (!user || !nameInput.trim()) return;
        setSavingName(true);
        try {
            const trimmed = nameInput.trim();
            await updateUserProfile({ full_name: trimmed });
            localStorage.setItem(`nextlife_name_${user.id}`, trimmed);
            setDisplayName(trimmed);
            setEditingName(false);
            window.dispatchEvent(new CustomEvent("nextlife-profile-updated"));
            toast({ title: "Name updated" });
        } catch { toast({ title: "Failed to update name", variant: "destructive" }); }
        finally { setSavingName(false); }
    };

    /* ─────────────────────── PASSWORD ─────────────────────── */
    const isGoogleUser = session?.user?.app_metadata?.provider === "google";

    const handlePasswordReset = async () => {
        if (!user) return;
        setResetSent(true);
        const res = await sendPasswordReset(user.email, `${window.location.origin}/auth/callback`);
        if (res.success) {
            toast({ title: "Reset email sent", description: "Check your inbox to set a new password" });
        } else {
            setResetSent(false);
            toast({ title: "Failed to send reset", description: res.error, variant: "destructive" });
        }
    };

    const handlePasswordChange = async () => {
        if (!user || newPw.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return; }
        if (newPw !== confirmPw) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
        setSavingPw(true);
        try {
            const res = await updateUserPassword(newPw);
            if (!res.success) throw new Error(res.error);
            setNewPw(""); setConfirmPw(""); setShowPwSection(false);
            toast({ title: "Password changed successfully" });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed";
            toast({ title: "Failed to change password", description: msg, variant: "destructive" });
        } finally { setSavingPw(false); }
    };

    /* ─────────────────────── NOTIFICATIONS ─────────────────────── */
    const enableNotifications = async () => {
        if (!("Notification" in window)) { toast({ title: "Notifications not supported in this browser", variant: "destructive" }); return; }
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
            setNotifEnabled(true);
            new Notification("NextLife", { body: "Reminders are now active!", icon: "/icon-192x192.png" });
            toast({ title: "Notifications enabled" });
        } else {
            toast({ title: "Permission denied", description: "Allow notifications in your browser settings", variant: "destructive" });
        }
    };

    /* ─────────────────────── NAV CUSTOMIZE ─────────────────────── */
    const toggleNav = (id: string) => {
        let next: string[];
        if (pinnedNav.includes(id)) {
            if (pinnedNav.length <= 3) { toast({ title: "Minimum 3 items required" }); return; }
            next = pinnedNav.filter(p => p !== id);
        } else {
            if (pinnedNav.length >= 5) { toast({ title: "Maximum 5 items allowed" }); return; }
            next = [...pinnedNav, id];
        }
        setPinnedNav(next);
        localStorage.setItem("nextlife-pinned-nav", JSON.stringify(next));
    };

    /* ─────────────────────── EXPORT ─────────────────────── */
    const exportAsPDF = async () => {
        if (!user || exporting) return;
        setExporting(true);
        try {
            const db = getUserDatabase(user.id);
            const [habits, habitLogs, prayers, sleepLogs, mealLogs, waterLogs, tasks, pomodoroSessions, journalEntries, expenses] = await Promise.all([
                db.habits.toArray(), db.habitLogs.toArray(), db.prayers.toArray(), db.sleepLogs.toArray(),
                db.mealLogs.toArray(), db.waterLogs.toArray(), db.tasks.toArray(), db.pomodoroSessions.toArray(),
                db.journalEntries.toArray(), db.expenses.toArray(),
            ]);
            const exportData = { habits, habitLogs, prayers, sleepLogs, mealLogs, waterLogs, tasks, pomodoroSessions, journalEntries, expenses };
            const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            const safeEmail = escHtml(user.email || "User");
            const safeDate = escHtml(today);
            const safeJson = escHtml(JSON.stringify(exportData, null, 2));
            const pw = window.open("", "_blank");
            if (!pw) { toast({ title: "Allow popups to export PDF", variant: "destructive" }); return; }
            pw.document.write(`<!DOCTYPE html><html><head><title>NextLife Export</title><style>
body{font-family:system-ui,sans-serif;padding:40px;max-width:900px;margin:0 auto;color:#1e293b}
h1{color:#7c3aed;border-bottom:3px solid #7c3aed;padding-bottom:12px;font-size:28px}
h2{color:#475569;margin-top:28px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
.meta{color:#71717a;font-size:14px;margin-top:4px}.logo{width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:22px;flex-shrink:0}
.header{display:flex;align-items:center;gap:16px;margin-bottom:36px}.stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.stat{background:#f1f5f9;border:1px solid #e2e8f0;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:500}
pre{background:#f8fafc;padding:16px;border-radius:10px;font-size:11px;border:1px solid #e2e8f0;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto}
@media print{pre{max-height:none}body{padding:24px}}
</style></head><body>
<div class="header"><div class="logo">N</div><div><h1 style="margin:0;border:none;padding:0">NextLife Export</h1><p class="meta">${safeDate} &bull; ${safeEmail}</p></div></div>
<h2>Summary</h2><div class="stats">
<span class="stat">&#x2705; ${habits.length} Habits</span>
<span class="stat">&#x1F4FF; ${prayers.length} Prayers</span>
<span class="stat">&#x1F634; ${sleepLogs.length} Sleep logs</span>
<span class="stat">&#x1F37D; ${mealLogs.length} Meals</span>
<span class="stat">&#x1F4A7; ${waterLogs.length} Water logs</span>
<span class="stat">&#x1F4DD; ${tasks.length} Tasks</span>
<span class="stat">&#x23F1; ${pomodoroSessions.length} Focus sessions</span>
<span class="stat">&#x1F4D6; ${journalEntries.length} Journal entries</span>
<span class="stat">&#x1F4B0; ${expenses.length} Expenses</span>
</div>
<h2>Raw Data (JSON)</h2><pre>${safeJson}</pre>
<script>setTimeout(function(){window.print();},700);<\/script></body></html>`);
            pw.document.close();
        } catch (e) { console.error(e); toast({ title: "Export failed", variant: "destructive" }); }
        finally { setExporting(false); }
    };

    /* ─────────────────────── DELETE ─────────────────────── */
    const handleDelete = async () => {
        if (deleteInput !== "DELETE" || !user) return;
        setDeleting(true);
        try {
            // Use Dexie's delete (closes connections first, then deletes)
            await deleteUserDatabase(user.id);
            // Also delete global DB
            const { default: Dexie } = await import("dexie");
            await Dexie.delete("lifetracker-global");
            // Sign out (while session still alive in localStorage)
            await signOut();
            // Wipe all remaining local storage
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/auth/login";
        } catch { setDeleting(false); }
    };

    /* ─────────────────────── UI ─────────────────────── */
    const TABS = [
        { id: "profile",       label: "Profile",       icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "customize",     label: "Customize",     icon: Pin },
        { id: "account",       label: "Account",       icon: Shield },
    ] as const;

    const avatarSrc = avatar || user?.image;
    const nameShown = displayName || user?.name || user?.email?.split("@")[0] || "User";

    return (
        <div className="space-y-5 pb-24 md:pb-6">
            {/* Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                    <div className="p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg">
                        <Settings className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span>Settings</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg"
                                : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
                <div className="space-y-4">
                    {/* Avatar + Name card */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-base font-bold mb-5">Your Profile</h2>

                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3 mb-6">
                            <div className="relative group">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt={nameShown} className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-3xl font-black ring-4 ring-primary/20">
                                        {nameShown.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            <p className="text-xs text-muted-foreground">Tap camera to change photo (max 2 MB)</p>
                        </div>

                        {/* Name */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Display Name</p>
                                    {editingName ? (
                                        <input
                                            autoFocus
                                            value={nameInput}
                                            onChange={e => setNameInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelEditName(); }}
                                            className="w-full bg-transparent font-semibold text-foreground outline-none border-b border-primary pb-0.5"
                                        />
                                    ) : (
                                        <p className="font-semibold truncate">{nameShown}</p>
                                    )}
                                </div>
                                {editingName ? (
                                    <div className="flex gap-1.5 ml-3">
                                        <button onClick={saveName} disabled={savingName} className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors disabled:opacity-50">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={cancelEditName} className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={startEditName} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors ml-3">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Email Address</p>
                                    <p className="font-semibold text-sm">{user?.email}</p>
                                </div>
                                <div className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">Verified</div>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-primary" />
                                Password
                            </h2>
                            {!isGoogleUser && (
                                <button
                                    onClick={() => setShowPwSection(v => !v)}
                                    className="text-sm text-primary font-medium"
                                >
                                    {showPwSection ? "Cancel" : "Change"}
                                </button>
                            )}
                        </div>

                        {isGoogleUser ? (
                            <div className="p-4 rounded-xl bg-secondary/40 text-sm text-muted-foreground">
                                Signed in with Google — password is managed by Google.
                            </div>
                        ) : showPwSection ? (
                            <div className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        placeholder="New password (min 8 chars)"
                                        value={newPw}
                                        onChange={e => setNewPw(e.target.value)}
                                        className="w-full px-4 py-3 pr-11 rounded-xl bg-secondary/50 border border-border text-sm outline-none focus:border-primary transition-colors"
                                    />
                                    <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <input
                                    type={showPw ? "text" : "password"}
                                    placeholder="Confirm new password"
                                    value={confirmPw}
                                    onChange={e => setConfirmPw(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none focus:border-primary transition-colors"
                                />
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={savingPw || newPw.length < 8 || newPw !== confirmPw}
                                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 transition-colors"
                                >
                                    {savingPw ? "Saving..." : "Update Password"}
                                </button>
                                <button
                                    onClick={handlePasswordReset}
                                    disabled={resetSent}
                                    className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
                                >
                                    {resetSent ? "Reset email sent ✓" : "Send reset link to email instead"}
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl bg-secondary/40 text-sm text-muted-foreground">
                                Use a strong password with at least 8 characters.
                            </div>
                        )}
                    </div>

                    {/* Theme + Sign out */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                        <h2 className="text-base font-bold mb-4">Appearance</h2>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border">
                            <span className="font-medium text-sm">Theme</span>
                            <div className="flex gap-2">
                                {(["dark", "light"] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            theme === t ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {t === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={async () => { await signOut(); window.location.href = "/"; }}
                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-semibold">Sign Out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-base font-bold mb-5 flex items-center gap-2">
                            <BellRing className="w-4 h-4 text-primary" />
                            Push Notifications
                        </h2>

                        {notifEnabled ? (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Notifications active</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">You&apos;ll receive daily reminders from NextLife.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Get daily reminders to log your habits, prayers, meals, and more.
                                </p>
                                <button
                                    onClick={enableNotifications}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
                                >
                                    Enable Notifications
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-base font-bold mb-4">Reminder Schedule</h2>
                        <div className="space-y-2.5">
                            {[
                                { label: "Morning Check-in", time: "10:00 AM", emoji: "☀️", desc: "Habit & prayer log" },
                                { label: "Evening Review",   time: "10:00 PM", emoji: "🌙", desc: "Day summary & journal" },
                                { label: "Task Nudge",       time: "In checks", emoji: "📝", desc: "Pending tasks reminder" },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
                                    <span className="text-xl">{item.emoji}</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-mono">{item.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CUSTOMIZE TAB ── */}
            {activeTab === "customize" && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-base font-bold mb-1.5 flex items-center gap-2">
                            <Pin className="w-4 h-4 text-primary" />
                            Mobile Navigation
                        </h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            Pick 3–5 items for your bottom bar. Selected items appear as quick links.
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {NAV_OPTIONS.map(nav => {
                                const active = pinnedNav.includes(nav.id);
                                return (
                                    <button
                                        key={nav.id}
                                        onClick={() => toggleNav(nav.id)}
                                        className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                            active
                                                ? "border-primary/50 bg-primary/10 text-foreground"
                                                : "border-transparent bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                                        }`}
                                    >
                                        <span className="text-xl">{nav.emoji}</span>
                                        <span className="font-medium text-sm">{nav.label}</span>
                                        {active && (
                                            <span className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">{pinnedNav.length}/5 selected</p>
                    </div>
                </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === "account" && (
                <div className="space-y-4">
                    {/* Export */}
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-base font-bold mb-5">Data Export</h2>
                        <div className="p-4 rounded-xl bg-secondary/40 border border-border mb-4">
                            <p className="text-sm text-muted-foreground">
                                Export all your NextLife data — habits, prayers, sleep, meals, tasks, journal, and expenses — as a printable PDF.
                            </p>
                        </div>
                        <button
                            onClick={exportAsPDF}
                            disabled={exporting}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold shadow-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                        >
                            <Download className="w-5 h-5" />
                            {exporting ? "Preparing export..." : "Export as PDF"}
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/5 border-2 border-red-500/20 rounded-2xl p-6">
                        <h2 className="text-base font-bold text-red-500 mb-1 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Danger Zone
                        </h2>
                        <p className="text-sm text-muted-foreground mb-5">Permanently delete all your data. This cannot be undone.</p>
                        <button
                            onClick={() => { setDeleteInput(""); setShowDelete(true); }}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-red-500/30 text-red-500 hover:bg-red-500/10 font-semibold transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Reset All Data
                        </button>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRMATION MODAL ── */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-card border-2 border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-7 h-7 text-red-500" />
                        </div>
                        <h3 className="text-center font-black text-xl mb-1">Delete All Data?</h3>
                        <p className="text-center text-sm text-muted-foreground mb-5">
                            This will erase all habits, journals, prayers, expenses, and every other record. You cannot undo this.
                        </p>
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                                Type <span className="text-red-500 font-mono font-bold">DELETE</span> to confirm
                            </label>
                            <input
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                                placeholder="DELETE"
                                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-2 border-border text-sm font-mono outline-none focus:border-red-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setShowDelete(false)}
                                className="flex-1 py-3 rounded-xl bg-secondary text-muted-foreground font-semibold hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteInput !== "DELETE" || deleting}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
