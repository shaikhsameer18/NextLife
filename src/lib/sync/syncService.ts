import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { getUserDatabase } from "@/lib/db/database";

// All data types that need to be synced
export const SYNC_DATA_TYPES = [
    "habits",
    "habitLogs",
    "prayers",
    "sleepLogs",
    "mealLogs",
    "waterLogs",
    "tasks",
    "projects",
    "pomodoroSessions",
    "journalEntries",
    "vaultItems",
    "expenses",
    "budgets",
    "subscriptions",
    "fitness",
] as const;

export type SyncDataType = (typeof SYNC_DATA_TYPES)[number];

interface SyncResult {
    success: boolean;
    error?: string;
    syncedTypes?: SyncDataType[];
}

/**
 * Fetch all data of a specific type from Supabase cloud
 */
export async function fetchFromCloud(
    userId: string,
    dataType: SyncDataType
): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Supabase not configured" };
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
                // No data found - this is fine, return empty array
                return { success: true, data: [] };
            }
            return { success: false, error: error.message };
        }

        const parsedData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
        return { success: true, data: parsedData };
    } catch (error) {
        console.error(`Fetch from cloud error (${dataType}):`, error);
        return { success: false, error: "Failed to fetch data from cloud" };
    }
}

/**
 * Save all data of a specific type to Supabase cloud
 */
export async function saveToCloud(
    userId: string,
    dataType: SyncDataType,
    data: Record<string, unknown>[]
): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Supabase not configured" };
    }

    try {
        const { error } = await client.from("user_data").upsert(
            {
                user_id: userId,
                data_type: dataType,
                data: JSON.stringify(data),
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,data_type",
            }
        );

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error(`Save to cloud error (${dataType}):`, error);
        return { success: false, error: "Failed to save data to cloud" };
    }
}

/**
 * Sync a specific data type from local DB to cloud
 */
export async function syncToCloud(userId: string, dataType: SyncDataType): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: "Supabase not configured" };
    }

    try {
        const db = getUserDatabase(userId);
        const table = db[dataType];

        if (!table) {
            return { success: false, error: `Unknown data type: ${dataType}` };
        }

        // Get all local data
        const localData = await table.toArray();

        // Save to cloud
        const result = await saveToCloud(userId, dataType, localData as Record<string, unknown>[]);

        if (!result.success) {
            return { success: false, error: result.error };
        }

        console.log(`✓ Synced ${dataType} to cloud (${localData.length} items)`);
        return { success: true, syncedTypes: [dataType] };
    } catch (error) {
        console.error(`Sync to cloud error (${dataType}):`, error);
        return { success: false, error: `Failed to sync ${dataType}` };
    }
}

/**
 * Fetch data from cloud and merge with local database
 * Cloud data takes precedence for conflicts (by id match)
 */
export async function syncFromCloud(userId: string, dataType: SyncDataType): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        return { success: false, error: "Supabase not configured" };
    }

    try {
        const db = getUserDatabase(userId);
        const table = db[dataType];

        if (!table) {
            return { success: false, error: `Unknown data type: ${dataType}` };
        }

        // Fetch cloud data
        const cloudResult = await fetchFromCloud(userId, dataType);

        if (!cloudResult.success) {
            return { success: false, error: cloudResult.error };
        }

        const cloudData = cloudResult.data || [];

        if (cloudData.length === 0) {
            console.log(`○ No cloud data for ${dataType}`);
            return { success: true, syncedTypes: [dataType] };
        }

        // Get local data for comparison
        const localData = await table.toArray();
        const localDataMap = new Map(localData.map((item) => [(item as { id: string }).id, item]));

        // Merge strategy: cloud wins, but keep local-only items
        const mergedData: Record<string, unknown>[] = [];
        const cloudIds = new Set<string>();

        for (const cloudItem of cloudData) {
            const id = (cloudItem as { id: string }).id;
            cloudIds.add(id);
            mergedData.push(cloudItem);
        }

        // Add local-only items (not in cloud yet)
        for (const localItem of localData) {
            const id = (localItem as { id: string }).id;
            if (!cloudIds.has(id)) {
                mergedData.push(localItem as Record<string, unknown>);
            }
        }

        // Clear and repopulate the table
        await table.clear();
        if (mergedData.length > 0) {
            await table.bulkAdd(mergedData as never[]);
        }

        console.log(`✓ Synced ${dataType} from cloud (${cloudData.length} cloud, ${mergedData.length} merged)`);
        return { success: true, syncedTypes: [dataType] };
    } catch (error) {
        console.error(`Sync from cloud error (${dataType}):`, error);
        return { success: false, error: `Failed to sync ${dataType} from cloud` };
    }
}

/**
 * Sync all data types from cloud to local (usually on login)
 */
export async function syncAllFromCloud(userId: string): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        console.log("○ Supabase not configured, skipping cloud sync");
        return { success: true, syncedTypes: [] };
    }

    console.log("🔄 Starting full sync from cloud...");

    const syncedTypes: SyncDataType[] = [];
    const errors: string[] = [];

    for (const dataType of SYNC_DATA_TYPES) {
        const result = await syncFromCloud(userId, dataType);
        if (result.success) {
            syncedTypes.push(dataType);
        } else {
            errors.push(`${dataType}: ${result.error}`);
        }
    }

    if (errors.length > 0) {
        console.warn("⚠ Some sync errors:", errors);
    }

    console.log(`✓ Full sync complete (${syncedTypes.length}/${SYNC_DATA_TYPES.length} types)`);

    return {
        success: errors.length === 0,
        syncedTypes,
        error: errors.length > 0 ? errors.join("; ") : undefined,
    };
}

/**
 * Sync all data types from local to cloud (backup/push all)
 */
export async function syncAllToCloud(userId: string): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        console.log("○ Supabase not configured, skipping cloud sync");
        return { success: true, syncedTypes: [] };
    }

    console.log("🔄 Starting full sync to cloud...");

    const syncedTypes: SyncDataType[] = [];
    const errors: string[] = [];

    for (const dataType of SYNC_DATA_TYPES) {
        const result = await syncToCloud(userId, dataType);
        if (result.success) {
            syncedTypes.push(dataType);
        } else {
            errors.push(`${dataType}: ${result.error}`);
        }
    }

    if (errors.length > 0) {
        console.warn("⚠ Some sync errors:", errors);
    }

    console.log(`✓ Full sync to cloud complete (${syncedTypes.length}/${SYNC_DATA_TYPES.length} types)`);

    return {
        success: errors.length === 0,
        syncedTypes,
        error: errors.length > 0 ? errors.join("; ") : undefined,
    };
}
