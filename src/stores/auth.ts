import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import type { User, Session, UserSettings } from "@/types";
import { defaultUserSettings } from "@/types";
import { getGlobalDatabase, getUserDatabase, clearUserDatabaseCache } from "@/lib/db/database";

interface AuthState {
    // Current user state
    user: User | null;
    session: Session | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // User settings (quick access)
    settings: UserSettings | null;

    // Actions
    init: () => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<boolean>;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
    updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: true,
            error: null,
            settings: null,

            init: async () => {
                set({ isLoading: true, error: null });

                try {
                    const db = getGlobalDatabase();
                    const storedSession = get().session;

                    if (storedSession && storedSession.expiresAt > Date.now()) {
                        // Validate session
                        const user = await db.users.get(storedSession.userId);

                        if (user) {
                            // Initialize user database
                            getUserDatabase(user.id);

                            set({
                                user,
                                session: storedSession,
                                isAuthenticated: true,
                                settings: user.settings,
                                isLoading: false,
                            });
                            return;
                        }
                    }

                    // No valid session
                    set({
                        user: null,
                        session: null,
                        isAuthenticated: false,
                        settings: null,
                        isLoading: false,
                    });
                } catch (error) {
                    console.error("Auth init error:", error);
                    set({
                        user: null,
                        session: null,
                        isAuthenticated: false,
                        settings: null,
                        isLoading: false,
                        error: "Failed to initialize authentication",
                    });
                }
            },

            register: async (email: string, password: string, name: string) => {
                set({ isLoading: true, error: null });

                try {
                    const db = getGlobalDatabase();

                    // Check if user exists
                    const existingUser = await db.users.where("email").equals(email.toLowerCase()).first();

                    if (existingUser) {
                        set({ isLoading: false, error: "An account with this email already exists" });
                        return false;
                    }

                    // Hash password
                    const passwordHash = await bcrypt.hash(password, 12);

                    // Create user
                    const now = Date.now();
                    const user: User = {
                        id: uuid(),
                        email: email.toLowerCase(),
                        name,
                        passwordHash,
                        createdAt: now,
                        updatedAt: now,
                        lastLoginAt: now,
                        settings: defaultUserSettings,
                    };

                    await db.users.add(user);

                    // Create session
                    const session: Session = {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        token: uuid(),
                        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                        createdAt: now,
                    };

                    await db.sessions.put(session);

                    // Initialize user database
                    getUserDatabase(user.id);

                    set({
                        user,
                        session,
                        isAuthenticated: true,
                        settings: user.settings,
                        isLoading: false,
                    });

                    return true;
                } catch (error) {
                    console.error("Registration error:", error);
                    set({
                        isLoading: false,
                        error: "Registration failed. Please try again.",
                    });
                    return false;
                }
            },

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });

                try {
                    const db = getGlobalDatabase();

                    // Find user
                    const user = await db.users.where("email").equals(email.toLowerCase()).first();

                    if (!user) {
                        set({ isLoading: false, error: "Invalid email or password" });
                        return false;
                    }

                    // Verify password
                    const isValid = await bcrypt.compare(password, user.passwordHash);

                    if (!isValid) {
                        set({ isLoading: false, error: "Invalid email or password" });
                        return false;
                    }

                    // Update last login
                    const now = Date.now();
                    await db.users.update(user.id, { lastLoginAt: now, updatedAt: now });

                    // Create session
                    const session: Session = {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        token: uuid(),
                        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                        createdAt: now,
                    };

                    await db.sessions.put(session);

                    // Initialize user database
                    getUserDatabase(user.id);

                    const updatedUser = { ...user, lastLoginAt: now, updatedAt: now };

                    set({
                        user: updatedUser,
                        session,
                        isAuthenticated: true,
                        settings: user.settings,
                        isLoading: false,
                    });

                    return true;
                } catch (error) {
                    console.error("Login error:", error);
                    set({
                        isLoading: false,
                        error: "Login failed. Please try again.",
                    });
                    return false;
                }
            },

            logout: async () => {
                const { session, user } = get();

                try {
                    if (session) {
                        const db = getGlobalDatabase();
                        await db.sessions.delete(session.userId);
                    }

                    // Clear user database cache
                    if (user) {
                        clearUserDatabaseCache(user.id);
                    }
                } catch (error) {
                    console.error("Logout error:", error);
                }

                set({
                    user: null,
                    session: null,
                    isAuthenticated: false,
                    settings: null,
                    isLoading: false,
                    error: null,
                });
            },

            updateSettings: async (newSettings: Partial<UserSettings>) => {
                const { user, settings } = get();

                if (!user || !settings) return;

                try {
                    const db = getGlobalDatabase();
                    const updatedSettings = { ...settings, ...newSettings };
                    const now = Date.now();

                    await db.users.update(user.id, {
                        settings: updatedSettings,
                        updatedAt: now,
                    });

                    set({
                        settings: updatedSettings,
                        user: { ...user, settings: updatedSettings, updatedAt: now },
                    });
                } catch (error) {
                    console.error("Update settings error:", error);
                    set({ error: "Failed to update settings" });
                }
            },

            updateProfile: async (data: { name?: string; email?: string }) => {
                const { user } = get();

                if (!user) return;

                try {
                    const db = getGlobalDatabase();
                    const now = Date.now();

                    await db.users.update(user.id, {
                        ...data,
                        updatedAt: now,
                    });

                    set({
                        user: { ...user, ...data, updatedAt: now },
                    });
                } catch (error) {
                    console.error("Update profile error:", error);
                    set({ error: "Failed to update profile" });
                }
            },

            changePassword: async (currentPassword: string, newPassword: string) => {
                const { user } = get();

                if (!user) return false;

                try {
                    // Verify current password
                    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

                    if (!isValid) {
                        set({ error: "Current password is incorrect" });
                        return false;
                    }

                    // Hash new password
                    const passwordHash = await bcrypt.hash(newPassword, 12);
                    const now = Date.now();

                    const db = getGlobalDatabase();
                    await db.users.update(user.id, {
                        passwordHash,
                        updatedAt: now,
                    });

                    set({
                        user: { ...user, passwordHash, updatedAt: now },
                        error: null,
                    });

                    return true;
                } catch (error) {
                    console.error("Change password error:", error);
                    set({ error: "Failed to change password" });
                    return false;
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: "lifetracker-auth",
            partialize: (state) => ({
                session: state.session,
            }),
        }
    )
);
