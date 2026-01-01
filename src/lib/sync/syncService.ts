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

// Debounce timers for each data type
const syncDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
const DEBOUNCE_DELAY = 1500; // 1.5 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Track sync status
let isSyncing = false;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 5000; // Minimum 5 seconds between full syncs

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all data of a specific type from Supabase cloud with retry logic
 */
export async function fetchFromCloud(
    userId: string,
    dataType: SyncDataType,
    retryCount = 0
): Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, error: "Supabase not configured" };
    }

    try {
        // Use maybeSingle() instead of single() to handle empty results gracefully
        const { data, error } = await client
            .from("user_data")
            .select("data")
            .eq("user_id", userId)
            .eq("data_type", dataType)
            .maybeSingle();

        if (error) {
            // Handle specific error codes
            if (error.code === "PGRST116") {
                // No data found - this is fine, return empty array
                return { success: true, data: [] };
            }

            // Handle 406 errors (table doesn't exist or RLS issues)
            if (error.message?.includes("406") || error.code === "406") {
                console.warn(`⚠ Cloud sync unavailable for ${dataType} - please check Supabase table setup`);
                return { success: true, data: [] }; // Return empty to allow app to continue
            }

            // Retry on transient errors
            if (retryCount < MAX_RETRIES && (error.code === "PGRST000" || error.message?.includes("network"))) {
                await sleep(RETRY_DELAY * (retryCount + 1));
                return fetchFromCloud(userId, dataType, retryCount + 1);
            }

            console.error(`Fetch from cloud error (${dataType}):`, error.message);
            return { success: false, error: error.message };
        }

        // Handle null response (no data exists yet)
        if (!data) {
            return { success: true, data: [] };
        }

        // Parse data - handle both string and object formats
        let parsedData: Record<string, unknown>[];
        try {
            parsedData = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
            // Ensure it's an array
            if (!Array.isArray(parsedData)) {
                parsedData = [];
            }
        } catch {
            console.warn(`Failed to parse cloud data for ${dataType}, using empty array`);
            parsedData = [];
        }

        return { success: true, data: parsedData };
    } catch (error) {
        // Handle network errors with retry
        if (retryCount < MAX_RETRIES) {
            await sleep(RETRY_DELAY * (retryCount + 1));
            return fetchFromCloud(userId, dataType, retryCount + 1);
        }

        console.error(`Fetch from cloud error (${dataType}):`, error);
        return { success: true, data: [] }; // Return empty to allow app to continue
    }
}

/**
 * Save all data of a specific type to Supabase cloud with retry logic
 */
export async function saveToCloud(
    userId: string,
    dataType: SyncDataType,
    data: Record<string, unknown>[],
    retryCount = 0
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
            // Handle 406 errors gracefully
            if (error.message?.includes("406") || error.code === "406") {
                console.warn(`⚠ Cloud save unavailable for ${dataType} - please check Supabase table setup`);
                return { success: false, error: "Cloud sync not configured" };
            }

            // Retry on transient errors
            if (retryCount < MAX_RETRIES && (error.code === "PGRST000" || error.message?.includes("network"))) {
                await sleep(RETRY_DELAY * (retryCount + 1));
                return saveToCloud(userId, dataType, data, retryCount + 1);
            }

            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        // Handle network errors with retry
        if (retryCount < MAX_RETRIES) {
            await sleep(RETRY_DELAY * (retryCount + 1));
            return saveToCloud(userId, dataType, data, retryCount + 1);
        }

        console.error(`Save to cloud error (${dataType}):`, error);
        return { success: false, error: "Failed to save data to cloud" };
    }
}

/**
 * Sync a specific data type from local DB to cloud (debounced)
 */
