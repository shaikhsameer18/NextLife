"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
    Settings,
    User,
    Bell,
    Shield,
    Database,
    ChevronRight,
    BellRing,
    Pin,
    Trash2,
} from "lucide-react";

const NAV_OPTIONS = [
    { id: "home", label: "Home", emoji: "🏠" },
    { id: "habits", label: "Habits", emoji: "✅" },
    { id: "prayer", label: "Namaz", emoji: "🌙" },
    { id: "journal", label: "Journal", emoji: "📖" },
    { id: "finance", label: "Money", emoji: "💰" },
    { id: "tasks", label: "Tasks", emoji: "📝" },
    { id: "fitness", label: "Fitness", emoji: "💪" },
    { id: "water", label: "Water", emoji: "💧" },
    { id: "sleep", label: "Sleep", emoji: "😴" },
    { id: "store", label: "Themes", emoji: "🎨" },
];

export default function SettingsPage() {
    const { user } = useUser();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "account" | "customize">("profile");

    // Pinned nav items (for mobile bottom nav customization)
    const [pinnedNav, setPinnedNav] = useState<string[]>(["home", "habits", "prayer", "journal", "finance"]);

    // Load notification and nav preferences from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            // Load notification permission status
            if ("Notification" in window) {
                setNotificationsEnabled(Notification.permission === "granted");
            }

            // Load pinned nav preferences
            const savedNav = localStorage.getItem("nextlife-pinned-nav");
            if (savedNav) {
                try {
                    setPinnedNav(JSON.parse(savedNav));
                } catch (e) {
                    console.error("Failed to parse pinned nav", e);
                }
            }
        }
    }, []);

    // Request notification permission
    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("Notifications not supported in this browser");
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            setNotificationsEnabled(true);

            // Show a test notification
            new Notification("NextLife Notifications", {
                body: "You'll now receive reminders for your tasks and habits!",
                icon: "/icon-192x192.png",
            });

            // Schedule reminder notifications
            scheduleReminders();
        }
    };

    // Schedule reminder notifications
    const scheduleReminders = () => {
        // Morning reminder at 10 AM
        const now = new Date();
        const morning = new Date(now);
        morning.setHours(10, 0, 0, 0);
        if (morning <= now) morning.setDate(morning.getDate() + 1);

        const morningDelay = morning.getTime() - now.getTime();
        setTimeout(() => {
            if (Notification.permission === "granted") {
                new Notification("Good Morning! ☀️", {
                    body: "Time to check your habits and start the day strong!",
                    icon: "/icon-192x192.png",
                });
            }
        }, morningDelay);

        // Evening reminder at 10 PM
        const evening = new Date(now);
        evening.setHours(22, 0, 0, 0);
        if (evening <= now) evening.setDate(evening.getDate() + 1);

        const eveningDelay = evening.getTime() - now.getTime();
        setTimeout(() => {
            if (Notification.permission === "granted") {
                new Notification("Evening Check-in 🌙", {
                    body: "How was your day? Don't forget to complete your habits!",
                    icon: "/icon-192x192.png",
                });
            }
        }, eveningDelay);
    };

    // Toggle pinned nav item
    const togglePinnedNav = (id: string) => {
        let newPinned: string[];
        if (pinnedNav.includes(id)) {
            if (pinnedNav.length <= 3) {
                return; // Need at least 3
            }
            newPinned = pinnedNav.filter(p => p !== id);
        } else {
            if (pinnedNav.length >= 5) {
                return; // Max 5
            }
            newPinned = [...pinnedNav, id];
        }
        setPinnedNav(newPinned);
        localStorage.setItem("nextlife-pinned-nav", JSON.stringify(newPinned));
    };

    // Export data as PDF
    const exportAsPDF = async () => {
        try {
            const data: Record<string, unknown> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    try {
                        data[key] = JSON.parse(localStorage.getItem(key) || "");
                    } catch {
                        data[key] = localStorage.getItem(key);
                    }
                }
            }

            const printWindow = window.open("", "_blank");
            if (!printWindow) {
                alert("Please allow popups to export PDF");
                return;
            }

            const today = new Date().toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
            });

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>NextLife Data Export - ${today}</title>
                    <style>
                        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                        h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
                        pre { background: #f4f4f5; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
                        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
                        .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">N</div>
                        <div>
                            <h1 style="margin: 0; border: none; padding: 0;">NextLife Data Export</h1>
                            <p style="color: #71717a;">${today} • ${user?.name || "User"}</p>
                        </div>
                    </div>
                    <h2>Your Data</h2>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                    <script>setTimeout(() => window.print(), 500);</script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (e) {
            console.error("Failed to export data:", e);
        }
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "customize", label: "Customize", icon: Pin },
        { id: "account", label: "Account", icon: Shield },
    ] as const;

    return (
        <div className="space-y-5 pb-24 md:pb-6">
            {/* Header - Slate Theme */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                    <div className="p-2 md:p-2.5 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
                        <Settings className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <span className="text-slate-800 dark:text-slate-100">Settings</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
            </div>

            {/* Tabs - Premium Pill Style */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? "bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
                <div className="space-y-4">
                    <div className="bg-card border-2 border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4">Your Profile</h2>
                        <div className="flex items-center gap-4 mb-6">
                            {user?.image ? (
                                <img src={user.image} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold">{user?.name || "User"}</h3>
                                <p className="text-muted-foreground">{user?.email}</p>
                                <p className="text-sm text-primary mt-1">Google Account</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <p className="text-sm text-muted-foreground">
                                Your profile is managed by your Google account. To update your profile picture or name, please update your Google account settings.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
                <div className="space-y-4">
                    <div className="bg-card border-2 border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <BellRing className="w-5 h-5 text-primary" />
                            Push Notifications
                        </h2>

                        {notificationsEnabled ? (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                    ✓ Notifications are enabled
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    You&apos;ll receive reminders at 10 AM and 10 PM.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    Enable push notifications to get reminders for your daily activities.
                                </p>
                                <button
                                    onClick={requestNotificationPermission}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold hover:scale-[1.02] transition-transform"
                                >
                                    Enable Notifications
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-card border-2 border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4">Reminder Schedule</h2>
                        <div className="space-y-3">
                            {[
                                { label: "Morning Habit Check", time: "10:00 AM" },
                                { label: "Evening Review", time: "10:00 PM" },
                                { label: "Pending Task Reminder", time: "Included in checks" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                                    <span className="font-medium">{item.label}</span>
                                    <span className="text-sm text-muted-foreground">{item.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Customize Tab - Mobile Nav Pins */}
            {activeTab === "customize" && (
                <div className="space-y-4">
                    <div className="bg-card border-2 border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <Pin className="w-5 h-5 text-primary" />
                            Customize Mobile Navigation
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Choose which items appear in your mobile bottom navigation bar (3-5 items).
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            {NAV_OPTIONS.map((nav) => {
                                const isPinned = pinnedNav.includes(nav.id);
                                return (
                                    <button
                                        key={nav.id}
                                        onClick={() => togglePinnedNav(nav.id)}
                                        className={`flex items-center gap-3 p-4 rounded-xl transition-all ${isPinned
                                            ? "bg-primary/20 border-2 border-primary"
                                            : "bg-secondary/50 border-2 border-transparent hover:bg-secondary"
                                            }`}
                                    >
                                        <span className="text-xl">{nav.emoji}</span>
                                        <span className="font-medium">{nav.label}</span>
                                        {isPinned && (
                                            <Pin className="w-4 h-4 text-primary ml-auto" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-xs text-muted-foreground mt-4">
                            Current selection: {pinnedNav.length}/5 items
                        </p>
                    </div>
                </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
                <div className="space-y-4">
                    <div className="bg-card border-2 border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4">Data & Privacy</h2>
                        <div className="space-y-3">
                            <button
                                onClick={exportAsPDF}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-primary" />
                                    <div className="text-left">
                                        <span className="font-medium block">Export as PDF</span>
                                        <span className="text-sm text-muted-foreground">Download your data in PDF format</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/5 border-2 border-red-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-2 text-red-500">Danger Zone</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            These actions are irreversible. Please be careful.
                        </p>
                        <button
                            onClick={() => {
                                if (confirm("⚠️ Are you sure you want to delete ALL your data? This cannot be undone!")) {
                                    if (confirm("This will delete all your habits, prayers, journal entries, and every other data. Continue?")) {
                                        // Clear all localStorage
                                        localStorage.clear();

                                        // Clear all IndexedDB databases
                                        if (typeof indexedDB !== "undefined") {
                                            indexedDB.databases().then((databases) => {
                                                databases.forEach((db) => {
                                                    if (db.name) {
                                                        indexedDB.deleteDatabase(db.name);
                                                    }
                                                });
                                            });
                                        }

                                        // Reload the page
                                        alert("All data has been cleared. The page will now reload.");
                                        window.location.href = "/";
                                    }
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 className="w-5 h-5 text-red-500" />
                                <div className="text-left">
                                    <span className="font-medium block text-red-500">Reset All Data</span>
                                    <span className="text-sm text-red-400/70">Delete all habits, prayers, and app data</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-red-400" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
