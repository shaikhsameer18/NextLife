"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [mounted, setMounted] = useState(false);
    const initAuth = useAuthStore((state) => state.init);

    useEffect(() => {
        setMounted(true);
        initAuth();
    }, [initAuth]);

    // Prevent hydration mismatch
    if (!mounted) {
        return null;
    }

    return (
        <>
            {children}
            <Toaster />
        </>
    );
}
