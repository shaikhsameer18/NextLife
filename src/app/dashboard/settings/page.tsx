"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/hooks/use-toast";
import {
    Settings,
    User,
    Moon,
    Sun,
    Bell,
    Shield,
    Database,
    LogOut,
    ChevronRight,
    Loader2,
} from "lucide-react";

export default function SettingsPage() {
    const { user, settings, updateSettings, updateProfile, changePassword, logout } = useAuthStore();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "notifications" | "security">("profile");
    const [loading, setLoading] = useState(false);

    // Profile form
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");

    // Password form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleUpdateProfile = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await updateProfile({ name: name.trim() });
            toast({ title: "Profile updated!" });
        } catch {
            toast({ title: "Failed to update profile", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast({ title: "Passwords don't match", variant: "destructive" });
            return;
        }
        if (newPassword.length < 8) {
            toast({ title: "Password must be at least 8 characters", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const success = await changePassword(currentPassword, newPassword);
            if (success) {
                toast({ title: "Password changed successfully!" });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch {
            toast({ title: "Failed to change password", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleThemeChange = async (theme: "light" | "dark" | "system") => {
        await updateSettings({ theme });
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else if (theme === "light") {
            document.documentElement.classList.remove("dark");
        } else {
            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
        toast({ title: `Theme set to ${theme}` });
    };

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "appearance", label: "Appearance", icon: Sun },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "security", label: "Security", icon: Shield },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-7 h-7" />
                    Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account and preferences
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-card border border-border rounded-2xl p-6">
                        {/* Profile Tab */}
                        {activeTab === "profile" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4">Profile Information</h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                disabled
                                                className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-muted-foreground cursor-not-allowed"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Email cannot be changed
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={loading || name === user?.name}
                                            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Permanently delete your account and all data
                                    </p>
                                    <button className="px-4 py-2 rounded-xl border border-destructive text-destructive hover:bg-destructive/10 transition-colors font-medium">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Appearance Tab */}
                        {activeTab === "appearance" && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold">Appearance</h2>

                                <div>
                                    <label className="block text-sm font-medium mb-3">Theme</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(["light", "dark", "system"] as const).map((theme) => (
                                            <button
                                                key={theme}
                                                onClick={() => handleThemeChange(theme)}
                                                className={`p-4 rounded-xl border-2 transition-all capitalize ${settings?.theme === theme
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                {theme === "light" && <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />}
                                                {theme === "dark" && <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />}
                                                {theme === "system" && <Settings className="w-6 h-6 mx-auto mb-2" />}
                                                <span className="font-medium">{theme}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === "notifications" && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold">Notification Preferences</h2>

                                <div className="space-y-4">
                                    {[
                                        { key: "enabled", label: "Enable Notifications", description: "Receive notifications from the app" },
                                        { key: "prayerReminders", label: "Prayer Reminders", description: "Get reminded for daily prayers" },
                                        { key: "habitReminders", label: "Habit Reminders", description: "Get reminded to complete habits" },
                                        { key: "taskReminders", label: "Task Reminders", description: "Get notified about due tasks" },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                                        >
                                            <div>
                                                <p className="font-medium">{item.label}</p>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    updateSettings({
                                                        notifications: {
                                                            ...settings?.notifications!,
                                                            [item.key]: !settings?.notifications?.[item.key as keyof typeof settings.notifications],
                                                        },
                                                    })
                                                }
                                                className={`w-12 h-6 rounded-full transition-colors relative ${settings?.notifications?.[item.key as keyof typeof settings.notifications]
                                                        ? "bg-primary"
                                                        : "bg-muted"
                                                    }`}
                                            >
                                                <div
                                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings?.notifications?.[item.key as keyof typeof settings.notifications]
                                                            ? "left-7"
                                                            : "left-1"
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === "security" && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold">Change Password</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Current Password</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleChangePassword}
                                        disabled={loading || !currentPassword || !newPassword}
                                        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Change Password"}
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h3 className="font-semibold mb-2">Data & Storage</h3>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                                        <Database className="w-5 h-5 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="font-medium">Local Data</p>
                                            <p className="text-sm text-muted-foreground">
                                                All your data is stored locally on this device
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
