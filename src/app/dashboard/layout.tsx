"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { useAuth } from "@/components/providers";
import { useAuthStore } from "@/stores/auth";
import { signOut } from "@/lib/supabase";
import {
    Home,
    CheckCircle2,
    Moon,
    Bed,
    Utensils,
    Droplets,
    ListTodo,
    Timer,
    BookOpen,
    Lightbulb,
    Wallet,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Sparkles,
    User,
    Sun,
    Dumbbell,
    Palette,
} from "lucide-react";

// Navigation item mapping for mobile nav customization
const NAV_MAP: Record<string, { href: string; icon: React.ElementType; label: string; color: string }> = {
    home: { href: "/dashboard", icon: Home, label: "Home", color: "text-violet-500" },
    habits: { href: "/dashboard/habits", icon: CheckCircle2, label: "Habits", color: "text-green-500" },
    prayer: { href: "/dashboard/prayer", icon: Moon, label: "Namaz", color: "text-purple-500" },
    sleep: { href: "/dashboard/sleep", icon: Bed, label: "Sleep", color: "text-indigo-500" },
    meals: { href: "/dashboard/meals", icon: Utensils, label: "Meals", color: "text-orange-500" },
    water: { href: "/dashboard/water", icon: Droplets, label: "Water", color: "text-blue-500" },
    tasks: { href: "/dashboard/tasks", icon: ListTodo, label: "Tasks", color: "text-red-500" },
    pomodoro: { href: "/dashboard/pomodoro", icon: Timer, label: "Focus", color: "text-yellow-500" },
    journal: { href: "/dashboard/journal", icon: BookOpen, label: "Journal", color: "text-pink-500" },
    vault: { href: "/dashboard/vault", icon: Lightbulb, label: "Vault", color: "text-cyan-500" },
    finance: { href: "/dashboard/finance", icon: Wallet, label: "Money", color: "text-emerald-500" },
    fitness: { href: "/dashboard/fitness", icon: Dumbbell, label: "Fitness", color: "text-teal-500" },
    insights: { href: "/dashboard/insights", icon: BarChart3, label: "Insights", color: "text-violet-500" },
};

const NAV_ITEMS = Object.values(NAV_MAP);

// Default mobile nav items
const DEFAULT_MOBILE_NAV = ["home", "habits", "prayer", "journal", "finance"];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { session, loading, theme, setTheme } = useAuth();
    const { user } = useUser();
    const { initializeUser, clearUser } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [mobileNavItems, setMobileNavItems] = useState<string[]>(DEFAULT_MOBILE_NAV);

    // Load pinned nav items from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("nextlife-pinned-nav");
            if (saved) {
                try {
                    setMobileNavItems(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse pinned nav", e);
                }
            }
        }
    }, []);

    // Initialize local user data when session is available
    useEffect(() => {
        if (session?.user && !initialized) {
            initializeUser(
                session.user.id,
                session.user.email || "",
                session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User"
            );
            setInitialized(true);
        }
    }, [session, initializeUser, initialized]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !session) {
            router.push("/login");
        }
    }, [loading, session, router]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        clearUser();
        await signOut();
        router.push("/");
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading your data...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen flex">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 z-50 lg:hidden bg-card/80 backdrop-blur-xl border-b border-border">
                <div className="flex items-center justify-between px-4 py-3">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg">NextLife</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                            {theme === "dark" ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-indigo-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-xl hover:bg-secondary transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg">NextLife</span>
                            <p className="text-xs text-muted-foreground">Your Life Buddy</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        {/* Desktop Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="hidden lg:flex p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                            {theme === "dark" ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-indigo-500" />
                            )}
                        </button>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                    ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/20"
                                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : item.color}`} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-border space-y-2">
                    <Link
                        href="/dashboard/settings"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${pathname === "/dashboard/settings"
                            ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </Link>

                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
                        {user?.image ? (
                            <img
                                src={user.image}
                                alt={user.name || "User"}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {user?.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{user?.name || "User"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive font-medium transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen">
                <div className="pt-16 lg:pt-0 pb-24 lg:pb-6 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
                    <div className="py-6">{children}</div>
                </div>
            </main>

            {/* Mobile Bottom Navigation - Customizable */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/80 backdrop-blur-xl border-t border-border safe-area-inset">
                <div className="flex justify-around py-2">
                    {mobileNavItems.map((navId) => {
                        const item = NAV_MAP[navId];
                        if (!item) return null;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isActive ? "text-primary" : "text-muted-foreground"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? item.color : ""}`} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
