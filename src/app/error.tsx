"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong!</h2>
            <p className="text-muted-foreground text-sm mb-4 text-center">
                An error occurred while loading this page.
            </p>
            <button
                onClick={() => reset()}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
