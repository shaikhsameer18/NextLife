"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Sparkles, ArrowRight, CheckCircle2, Moon, Bed, Droplets,
    ListChecks, Timer, BookOpen, Wallet, Shield, Zap, Heart, Download
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const FEATURES = [
    { icon: CheckCircle2, label: "Habits", color: "from-green-500 to-emerald-600" },
    { icon: Moon, label: "Namaz", color: "from-purple-500 to-violet-600" },
    { icon: Bed, label: "Sleep", color: "from-indigo-500 to-blue-600" },
    { icon: Droplets, label: "Water", color: "from-blue-500 to-cyan-600" },
    { icon: ListChecks, label: "Tasks", color: "from-red-500 to-pink-600" },
    { icon: Timer, label: "Focus", color: "from-yellow-500 to-orange-600" },
    { icon: BookOpen, label: "Journal", color: "from-pink-500 to-rose-600" },
    { icon: Wallet, label: "Money", color: "from-emerald-500 to-green-600" },
];

export default function HomePage() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

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

    return (
        <div className="h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900 text-white overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-64 md:w-96 h-64 md:h-96 bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-64 md:w-96 h-64 md:h-96 bg-violet-500/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-6">
                {/* Logo */}
                <div className="mb-4 md:mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl blur-xl opacity-50" />
                        <div className="relative w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-purple-500/80 to-violet-600/80 backdrop-blur-xl rounded-2xl md:rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                            <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-white" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-6xl font-black mb-2 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    NextLife
                </h1>

                {/* Tagline */}
                <p className="text-base md:text-xl text-purple-200 font-medium mb-1">
                    Your Personal Life Buddy ✨
                </p>
                <p className="text-xs md:text-sm text-slate-400 text-center max-w-xs mb-5">
                    Track habits, prayers, sleep & more. <span className="text-purple-400 font-semibold">Offline + Cloud sync</span>
                </p>

                {/* CTA Buttons */}
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/register" className="flex items-center gap-1.5 px-5 py-2.5 md:px-7 md:py-3.5 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl md:rounded-2xl font-bold text-sm md:text-base shadow-xl shadow-purple-500/30 hover:scale-105 transition-all">
                        Get Started <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/login" className="px-5 py-2.5 md:px-7 md:py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl md:rounded-2xl font-bold text-sm md:text-base hover:bg-white/20 transition-all">
                        Sign In
                    </Link>
                </div>

                {/* Install Button */}
                {isInstallable && (
                    <button onClick={handleInstall} className="flex items-center gap-1.5 px-4 py-2 mb-4 bg-white/5 backdrop-blur-sm border border-purple-400/30 text-purple-300 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all">
                        <Download className="w-4 h-4" /> Install App
                    </button>
                )}

                {/* Features Grid */}
                <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-sm md:max-w-2xl mb-5">
                    {FEATURES.map((feature) => (
                        <div key={feature.label} className="flex flex-col items-center gap-1">
                            <div className={`p-2.5 md:p-3.5 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg hover:scale-110 transition-all cursor-pointer`}>
                                <feature.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <span className="text-[9px] md:text-xs text-slate-300 font-medium">{feature.label}</span>
                        </div>
                    ))}
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-2 md:gap-4 text-slate-400">
                    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10">
                        <Shield className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] md:text-xs">Private</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-[10px] md:text-xs">Offline</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10">
                        <Heart className="w-3 h-3 text-red-400" />
                        <span className="text-[10px] md:text-xs">Free</span>
                    </div>
                </div>
            </div>

            {/* Inline Styles for Animation */}
            <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
