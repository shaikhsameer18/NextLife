"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/components/providers";
import { useAuthStore } from "@/stores/auth";
import { signOut } from "@/lib/supabase";
import { syncAllFromCloud, syncAllToCloud, isCloudSyncAvailable } from "@/lib/sync";
import {
    Home, CheckCircle2, Moon, Bed, Utensils, Droplets, ListTodo,
    Timer, BookOpen, Lightbulb, Wallet, BarChart3, Settings, LogOut,
    Menu, X, Sparkles, User, Sun, Dumbbell, Cloud, CloudOff, RefreshCw,
} from "lucide-react";

const NAV_MAP: Record<string, { href: string; icon: React.ElementType; label: string; gradient: string; glow: string }> = {
    home:     { href: "/dashboard",           icon: Home,         label: "Home",    gradient: "from-violet-500 to-purple-600",   glow: "shadow-violet-500/20" },
    habits:   { href: "/dashboard/habits",    icon: CheckCircle2, label: "Habits",  gradient: "from-emerald-500 to-green-600",   glow: "shadow-emerald-500/20" },
    prayer:   { href: "/dashboard/prayer",    icon: Moon,         label: "Namaz",   gradient: "from-violet-500 to-indigo-600",   glow: "shadow-violet-500/20" },
    sleep:    { href: "/dashboard/sleep",     icon: Bed,          label: "Sleep",   gradient: "from-indigo-500 to-blue-600",     glow: "shadow-indigo-500/20" },
    water:    { href: "/dashboard/water",     icon: Droplets,     label: "Water",   gradient: "from-cyan-500 to-blue-500",       glow: "shadow-cyan-500/20" },
    meals:    { href: "/dashboard/meals",     icon: Utensils,     label: "Meals",   gradient: "from-amber-500 to-orange-500",    glow: "shadow-amber-500/20" },
    tasks:    { href: "/dashboard/tasks",     icon: ListTodo,     label: "Tasks",   gradient: "from-rose-500 to-pink-500",       glow: "shadow-rose-500/20" },
    pomodoro: { href: "/dashboard/pomodoro",  icon: Timer,        label: "Focus",   gradient: "from-yellow-500 to-amber-500",    glow: "shadow-yellow-500/20" },
    journal:  { href: "/dashboard/journal",   icon: BookOpen,     label: "Journal", gradient: "from-pink-500 to-rose-500",       glow: "shadow-pink-500/20" },
    vault:    { href: "/dashboard/vault",     icon: Lightbulb,    label: "Vault",   gradient: "from-sky-500 to-blue-500",        glow: "shadow-sky-500/20" },
    finance:  { href: "/dashboard/finance",   icon: Wallet,       label: "Finance", gradient: "from-green-500 to-emerald-500",   glow: "shadow-green-500/20" },
    fitness:  { href: "/dashboard/fitness",   icon: Dumbbell,     label: "Fitness", gradient: "from-teal-500 to-cyan-500",       glow: "shadow-teal-500/20" },
    insights: { href: "/dashboard/insights",  icon: BarChart3,    label: "Insights",gradient: "from-purple-500 to-violet-600",   glow: "shadow-purple-500/20" },
};

const NAV_ITEMS = Object.values(NAV_MAP);
const DEFAULT_MOBILE_NAV = ["home", "habits", "prayer", "journal", "finance"];

