"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import {
    Sparkles, ArrowRight, CheckCircle2, Moon, Bed, Droplets,
    ListChecks, Timer, BookOpen, Wallet, Shield, Zap, Heart, Download,
    Utensils, Dumbbell
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const FEATURES = [
    { icon: CheckCircle2, label: "Habits", color: "from-emerald-400 to-green-500" },
    { icon: Moon, label: "Namaz", color: "from-violet-400 to-purple-500" },
    { icon: Bed, label: "Sleep", color: "from-blue-400 to-indigo-500" },
    { icon: Droplets, label: "Water", color: "from-cyan-400 to-blue-500" },
    { icon: Utensils, label: "Meals", color: "from-amber-400 to-orange-500" },
    { icon: ListChecks, label: "Tasks", color: "from-rose-400 to-pink-500" },
    { icon: Timer, label: "Focus", color: "from-yellow-400 to-amber-500" },
    { icon: BookOpen, label: "Journal", color: "from-pink-400 to-rose-500" },
    { icon: Wallet, label: "Finance", color: "from-green-400 to-emerald-500" },
    { icon: Dumbbell, label: "Fitness", color: "from-teal-400 to-cyan-500" },
];

export default function HomePage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && session) {
            router.push("/dashboard");
        }
    }, [session, loading, router]);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setIsInstallable(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (session) return null;

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-white flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.15),_transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.1),_transparent_50%)]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-12 py-3 sm:py-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-lg sm:text-xl font-bold">NextLife</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/login"
                        className="px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/register"
                        className="px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                    >
                        Get Started
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-12 py-6 sm:py-8 gap-6 sm:gap-8 lg:gap-16">
                {/* Left Side - Hero Text */}
                <div className={`flex-1 max-w-xl text-center lg:text-left transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs sm:text-sm mb-4 sm:mb-6">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Free forever • Works offline</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-3 sm:mb-4">
                        Your Personal
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
                            Life Buddy
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-400 mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
                        Track habits, prayers, sleep, fitness, and more. Everything syncs across devices with offline support.
                    </p>

                    {/* Single CTA for Desktop - Removed duplicate buttons */}
                    <div className="hidden lg:flex items-center gap-3">
                        <Link
                            href="/register"
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold transition-all"
                        >
                            Start Free <ArrowRight className="w-5 h-5" />
                        </Link>
                        {isInstallable && (
                            <button
                                onClick={handleInstall}
                                className="flex items-center gap-2 px-6 py-4 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 rounded-xl font-semibold transition-all"
                            >
                                <Download className="w-5 h-5" /> Install App
                            </button>
                        )}
                    </div>

                    {/* Mobile CTA Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:hidden">
                        <Link
                            href="/register"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-semibold transition-all text-sm"
                        >
                            Start Free <ArrowRight className="w-4 h-4" />
                        </Link>
                        {isInstallable && (
                            <button
                                onClick={handleInstall}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 rounded-xl font-semibold transition-all text-sm"
                            >
                                <Download className="w-4 h-4" /> Install App
                            </button>
                        )}
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 mt-6 sm:mt-8">
                        {[
                            { icon: Shield, label: "Private", color: "text-emerald-400" },
                            { icon: Zap, label: "Offline-first", color: "text-amber-400" },
                            { icon: Heart, label: "No ads", color: "text-rose-400" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400">
                                <item.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color}`} />
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side - Features Grid */}
                <div className={`flex-1 max-w-lg w-full transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {FEATURES.map((feature) => (
                            <div
                                key={feature.label}
                                className="group flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 hover:bg-slate-800/50 transition-all cursor-pointer"
                            >
                                <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                                    <feature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white" />
                                </div>
                                <span className="text-[8px] sm:text-[10px] lg:text-xs text-slate-400 group-hover:text-white transition-colors text-center">
                                    {feature.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Stats Card */}
                    <div className="mt-4 sm:mt-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-900/50 border border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                                <div className="text-xl sm:text-2xl font-bold text-violet-400">10+</div>
                                <div className="text-[10px] sm:text-xs text-slate-500">Features</div>
                            </div>
                            <div className="w-px h-8 sm:h-10 bg-slate-800" />
                            <div className="text-center flex-1">
                                <div className="text-xl sm:text-2xl font-bold text-emerald-400">100%</div>
                                <div className="text-[10px] sm:text-xs text-slate-500">Free</div>
                            </div>
                            <div className="w-px h-8 sm:h-10 bg-slate-800" />
                            <div className="text-center flex-1">
                                <div className="text-xl sm:text-2xl font-bold text-amber-400">∞</div>
                                <div className="text-[10px] sm:text-xs text-slate-500">Sync</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-4 sm:px-6 lg:px-12 py-3 sm:py-4">
                <div className="flex items-center justify-center text-xs sm:text-sm text-slate-600">
                    © {new Date().getFullYear()} NextLife
                </div>
            </footer>
        </div>
    );
}
