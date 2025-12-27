import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSettings } from "@/types";
import { defaultUserSettings } from "@/types";
import { getGlobalDatabase, getUserDatabase, clearUserDatabaseCache } from "@/lib/db/database";

interface AuthState {
    // User settings (synced locally for offline access)
    settings: UserSettings | null;

    // Current user ID (from NextAuth session)
    currentUserId: string | null;

    // Actions
    initializeUser: (userId: string, email: string, name: string) => Promise<void>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
    clearUser: () => void;
    getSettings: () => UserSettings | null;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            settings: null,
            currentUserId: null,

            initializeUser: async (userId: string, email: string, name: string) => {
                try {
                    const db = getGlobalDatabase();

                    // Check if user exists in local database
                    let localUser = await db.users.get(userId);

                    if (!localUser) {
                        // Create local user record for settings storage
                        const now = Date.now();
                        localUser = {
                            id: userId,
                            email: email.toLowerCase(),
                            name,
                            passwordHash: "", // Not used with OAuth
                            createdAt: now,
                            updatedAt: now,
                            lastLoginAt: now,
                            settings: defaultUserSettings,
                        };
                        await db.users.add(localUser);
                    } else {
                        // Update last login
                        const now = Date.now();
                        await db.users.update(userId, {
                            lastLoginAt: now,
                            updatedAt: now,
                            name, // Update name in case it changed
                            email: email.toLowerCase(),
                        });
                    }

                    // Initialize user database for data storage
                    getUserDatabase(userId);

                    set({
                        currentUserId: userId,
                        settings: localUser.settings,
                    });
                } catch (error) {
                    console.error("Error initializing user:", error);
                }
            },

            updateSettings: async (newSettings: Partial<UserSettings>) => {
                const { currentUserId, settings } = get();

                if (!currentUserId || !settings) return;

                try {
                    const db = getGlobalDatabase();
                    const updatedSettings = { ...settings, ...newSettings };
                    const now = Date.now();

                    await db.users.update(currentUserId, {
                        settings: updatedSettings,
                        updatedAt: now,
                    });

                    set({ settings: updatedSettings });
                } catch (error) {
                    console.error("Update settings error:", error);
                }
            },

            clearUser: () => {
                const { currentUserId } = get();

                if (currentUserId) {
                    clearUserDatabaseCache(currentUserId);
                }

                set({
                    currentUserId: null,
                    settings: null,
                });
            },

            getSettings: () => get().settings,
        }),
        {
            name: "lifetracker-auth",
            partialize: (state) => ({
                currentUserId: state.currentUserId,
                settings: state.settings,
            }),
        }
    )
);

// Hook to get current user's database
export function useUserDatabase() {
    const currentUserId = useAuthStore((state) => state.currentUserId);
    if (!currentUserId) return null;
    return getUserDatabase(currentUserId);
}
