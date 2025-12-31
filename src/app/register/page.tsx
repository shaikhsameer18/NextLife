"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { signInWithGoogle, cloudSignUp, isSupabaseConfigured } from "@/lib/supabase";
import {
    Sparkles,
    ArrowLeft,
    Mail,
    Lock,
    Eye,
    EyeOff,
    User,
    AlertCircle,
    Check,
    X,
    Loader2,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";

const PASSWORD_REQUIREMENTS = [
    { id: "length", label: "8+ chars", check: (p: string) => p.length >= 8 },
    { id: "uppercase", label: "Uppercase", check: (p: string) => /[A-Z]/.test(p) },
    { id: "lowercase", label: "Lowercase", check: (p: string) => /[a-z]/.test(p) },
    { id: "number", label: "Number", check: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const isConfigured = isSupabaseConfigured();
    const [mounted, setMounted] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false });

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
        if (!emailRegex.test(email)) return "Invalid email";
        return "";
    };

    const emailError = useMemo(() => touched.email ? validateEmail(email) : "", [email, touched.email]);
    const nameError = useMemo(() => touched.name && !name ? "Name is required" : "", [name, touched.name]);

    const passwordStrength = useMemo(() => {
        const passed = PASSWORD_REQUIREMENTS.filter((req) => req.check(password)).length;
        if (passed === 0) return { level: 0, label: "", color: "bg-slate-700" };
        if (passed <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
        if (passed <= 3) return { level: 2, label: "Medium", color: "bg-amber-500" };
        return { level: 3, label: "Strong", color: "bg-emerald-500" };
    }, [password]);

    const confirmPasswordError = useMemo(() => {
        if (!touched.confirmPassword) return "";
        if (!confirmPassword) return "Required";
        if (confirmPassword !== password) return "Passwords don't match";
        return "";
    }, [confirmPassword, password, touched.confirmPassword]);

    const isFormValid = useMemo(() => {
        return name && !validateEmail(email) && PASSWORD_REQUIREMENTS.every((req) => req.check(password)) && password === confirmPassword && acceptTerms;
    }, [name, email, password, confirmPassword, acceptTerms]);

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, email: true, password: true, confirmPassword: true });
        if (!isFormValid) {
            setError("Please fill in all fields correctly");
            return;
        }
        setAuthLoading(true);
        setError("");
        try {
            const result = await cloudSignUp(email, password, name);
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.error || "Failed to create account");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setGoogleLoading(true);
        setError("");
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Sign up error:", error);
            setError("Failed to sign up with Google");
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

    if (success) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(ellipse,_rgba(16,185,129,0.15),_transparent_60%)]" />
                </div>
                <div className={`max-w-sm w-full text-center relative z-10 transition-all duration-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6">
                        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Check your email</h1>
                    <p className="text-slate-400 text-sm sm:text-base mb-5 sm:mb-6">
                        We sent a confirmation link to <span className="text-white font-medium">{email}</span>
                    </p>
                    <Link
                        href="/login"
                        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors text-sm sm:text-base"
                    >
                        Go to Login <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={() => setSuccess(false)}
                        className="mt-3 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Didn&apos;t receive? Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-white flex flex-col lg:flex-row">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(168,85,247,0.1),_transparent_60%)]" />
            </div>

            {/* Left Panel - Form */}
            <div className="flex-1 flex flex-col relative z-10 order-2 lg:order-1">
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
                    <div className="w-16 lg:hidden" />
                </header>

                {/* Form */}
                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-10 py-4 overflow-y-auto">
                    <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="mb-4 sm:mb-6">
                            <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Create account</h1>
                            <p className="text-slate-400 text-sm">Start your journey to a better life</p>
                        </div>

                        {error && (
                            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-red-300 text-xs sm:text-sm">{error}</p>
                            </div>
                        )}

                        {!isConfigured && (
                            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <p className="text-amber-300 text-xs sm:text-sm">⚠️ Supabase not configured</p>
                            </div>
                        )}

                        {/* Google */}
                        <button
                            onClick={handleGoogleSignUp}
                            disabled={googleLoading || !isConfigured}
                            className="w-full py-2.5 sm:py-3 bg-white hover:bg-slate-100 disabled:bg-white/50 disabled:cursor-not-allowed text-slate-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-3 mb-3 sm:mb-4 text-sm sm:text-base"
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
                            Sign up with Google
                        </button>

                        <div className="flex items-center gap-3 mb-3 sm:mb-4">
                            <div className="flex-1 h-px bg-slate-800" />
                            <span className="text-xs text-slate-600">or</span>
                            <div className="flex-1 h-px bg-slate-800" />
                        </div>

                        <form onSubmit={handleEmailSignUp} className="space-y-2.5 sm:space-y-3">
                            {/* Name */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); setError(""); }}
                                        onBlur={() => setTouched({ ...touched, name: true })}
                                        placeholder="Your name"
                                        disabled={!isConfigured || authLoading}
                                        className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-900 border ${nameError ? 'border-red-500/50' : 'border-slate-800'} rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm`}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        onBlur={() => setTouched({ ...touched, email: true })}
                                        placeholder="you@example.com"
                                        disabled={!isConfigured || authLoading}
                                        className={`w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-900 border ${emailError ? 'border-red-500/50' : 'border-slate-800'} rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm`}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        onBlur={() => setTouched({ ...touched, password: true })}
                                        placeholder="••••••••"
                                        disabled={!isConfigured || authLoading}
                                        className="w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${(passwordStrength.level / 3) * 100}%` }} />
                                            </div>
                                            {passwordStrength.label && (
                                                <span className={`text-[10px] sm:text-xs ${passwordStrength.level === 1 ? 'text-red-400' : passwordStrength.level === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {passwordStrength.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {PASSWORD_REQUIREMENTS.map((req) => (
                                                <span
                                                    key={req.id}
                                                    className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${req.check(password) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
                                                >
                                                    {req.check(password) ? <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                    {req.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                        onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                                        placeholder="••••••••"
                                        disabled={!isConfigured || authLoading}
                                        className={`w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-2.5 bg-slate-900 border ${confirmPasswordError ? 'border-red-500/50' : 'border-slate-800'} rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    </button>
                                </div>
                                {confirmPasswordError && (
                                    <p className="mt-1 text-[10px] sm:text-xs text-red-400">{confirmPasswordError}</p>
                                )}
                            </div>

                            {/* Terms */}
                            <label className="flex items-start gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    className="mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-slate-700 bg-slate-900 checked:bg-violet-500"
                                />
                                <span className="text-xs sm:text-sm text-slate-400">
                                    I agree to the{" "}
                                    <Link href="#" className="text-violet-400 hover:underline">Terms</Link>
                                    {" "}and{" "}
                                    <Link href="#" className="text-violet-400 hover:underline">Privacy</Link>
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={authLoading || !isConfigured || !isFormValid}
                                className="w-full py-2.5 sm:py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
                            >
                                {authLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </form>

                        <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-slate-400">
                            Already have an account?{" "}
                            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-4 sm:px-6 lg:px-10 py-2 sm:py-3">
                    <p className="text-center text-[10px] sm:text-xs text-slate-600">
                        By signing up, you agree to our Terms and Privacy Policy
                    </p>
                </footer>
            </div>

            {/* Right Panel - Branding (Desktop) */}
            <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative z-10 border-l border-slate-800/50 p-8 order-1 lg:order-2">
                <div className={`max-w-sm text-center transition-all duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Join NextLife</h2>
                    <p className="text-slate-400 mb-8">
                        Track habits, prayers, fitness, and more. All in one place, synced across devices.
                    </p>
                    <div className="space-y-2 text-left inline-block">
                        {["✓ 10+ life tracking features", "✓ Works offline", "✓ Cloud sync included", "✓ 100% free forever"].map((item) => (
                            <div key={item} className="text-slate-300 text-sm">{item}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
