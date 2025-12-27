import Dexie, { Table } from "dexie";
import type {
    User,
    Session,
    Habit,
    HabitLog,
    Prayer,
    SleepLog,
    MealLog,
    WaterLog,
    Task,
    Project,
    PomodoroSession,
    JournalEntry,
    VaultItem,
    Expense,
    Budget,
    Subscription,
} from "@/types";

// Global database for user accounts (shared across all users)
class GlobalDatabase extends Dexie {
    users!: Table<User>;
    sessions!: Table<Session>;

    constructor() {
        super("lifetracker-global");
        this.version(1).stores({
            users: "id, email",
            sessions: "userId, token, expiresAt",
        });
    }
}

// Per-user database for all user data
class UserDatabase extends Dexie {
    habits!: Table<Habit>;
    habitLogs!: Table<HabitLog>;
    prayers!: Table<Prayer>;
    sleepLogs!: Table<SleepLog>;
    mealLogs!: Table<MealLog>;
    waterLogs!: Table<WaterLog>;
    tasks!: Table<Task>;
    projects!: Table<Project>;
    pomodoroSessions!: Table<PomodoroSession>;
    journalEntries!: Table<JournalEntry>;
    vaultItems!: Table<VaultItem>;
    expenses!: Table<Expense>;
    budgets!: Table<Budget>;
    subscriptions!: Table<Subscription>;
    fitness!: Table<{ id: string; date: string; weight?: number; steps?: number; workoutType?: string; workoutDuration?: number; caloriesBurned?: number; notes?: string; createdAt: string }>;

    constructor(userId: string) {
        super(`lifetracker-user-${userId}`);

        this.version(2).stores({
            // Habits
            habits: "id, userId, name, createdAt, isArchived, order",
            habitLogs: "id, habitId, date, userId, createdAt",

            // Prayer
            prayers: "id, userId, date, createdAt",

            // Sleep
            sleepLogs: "id, userId, date, createdAt",

            // Meals
            mealLogs: "id, userId, date, type, createdAt",

            // Water
            waterLogs: "id, userId, date, time, createdAt",

            // Tasks
            tasks: "id, userId, status, priority, dueDate, projectId, createdAt, order",
            projects: "id, userId, name, createdAt, isArchived",

            // Pomodoro
            pomodoroSessions: "id, userId, date, taskId, type, createdAt",

            // Journal
            journalEntries: "id, userId, date, *tags, createdAt",

            // Knowledge Vault
            vaultItems: "id, userId, type, *tags, isFavorite, isArchived, createdAt",

            // Finance
            expenses: "id, userId, date, category, createdAt",
            budgets: "id, userId, category, period, createdAt",
            subscriptions: "id, userId, category, isActive, nextBillingDate, createdAt",

            // Fitness
            fitness: "id, date, workoutType, createdAt",
        });
    }
}

// Singleton for global database
let globalDb: GlobalDatabase | null = null;

export function getGlobalDatabase(): GlobalDatabase {
    if (!globalDb) {
        globalDb = new GlobalDatabase();
    }
    return globalDb;
}

// Cache for user databases
const userDatabases = new Map<string, UserDatabase>();

export function getUserDatabase(userId: string): UserDatabase {
    if (!userDatabases.has(userId)) {
        userDatabases.set(userId, new UserDatabase(userId));
    }
    return userDatabases.get(userId)!;
}

// Clear user database cache on logout
export function clearUserDatabaseCache(userId?: string) {
    if (userId) {
        const db = userDatabases.get(userId);
        if (db) {
            db.close();
            userDatabases.delete(userId);
        }
    } else {
        userDatabases.forEach((db) => db.close());
        userDatabases.clear();
    }
}

// Delete user database completely
export async function deleteUserDatabase(userId: string): Promise<void> {
    clearUserDatabaseCache(userId);
    await Dexie.delete(`lifetracker-user-${userId}`);
}

// Export database classes for type inference
export { GlobalDatabase, UserDatabase };
