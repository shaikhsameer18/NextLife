"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { signInWithGoogle, isSupabaseConfigured } from "@/lib/supabase";
import {
    Sparkles,
    ArrowLeft,
    CheckCircle2,
    Moon,
    Dumbbell,
    Wallet,
    BookOpen,
    Droplets,
    Trophy,
    ListTodo,
    Timer,
    Bed,
} from "lucide-react";

const FEATURES = [
    { icon: CheckCircle2, label: "Habit Tracking", description: "Build lasting habits" },
    { icon: Moon, label: "Prayer Times", description: "Never miss namaz" },
    { icon: Dumbbell, label: "Gym Tracker", description: "Log workouts & progress" },
    { icon: Wallet, label: "Finance Manager", description: "Track expenses" },
    { icon: BookOpen, label: "Daily Journal", description: "Reflect & grow" },
    { icon: Droplets, label: "Water Reminder", description: "Stay hydrated" },
    { icon: Trophy, label: "Custom Themes", description: "Personalize your app" },
    { icon: ListTodo, label: "Task Manager", description: "Get things done" },
    { icon: Timer, label: "Focus Timer", description: "Pomodoro technique" },
    { icon: Bed, label: "Sleep Log", description: "Track rest quality" },
];

export default function RegisterPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);
    const isConfigured = isSupabaseConfigured();

    useEffect(() => {
        if (!loading && session) {
            router.push("/dashboard");
        }
    }, [session, loading, router]);

    const handleGoogleSignIn = async () => {
        setAuthLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Sign in error:", error);
            setAuthLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-64 md:w-96 h-64 md:h-96 bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-64 md:w-96 h-64 md:h-96 bg-violet-500/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="p-6">
                    <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 px-6 pb-12">
                    {/* Left - Form */}
                    <div className="w-full max-w-md">
                        {/* Logo */}
                        <div className="mb-8 flex justify-center lg:justify-start">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl blur-xl opacity-50" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500/80 to-violet-600/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black mb-2 text-center lg:text-left">
                            Start Your Journey
                        </h1>
                        <p className="text-purple-200 text-lg mb-8 text-center lg:text-left">
                            Your personal life dashboard is waiting
                        </p>

                        {/* Card */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                            {!isConfigured ? (
                                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
                                    <p className="text-yellow-200 text-sm">
                                        ⚠️ Supabase not configured. Please set up environment variables.
                                    </p>
                                </div>
                            ) : null}

                            {/* Google Sign In Button */}
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={authLoading || !isConfigured}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-bold hover:bg-gray-100 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {authLoading ? (
                                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                <span>{authLoading ? "Creating account..." : "Sign up with Google"}</span>
                            </button>

                            <div className="mt-6 flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-purple-300/60 text-sm">Free forever</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* Benefits */}
                            <ul className="mt-6 space-y-3">
                                {["✓ No credit card required", "✓ All features included", "✓ Data syncs across devices", "✓ Offline support"].map((benefit) => (
                                    <li key={benefit} className="text-purple-200 text-sm">{benefit}</li>
                                ))}
                            </ul>

                            {/* Login Link */}
                            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                <p className="text-purple-300">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-white font-semibold hover:underline">
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right - Features Grid */}
                    <div className="hidden lg:block w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-6 text-center">Everything you need to level up</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {FEATURES.map((feature) => (
                                <div
                                    key={feature.label}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 group-hover:from-purple-500/30 group-hover:to-violet-500/30 transition-all">
                                        <feature.icon className="w-5 h-5 text-purple-300" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{feature.label}</p>
                                        <p className="text-xs text-purple-300/60">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