const SYNC_LABELS: Record<string, string> = {
    idle: "Cloud Sync",
    syncing: "Syncing...",
    synced: "Synced",
    error: "Sync Error",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { session, loading, theme, setTheme } = useAuth();
    const { user } = useUser();
    const { initializeUser, clearUser } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [mobileNavItems, setMobileNavItems] = useState<string[]>(DEFAULT_MOBILE_NAV);
    const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
    const [localAvatar, setLocalAvatar] = useState<string | null>(null);
    const [localName, setLocalName]     = useState<string | null>(null);

    // Load pinned nav items
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("nextlife-pinned-nav");
            if (saved) {
                try { setMobileNavItems(JSON.parse(saved)); } catch { /* ignore */ }
            }
        }
    }, []);

    // Read localStorage profile overrides (avatar + display name)
    useEffect(() => {
        if (!user?.id) return;
        const readProfile = () => {
            setLocalAvatar(localStorage.getItem(`nextlife_avatar_${user.id}`));
            setLocalName(localStorage.getItem(`nextlife_name_${user.id}`));
        };
        readProfile();
        window.addEventListener("nextlife-profile-updated", readProfile);
        return () => window.removeEventListener("nextlife-profile-updated", readProfile);
    }, [user?.id]);

    // Init user and sync from cloud on login
    useEffect(() => {
        const init = async () => {
            if (session?.user && !initialized) {
                await initializeUser(
                    session.user.id,
                    session.user.email || "",
                    session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User"
                );
                setInitialized(true);

                if (isCloudSyncAvailable()) {
                    setSyncStatus("syncing");
                    try {
                        const result = await syncAllFromCloud(session.user.id);
                        setSyncStatus(result.success ? "synced" : "error");
                    } catch {
                        setSyncStatus("error");
                    }
                }
            }
        };
        init();
    }, [session, initializeUser, initialized]);

    // Redirect to login
    useEffect(() => {
        if (!loading && !session) router.push("/login");
    }, [loading, session, router]);

    // Close sidebar on route change
    useEffect(() => { setSidebarOpen(false); }, [pathname]);

    const handleLogout = useCallback(async () => {
        clearUser();
        await signOut();
        router.push("/");
    }, [clearUser, router]);

    const handleManualSync = useCallback(async () => {
        if (!session?.user || syncStatus === "syncing") return;
        setSyncStatus("syncing");
        try {
            const result = await syncAllToCloud(session.user.id);
            setSyncStatus(result.success ? "synced" : "error");
            setTimeout(() => setSyncStatus("idle"), 3000);
        } catch {
            setSyncStatus("error");
        }
    }, [session, syncStatus]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow animate-pulse">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl animate-glow-pulse" />
                </div>
                <p className="text-muted-foreground text-sm animate-pulse">Loading your data...</p>
            </div>
        </div>
    );

    if (!session) return null;

    const displayName   = localName  || user?.name  || "User";
    const displayAvatar = localAvatar || user?.image || null;
    const userInitial   = displayName.charAt(0).toUpperCase();
    const cloudAvailable = isCloudSyncAvailable();

    return (
        <div className="min-h-screen flex bg-background">
            {/* Aurora background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[100px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />
            </div>

            {/* ── Mobile Header ── */}
            <header className="fixed top-0 left-0 right-0 z-50 lg:hidden h-14 flex items-center justify-between px-4 glass-strong border-b border-white/[0.06]">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-base">NextLife</span>
                </Link>

                <div className="flex items-center gap-1">
                    {/* Cloud sync button */}
                    {cloudAvailable && (
                        <button onClick={handleManualSync} disabled={syncStatus === "syncing"}
                            title={SYNC_LABELS[syncStatus]}
                            className={`p-2 rounded-xl transition-colors ${syncStatus === "syncing" ? "bg-blue-500/15" : syncStatus === "synced" ? "bg-emerald-500/15" : syncStatus === "error" ? "bg-red-500/15" : "hover:bg-secondary"}`}>
                            {syncStatus === "syncing" ? <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" /> :
                             syncStatus === "synced"  ? <Cloud className="w-4 h-4 text-emerald-400" /> :
                             syncStatus === "error"   ? <CloudOff className="w-4 h-4 text-red-400" /> :
                                                        <Cloud className="w-4 h-4 text-muted-foreground" />}
                        </button>
                    )}

                    {/* Theme toggle */}
                    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-2 rounded-xl hover:bg-secondary transition-colors">
                        {theme === "dark"
                            ? <Sun className="w-4 h-4 text-amber-400" />
                            : <Moon className="w-4 h-4 text-indigo-400" />}
                    </button>

                    {/* Menu */}
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ── Sidebar Overlay ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar ── */}
            <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 flex flex-col bg-card/95 backdrop-blur-xl border-r border-white/[0.06] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
                {/* Sidebar aurora glow */}
                <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-violet-600/[0.06] to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-violet-600/[0.04] to-transparent pointer-events-none" />

                {/* Sidebar header */}
                <div className="relative z-10 flex items-center justify-between px-5 h-16 border-b border-white/[0.05]">
                    <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                        <div className="relative">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow-sm">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-lg opacity-50" />
                        </div>
                        <div>
                            <p className="font-bold text-base leading-tight">NextLife</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">Your Life Buddy</p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1">
                        {/* Desktop theme toggle */}
                        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="hidden lg:flex p-2 rounded-xl hover:bg-secondary transition-colors">
                            {theme === "dark"
                                ? <Sun className="w-4 h-4 text-amber-400" />
                                : <Moon className="w-4 h-4 text-indigo-400" />}
                        </button>
                        {/* Close button (mobile) */}
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                                    isActive
                                        ? "bg-gradient-to-r from-violet-500/15 to-violet-500/5 border border-violet-500/20 text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                }`}>
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                    isActive
                                        ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.glow}`
                                        : `bg-secondary group-hover:bg-gradient-to-br group-hover:${item.gradient} group-hover:shadow-sm`
                                }`}>
                                    <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-white"} transition-colors`} />
                                </div>
                                <span className="text-sm">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="relative z-10 px-3 py-3 border-t border-white/[0.05] space-y-1">
                    {/* Cloud sync (desktop) */}
                    {cloudAvailable && (
                        <button onClick={handleManualSync} disabled={syncStatus === "syncing"}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                                syncStatus === "syncing" ? "bg-blue-500/10 text-blue-400" :
                                syncStatus === "synced"  ? "bg-emerald-500/10 text-emerald-400" :
                                syncStatus === "error"   ? "bg-red-500/10 text-red-400" :
                                "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                syncStatus === "syncing" ? "bg-blue-500/15" :
                                syncStatus === "synced"  ? "bg-emerald-500/15" :
                                syncStatus === "error"   ? "bg-red-500/15" : "bg-secondary"
                            }`}>
                                {syncStatus === "syncing" ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                 syncStatus === "synced"  ? <Cloud className="w-4 h-4" /> :
                                 syncStatus === "error"   ? <CloudOff className="w-4 h-4" /> :
                                                            <Cloud className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-medium">{SYNC_LABELS[syncStatus]}</span>
                        </button>
                    )}

                    {/* Settings */}
                    <Link href="/dashboard/settings"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                            pathname === "/dashboard/settings"
                                ? "bg-gradient-to-r from-violet-500/15 to-violet-500/5 border border-violet-500/20 text-foreground"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pathname === "/dashboard/settings" ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-glow-sm" : "bg-secondary"}`}>
                            <Settings className={`w-4 h-4 ${pathname === "/dashboard/settings" ? "text-white" : "text-muted-foreground"}`} />
                        </div>
                        <span className="text-sm">Settings</span>
                    </Link>

                    {/* User card */}
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-secondary/40 border border-white/[0.04]">
                        {displayAvatar ? (
                            <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/30 flex-shrink-0" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm flex-shrink-0">
                                {userInitial}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">{displayName}</p>
                            <p className="text-xs text-muted-foreground truncate leading-tight">{user?.email || ""}</p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 font-medium transition-all">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <span className="text-sm">Log Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="relative z-10 flex-1 min-h-screen">
                <div className="pt-14 lg:pt-0 pb-24 lg:pb-8 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
                    <div className="py-5 lg:py-7">{children}</div>
                </div>
            </main>

            {/* ── Mobile Bottom Nav ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden h-16 glass-strong border-t border-white/[0.06] safe-area-inset">
                <div className="flex items-stretch h-full">
                    {mobileNavItems.map((navId) => {
                        const item = NAV_MAP[navId];
                        if (!item) return null;
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg` : ""}`}>
                                    <item.icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : ""}`} style={{ width: "18px", height: "18px" }} />
                                </div>
                                <span className={`text-[9px] font-medium leading-none ${isActive ? "text-violet-400" : ""}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
