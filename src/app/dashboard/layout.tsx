"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
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
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", icon: Home, label: "Home", color: "text-violet-500" },
    { href: "/dashboard/habits", icon: CheckCircle2, label: "Habits", color: "text-green-500" },
    { href: "/dashboard/prayer", icon: Moon, label: "Namaz", color: "text-purple-500" },
    { href: "/dashboard/sleep", icon: Bed, label: "Sleep", color: "text-indigo-500" },
    { href: "/dashboard/meals", icon: Utensils, label: "Meals", color: "text-orange-500" },
    { href: "/dashboard/water", icon: Droplets, label: "Water", color: "text-blue-500" },
    { href: "/dashboard/tasks", icon: ListTodo, label: "Tasks", color: "text-red-500" },
    { href: "/dashboard/pomodoro", icon: Timer, label: "Focus", color: "text-yellow-500" },
    { href: "/dashboard/journal", icon: BookOpen, label: "Journal", color: "text-pink-500" },
    { href: "/dashboard/vault", icon: Lightbulb, label: "Vault", color: "text-cyan-500" },
    { href: "/dashboard/finance", icon: Wallet, label: "Money", color: "text-emerald-500" },
    { href: "/dashboard/insights", icon: BarChart3, label: "Insights", color: "text-violet-500" },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, isLoading, router]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading your data...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
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
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-xl hover:bg-secondary transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
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
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {user?.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                        </div>
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
                <div className="pt-16 lg:pt-0 pb-6 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
                    <div className="py-6">{children}</div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/80 backdrop-blur-xl border-t border-border safe-area-inset">
                <div className="flex justify-around py-2">
                    {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[6], NAV_ITEMS[11]].map((item) => {
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
