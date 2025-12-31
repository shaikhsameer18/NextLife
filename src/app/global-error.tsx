"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
                    <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "2rem" }}>⚠️</span>
                    </div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Something went wrong!</h2>
                    <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem", textAlign: "center" }}>
                        A critical error occurred.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{ padding: "0.625rem 1.5rem", borderRadius: "0.75rem", backgroundColor: "#8b5cf6", color: "white", fontWeight: 600, border: "none", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