export async function syncToCloud(userId: string, dataType: SyncDataType): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        return { success: true, syncedTypes: [] }; // Silent success when not configured
    }

    // Clear existing debounce timer for this data type
    const timerKey = `${userId}-${dataType}`;
    const existingTimer = syncDebounceTimers.get(timerKey);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Return a promise that resolves after debounce
    return new Promise((resolve) => {
        const timer = setTimeout(async () => {
            syncDebounceTimers.delete(timerKey);

            try {
                const db = getUserDatabase(userId);
                const table = db[dataType];

                if (!table) {
                    resolve({ success: false, error: `Unknown data type: ${dataType}` });
                    return;
                }

                // Get all local data
                const localData = await table.toArray();

                // Save to cloud
                const result = await saveToCloud(userId, dataType, localData as Record<string, unknown>[]);

                if (!result.success) {
                    resolve({ success: false, error: result.error });
                    return;
                }

                console.log(`✓ Synced ${dataType} to cloud (${localData.length} items)`);
                resolve({ success: true, syncedTypes: [dataType] });
            } catch (error) {
                console.error(`Sync to cloud error (${dataType}):`, error);
                resolve({ success: false, error: `Failed to sync ${dataType}` });
            }
        }, DEBOUNCE_DELAY);

        syncDebounceTimers.set(timerKey, timer);
    });
}

/**
 * Immediately sync a specific data type (no debounce)
 */
export async function syncToCloudImmediate(userId: string, dataType: SyncDataType): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        return { success: true, syncedTypes: [] };
    }

    try {
        const db = getUserDatabase(userId);
        const table = db[dataType];

        if (!table) {
            return { success: false, error: `Unknown data type: ${dataType}` };
        }

        const localData = await table.toArray();
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
        return { success: true, syncedTypes: [] };
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
            for (const item of mergedData) {
                await (table as any).add(item);
            }
        }

        console.log(`✓ Synced ${dataType} from cloud (${cloudData.length} cloud, ${mergedData.length} merged)`);
        return { success: true, syncedTypes: [dataType] };
    } catch (error) {
        console.error(`Sync from cloud error (${dataType}):`, error);
        return { success: true, syncedTypes: [dataType] }; // Return success to not block other syncs
    }
}

/**
 * Sync all data types from cloud to local (usually on login)
 * Includes rate limiting to prevent duplicate syncs
 */
export async function syncAllFromCloud(userId: string): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
        console.log("○ Supabase not configured, skipping cloud sync");
        return { success: true, syncedTypes: [] };
    }

    // Rate limit full syncs
    const now = Date.now();
    if (isSyncing || (now - lastSyncTime < MIN_SYNC_INTERVAL)) {
        console.log("○ Sync already in progress or too soon, skipping");
        return { success: true, syncedTypes: [] };
    }

    isSyncing = true;
    lastSyncTime = now;

    console.log("🔄 Starting full sync from cloud...");

    const syncedTypes: SyncDataType[] = [];
    const errors: string[] = [];

    try {
        // Sync in parallel for better performance (but limit concurrency)
        const batchSize = 5;
        for (let i = 0; i < SYNC_DATA_TYPES.length; i += batchSize) {
            const batch = SYNC_DATA_TYPES.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map((dataType) => syncFromCloud(userId, dataType))
            );

            results.forEach((result, index) => {
                if (result.success) {
                    syncedTypes.push(batch[index]);
                } else {
                    errors.push(`${batch[index]}: ${result.error}`);
                }
            });
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
    } finally {
        isSyncing = false;
    }
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

    // Sync in parallel for better performance
    const batchSize = 5;
    for (let i = 0; i < SYNC_DATA_TYPES.length; i += batchSize) {
        const batch = SYNC_DATA_TYPES.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map((dataType) => syncToCloudImmediate(userId, dataType))
        );

        results.forEach((result, index) => {
            if (result.success) {
                syncedTypes.push(batch[index]);
            } else {
                errors.push(`${batch[index]}: ${result.error}`);
            }
        });
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

/**
 * Get current sync status
 */
export function getSyncStatus(): { isSyncing: boolean; lastSyncTime: number } {
    return { isSyncing, lastSyncTime };
}

/**
 * Check if cloud sync is available (Supabase configured)
 */
export function isCloudSyncAvailable(): boolean {
    return isSupabaseConfigured();
}
