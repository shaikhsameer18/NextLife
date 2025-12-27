"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange, isSupabaseConfigured } from "@/lib/supabase";

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
    setTheme: () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setThemeState] = useState<Theme>("dark");
    const isConfigured = isSupabaseConfigured();

    // Initialize theme from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem("nextlife-theme") as Theme | null;
        const isDark = savedMode === "dark" ||
            (!savedMode && window.matchMedia("(prefers-color-scheme: dark)").matches);

        const mode: Theme = isDark ? "dark" : "light";
        setThemeState(mode);

        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("nextlife-theme", newTheme);

        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    useEffect(() => {
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        getSession().then((session) => {
            setSession(session);
            setLoading(false);
        });

        const { unsubscribe } = onAuthStateChange((session) => {
            setSession(session);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isConfigured]);

    return (
        <AuthContext.Provider value={{ session, loading, isConfigured, theme, setTheme }}>
            {children}
        </AuthContext.Provider>
    );
}
