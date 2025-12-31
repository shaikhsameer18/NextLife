"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { signInWithGoogle, cloudSignIn, isSupabaseConfigured } from "@/lib/supabase";
import {
    Sparkles,
    ArrowLeft,
    Mail,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const isConfigured = isSupabaseConfigured();
    const [mounted, setMounted] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [touched, setTouched] = useState({ email: false, password: false });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && session) {
            router.push("/dashboard");
        }
    }, [session, loading, router]);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return "Email is required";
        if (!emailRegex.test(email)) return "Please enter a valid email";
        return "";
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        if (touched.email) setEmailError(validateEmail(value));
        setError("");
    };

    const handleEmailBlur = () => {
        setTouched({ ...touched, email: true });
        setEmailError(validateEmail(email));
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        const emailErr = validateEmail(email);
        setEmailError(emailErr);
        if (emailErr || !password) {
            if (!password) setError("Password is required");
            return;
        }
        setAuthLoading(true);
        setError("");
        try {
            const result = await cloudSignIn(email, password);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => router.push("/dashboard"), 500);
            } else {
                setError(result.error || "Invalid email or password");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError("");
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Sign in error:", error);
            setError("Failed to sign in with Google");
            setGoogleLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-white flex flex-col lg:flex-row">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.1),_transparent_60%)]" />
            </div>

            {/* Left Panel - Branding (Desktop) */}
            <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative z-10 border-r border-slate-800/50 p-8">
                <div className={`max-w-sm text-center transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-3">Welcome back</h1>
                    <p className="text-slate-400">
                        Sign in to continue tracking your habits and achieving your goals.
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-4 sm:py-5">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                    </Link>
                    <div className="lg:hidden flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold">NextLife</span>
                    </div>
                    <div className="w-16 lg:hidden" /> {/* Spacer for centering */}
                </header>

                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-4">
                    <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {/* Mobile/Tablet Title */}
                        <div className="lg:hidden text-center mb-6 sm:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sign In</h1>
                            <p className="text-slate-400 text-sm sm:text-base">Welcome back to NextLife</p>
                        </div>

                        {/* Desktop Title */}
                        <div className="hidden lg:block mb-8">
                            <h2 className="text-2xl font-bold mb-2">Sign In</h2>
                            <p className="text-slate-400 text-sm">Enter your credentials to continue</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-4 sm:mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="mb-4 sm:mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                <p className="text-emerald-300 text-sm">Success! Redirecting...</p>
                            </div>
                        )}

                        {!isConfigured && (
                            <div className="mb-4 sm:mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-300 text-sm">⚠️ Supabase not configured</p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleEmailSignIn} className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        onBlur={handleEmailBlur}
                                        placeholder="you@example.com"
                                        disabled={!isConfigured || authLoading}
                                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900 border ${emailError && touched.email ? 'border-red-500/50' : 'border-slate-800'} rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm sm:text-base`}
                                    />
                                </div>
                                {emailError && touched.email && (
                                    <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        placeholder="••••••••"
                                        disabled={!isConfigured || authLoading}
                                        className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm sm:text-base"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 checked:bg-violet-500 focus:ring-violet-500/20"
                                    />
                                    <span className="text-xs sm:text-sm text-slate-400">Remember me</span>
                                </label>
                                <Link href="#" className="text-xs sm:text-sm text-violet-400 hover:text-violet-300">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={authLoading || !isConfigured}
                                className="w-full py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                                {authLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-4 sm:my-6">
                            <div className="flex-1 h-px bg-slate-800" />
                            <span className="text-xs text-slate-600">or</span>
                            <div className="flex-1 h-px bg-slate-800" />
                        </div>

                        {/* Google */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading || !isConfigured}
                            className="w-full py-2.5 sm:py-3 bg-white hover:bg-slate-100 disabled:bg-white/50 disabled:cursor-not-allowed text-slate-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-3 text-sm sm:text-base"
                        >
                            {googleLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            Continue with Google
                        </button>

                        {/* Register Link */}
                        <p className="mt-4 sm:mt-6 text-center text-sm text-slate-400">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4">
                    <p className="text-center text-xs text-slate-600">
                        By signing in, you agree to our Terms and Privacy Policy
                    </p>
                </footer>
            </div>
        </div>
    );
}
