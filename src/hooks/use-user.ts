"use client";

import { useAuth } from "@/components/providers";

interface UserData {
    id: string;
    email: string;
    name: string;
    image?: string;
}

interface UseUserReturn {
    user: UserData | null;
    loading: boolean;
    isConfigured: boolean;
}

export function useUser(): UseUserReturn {
    const { session, loading, isConfigured } = useAuth();

    if (!session?.user) {
        return { user: null, loading, isConfigured };
    }

    const user: UserData = {
        id: session.user.id,
        email: session.user.email || "",
        name: session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] || "User",
        image: session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture,
    };

    return { user, loading, isConfigured };
}
