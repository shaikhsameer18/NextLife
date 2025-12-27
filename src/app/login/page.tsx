"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { signInWithGoogle, isSupabaseConfigured } from "@/lib/supabase";
import {
    Sparkles,
    ArrowLeft,
    Dumbbell,
    Trophy,
    Target,
    Flame,
} from "lucide-react";

export default function LoginPage() {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white flex">
            {/* Left Side - Branding & Features */}
            <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/30 rounded-full blur-[100px] animate-pulse" />

                {/* Content */}
                <div className="relative z-10 max-w-md text-center">
                    {/* Logo */}
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl blur-xl opacity-50" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500/80 to-violet-600/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-purple-200 text-lg mb-12">
                        Your personal life dashboard awaits
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: Dumbbell, label: "Track Workouts", color: "from-teal-500 to-emerald-600" },
                            { icon: Target, label: "Set Goals", color: "from-pink-500 to-rose-600" },
                            { icon: Flame, label: "Build Streaks", color: "from-red-500 to-orange-600" },
                            { icon: Trophy, label: "Custom Themes", color: "from-purple-500 to-violet-600" },
                        ].map((feature) => (
                            <div key={feature.label} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                                <div className={`p-2 rounded-xl bg-gradient-to-br ${feature.color}`}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm font-medium">{feature.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl blur-xl opacity-50" />
                            <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500/80 to-violet-600/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Back Link */}
                    <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>

                    {/* Login Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 lg:hidden">Welcome Back</h2>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 hidden lg:block">Sign In</h2>
                        <p className="text-purple-300 mb-8">Continue your productivity journey</p>

                        {!isConfigured ? (
                            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
                                <p className="text-yellow-200 text-sm">
                                    ⚠️ Supabase not configured. Please set up your environment variables.
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
                            <span>{authLoading ? "Signing in..." : "Continue with Google"}</span>
                        </button>

                        {/* Terms */}
                        <p className="text-xs text-center text-purple-300/60 mt-6">
                            By signing in, you agree to our Terms of Service and Privacy Policy
                        </p>

                        {/* Register Link */}
                        <div className="mt-8 pt-6 border-t border-white/10 text-center">
                            <p className="text-purple-300">
                                Don&apos;t have an account?{" "}
                                <Link href="/register" className="text-white font-semibold hover:underline">
                                    Get Started
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
