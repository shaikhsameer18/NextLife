import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "NextLife - Your Personal Life Buddy",
    description: "Track habits, prayers, sleep, expenses & more. Your all-in-one life companion by Sameer.",
    keywords: ["life tracker", "habit tracker", "prayer tracker", "expense tracker", "productivity", "sameer"],
    authors: [{ name: "Sameer" }],
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "NextLife",
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: "website",
        siteName: "NextLife",
        title: "NextLife - Your Personal Life Buddy",
        description: "Track habits, prayers, sleep, expenses & more. Your all-in-one life companion.",
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
        { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
    ],
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            </head>
            <body className={`${inter.variable} font-sans antialiased`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
