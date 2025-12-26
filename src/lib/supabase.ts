import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These will need to be filled in with actual Supabase credentials
// For now, we'll use placeholder values that can be set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    if (!supabase) {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        });
    }

    return supabase;
}

export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

// Types for cloud sync
export interface CloudUser {
    id: string;
    email: string;
    name: string;
    created_at: string;
}

export interface CloudSyncData {
    user_id: string;
    data_type: string;
    data: Record<string, unknown>;
    updated_at: string;
}

// Cloud authentication functions
export async function cloudSignUp(
    email: string,
    password: string,
    name: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Cloud sync not configured" };
    }

    try {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, userId: data.user?.id };
    } catch (error) {
        console.error("Cloud signup error:", error);
        return { success: false, error: "Failed to create cloud account" };
    }
}

export async function cloudSignIn(
    email: string,
    password: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Cloud sync not configured" };
    }

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, userId: data.user?.id };
    } catch (error) {
        console.error("Cloud signin error:", error);
        return { success: false, error: "Failed to sign in to cloud" };
    }
}

export async function cloudSignOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
}

// Data sync functions
export async function syncDataToCloud(
    userId: string,
    dataType: string,
    data: Record<string, unknown>[]
): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Cloud sync not configured" };
    }

    try {
        const { error } = await client.from("user_data").upsert({
            user_id: userId,
            data_type: dataType,
            data: JSON.stringify(data),
            updated_at: new Date().toISOString(),
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Sync to cloud error:", error);
        return { success: false, error: "Failed to sync data" };
    }
}

export async function fetchDataFromCloud(
    userId: string,
    dataType: string
): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Cloud sync not configured" };
    }

    try {
        const { data, error } = await client
            .from("user_data")
            .select("data")
            .eq("user_id", userId)
            .eq("data_type", dataType)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // No data found
                return { success: true, data: [] };
            }
            return { success: false, error: error.message };
        }

        return { success: true, data: JSON.parse(data.data) };
    } catch (error) {
        console.error("Fetch from cloud error:", error);
        return { success: false, error: "Failed to fetch data" };
    }
}

// Get current cloud session
export async function getCloudSession(): Promise<{
    isAuthenticated: boolean;
    userId?: string;
    email?: string;
}> {
    const client = getSupabaseClient();
    if (!client) {
        return { isAuthenticated: false };
    }

    try {
        const { data: { session } } = await client.auth.getSession();

        if (session?.user) {
            return {
                isAuthenticated: true,
                userId: session.user.id,
                email: session.user.email,
            };
        }

        return { isAuthenticated: false };
    } catch {
        return { isAuthenticated: false };
    }
}
