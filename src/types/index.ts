// Base record interface - all data includes these fields for multi-user isolation
export interface BaseRecord {
    id: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    syncStatus: "pending" | "synced" | "conflict";
    version: number;
    isDeleted?: boolean;
}

// User account
export interface User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: number;
    updatedAt: number;
    lastLoginAt: number;
    settings: UserSettings;
}

export interface UserSettings {
    theme: "light" | "dark" | "system";
    enabledModules: string[];
    notifications: {
        enabled: boolean;
        prayerReminders: boolean;
        habitReminders: boolean;
        taskReminders: boolean;
    };
    sync: {
        enabled: boolean;
        autoSync: boolean;
        lastSyncAt: number | null;
    };
}

export const defaultUserSettings: UserSettings = {
    theme: "system",
    enabledModules: [
        "habits",
        "prayer",
        "sleep",
        "meals",
        "water",
        "tasks",
        "pomodoro",
        "journal",
        "vault",
        "finance",
    ],
    notifications: {
        enabled: true,
        prayerReminders: true,
        habitReminders: true,
        taskReminders: true,
    },
    sync: {
        enabled: false,
        autoSync: false,
        lastSyncAt: null,
    },
};

// Session for offline auth persistence
export interface Session {
    userId: string;
    email: string;
    name: string;
    token: string;
    expiresAt: number;
    createdAt: number;
}

// Habit module types
export interface Habit extends BaseRecord {
    name: string;
    description?: string;
    frequency: "daily" | "weekly" | "custom";
    targetDays?: number[]; // 0-6 for Sun-Sat
    color: string;
    icon: string;
    isArchived: boolean;
    order: number;
}

export interface HabitLog extends BaseRecord {
    habitId: string;
    date: string; // YYYY-MM-DD
    completed: boolean;
    notes?: string;
}

// Prayer (Namaz) module types
export interface Prayer extends BaseRecord {
    date: string; // YYYY-MM-DD
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    notes?: string;
}

export type PrayerType = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

// Sleep module types
export interface SleepLog extends BaseRecord {
    date: string; // YYYY-MM-DD
    bedtime: string; // HH:MM
    wakeTime: string; // HH:MM
    duration: number; // minutes
    quality: 1 | 2 | 3 | 4 | 5;
    notes?: string;
}

// Meal module types
export interface MealLog extends BaseRecord {
    date: string;
    type: "breakfast" | "lunch" | "dinner" | "snack";
    description: string;
    calories?: number;
    time: string; // HH:MM
    notes?: string;
}

// Water intake types
export interface WaterLog extends BaseRecord {
    date: string;
    amount: number; // ml
    time: string; // HH:MM
}

// Task module types
export interface Task extends BaseRecord {
    title: string;
    description?: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "todo" | "in_progress" | "done" | "cancelled";
    dueDate?: string;
    dueTime?: string;
    tags: string[];
    projectId?: string;
    order: number;
}

export interface Project extends BaseRecord {
    name: string;
    description?: string;
    color: string;
    isArchived: boolean;
}

// Pomodoro module types
export interface PomodoroSession extends BaseRecord {
    date: string;
    startTime: string;
    endTime: string;
    duration: number; // minutes
    type: "work" | "short_break" | "long_break";
    taskId?: string;
    completed: boolean;
    notes?: string;
}

export interface PomodoroSettings {
    workDuration: number; // minutes
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
}

// Journal module types
export interface JournalEntry extends BaseRecord {
    date: string;
    title?: string;
    content: string;
    mood: 1 | 2 | 3 | 4 | 5;
    tags: string[];
}

// Knowledge vault types
export interface VaultItem extends BaseRecord {
    type: "note" | "link" | "idea";
    title: string;
    content: string;
    url?: string;
    tags: string[];
    isFavorite: boolean;
    isArchived: boolean;
}

// Finance module types
export interface Expense extends BaseRecord {
    date: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    paymentMethod?: string;
    isRecurring: boolean;
}

export interface Budget extends BaseRecord {
    category: string;
    amount: number;
    period: "weekly" | "monthly" | "yearly";
    startDate: string;
}

export interface Subscription extends BaseRecord {
    name: string;
    amount: number;
    currency: string;
    billingCycle: "weekly" | "monthly" | "quarterly" | "yearly";
    startDate: string;
    nextBillingDate: string;
    category: string;
    isActive: boolean;
    notes?: string;
}

// Analytics and insights types
export interface DailySummary {
    date: string;
    habitsCompleted: number;
    habitsTotal: number;
    prayersCompleted: number;
    prayersTotal: number;
    sleepDuration: number;
    sleepQuality: number;
    waterIntake: number;
    tasksCompleted: number;
    pomodoroMinutes: number;
    expenses: number;
    mood: number;
}

export interface WeeklyInsight {
    weekStart: string;
    weekEnd: string;
    habitConsistency: number;
    prayerConsistency: number;
    averageSleep: number;
    totalFocusTime: number;
    productivityScore: number;
    topExpenseCategory: string;
    trends: {
        habits: "up" | "down" | "stable";
        sleep: "up" | "down" | "stable";
        focus: "up" | "down" | "stable";
    };
}

// Module definition for registry
export interface ModuleDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: "daily" | "productivity" | "knowledge" | "finance" | "insights";
    enabled: boolean;
}
