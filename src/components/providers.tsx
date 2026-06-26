"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession, onAuthStateChange, isSupabaseConfigured } from "@/lib/supabase";

// Use the return type from getSession rather than importing Session directly
type SupabaseSession = Awaited<ReturnType<typeof getSession>>;
type Session = NonNullable<SupabaseSession>;

type Theme = "light" | "dark";

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    isConfigured: boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    loading: true,
    isConfigured: false,
    theme: "dark",
    setTheme: () => {},
});

export function useAuth() {
    return useContext(AuthContext);
}

export function Providers({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setThemeState] = useState<Theme>("dark");
    const isConfigured = isSupabaseConfigured();

    // Init theme from localStorage/system preference
    useEffect(() => {
        const saved = localStorage.getItem("nextlife-theme") as Theme | null;
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolved: Theme = saved === "light" ? "light" : saved === "dark" ? "dark" : prefersDark ? "dark" : "light";
        setThemeState(resolved);
        applyTheme(resolved);
    }, []);

    const applyTheme = (t: Theme) => {
        const root = document.documentElement;
        if (t === "dark") {
            root.classList.add("dark");
            root.classList.remove("light");
        } else {
            root.classList.add("light");
            root.classList.remove("dark");
        }
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("nextlife-theme", newTheme);
        applyTheme(newTheme);
    };

    // Auth state management
    useEffect(() => {
        if (!isConfigured) {
            // Supabase not configured — app works in offline-only mode
            setLoading(false);
            return;
        }

        let cancelled = false;

        getSession().then((s) => {
            if (!cancelled) {
                setSession(s);
                setLoading(false);
            }
        });

        const { unsubscribe } = onAuthStateChange((s) => {
            if (!cancelled) {
                setSession(s);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [isConfigured]);

    return (
        <AuthContext.Provider value={{ session, loading, isConfigured, theme, setTheme }}>
            {children}
        </AuthContext.Provider>
    );
}
