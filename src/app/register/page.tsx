"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { cloudSignUp, isSupabaseConfigured } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Sparkles, ArrowRight, ChevronRight, Check } from "lucide-react";

const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
};

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
const STRENGTH_COLORS = [
    "",
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-emerald-500",
];

const PREVIEW_STATS = [
    { label: "Habits tracked", value: "32", emoji: "✅" },
    { label: "Focus sessions", value: "18", emoji: "⏱️" },
    { label: "Water this week", value: "14L", emoji: "💧" },
    { label: "Prayers logged", value: "23", emoji: "🕌" },
];

export default function RegisterPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const isConfigured = isSupabaseConfigured();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (!loading && session) router.push("/dashboard");
    }, [session, loading, router]);

    const strength = getPasswordStrength(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;
    const passwordMismatch = confirmPassword && password !== confirmPassword;

    const requirements = [
        { met: password.length >= 8, text: "At least 8 characters" },
        { met: /[A-Z]/.test(password), text: "One uppercase letter" },
        { met: /[0-9]/.test(password), text: "One number" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setAuthLoading(true);
        setError("");

        try {
            const result = await cloudSignUp(email.trim(), password, name.trim());
            if (result.success) {
                setRegisteredEmail(email.trim());
                setSuccess(true);
            } else {
                const raw = (result.error || "").toLowerCase();
                if (raw.includes("already registered") || raw.includes("already exists") || raw.includes("already in use")) {
                    setError("An account with this email already exists. Try signing in instead.");
                } else if (raw.includes("weak password") || raw.includes("password")) {
                    setError("Choose a stronger password — at least 8 characters with letters and numbers.");
                } else if (raw.includes("invalid email")) {
                    setError("Please enter a valid email address.");
                } else {
                    setError(result.error || "Registration failed. Please try again.");
                }
            }
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setAuthLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050814] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-[#050814] text-white overflow-hidden flex items-center justify-center relative">
                {/* Aurora */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-[60vw] h-[60vh] rounded-full bg-emerald-700/20 blur-[140px]" />
                    <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] rounded-full bg-violet-500/15 blur-[120px]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
                </div>

                <div className={`relative z-10 w-full max-w-md mx-4 text-center transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
                    {/* Animated check */}
                    <div className="relative mx-auto mb-8 w-28 h-28">
                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-14 h-14 text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold mb-3">Account Created!</h1>
                    <p className="text-white/50 mb-2 text-sm leading-relaxed">
                        We sent a verification link to
                    </p>
                    <p className="text-emerald-400 font-semibold text-base mb-8 break-all">{registeredEmail}</p>

                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 mb-6" style={{ backdropFilter: "blur(20px)" }}>
                        <div className="space-y-3 text-sm text-left">
                            {[
                                "Check your inbox for the verification email",
                                "Click the confirmation link in the email",
                                "Return here to sign in to your account",
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-emerald-400 text-[10px] font-bold">{i + 1}</span>
                                    </div>
                                    <span className="text-white/60">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 font-semibold text-sm hover:from-violet-500 hover:to-purple-600 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    >
                        Go to Sign In <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050814] text-white overflow-hidden flex">

            {/* ── Aurora Background ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute -top-[15%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-violet-700/20 blur-[140px] animate-aurora" style={{ animationDelay: "-4s" }} />
                <div className="absolute -bottom-[10%] -left-[5%] w-[55vw] h-[55vh] rounded-full bg-cyan-500/12 blur-[120px] animate-aurora" style={{ animationDelay: "-11s" }} />
                <div className="absolute top-[30%] right-[25%] w-[30vw] h-[30vh] rounded-full bg-purple-600/10 blur-[100px] animate-aurora" style={{ animationDelay: "-18s" }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
            </div>

            {/* ── Left Form Panel ── */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 sm:p-10 order-2 lg:order-1">

                {/* Mobile logo */}
                <div className="flex items-center gap-2 mb-8 lg:hidden">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.4)]">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold">NextLife</span>
                </div>

                <div className={`w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>

                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)]" style={{ backdropFilter: "blur(30px)" }}>

                        <div className="mb-7">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-1.5">Create account</h2>
                            <p className="text-white/40 text-sm">Start tracking your life in minutes</p>
                        </div>

                        {/* Alert */}
                        {!isConfigured && (
                            <div className="mb-5 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-amber-300 text-sm font-semibold">Supabase not configured</p>
                                    <p className="text-amber-400/50 text-xs mt-0.5">Add your credentials to .env.local</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-5 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setError(""); }}
                                    placeholder="Sameer"
                                    autoComplete="name"
                                    disabled={!isConfigured || authLoading}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all disabled:opacity-40"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={!isConfigured || authLoading}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all disabled:opacity-40"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        placeholder="Create a strong password"
                                        autoComplete="new-password"
                                        disabled={!isConfigured || authLoading}
                                        className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all disabled:opacity-40"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Strength meter */}
                                {password && (
                                    <div className="pt-1.5 space-y-2">
                                        <div className="flex gap-1.5">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLORS[strength] : "bg-white/10"}`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-[11px] font-medium ${strength >= 4 ? "text-emerald-400" : strength >= 3 ? "text-green-400" : strength >= 2 ? "text-yellow-400" : "text-red-400"}`}>
                                            {STRENGTH_LABELS[strength]}
                                        </p>
                                        <div className="space-y-1">
                                            {requirements.map((req) => (
                                                <div key={req.text} className="flex items-center gap-2">
                                                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${req.met ? "bg-emerald-500/20 border border-emerald-500/40" : "border border-white/10"}`}>
                                                        {req.met && <Check className="w-2 h-2 text-emerald-400" />}
                                                    </div>
                                                    <span className={`text-[11px] transition-colors ${req.met ? "text-white/50" : "text-white/25"}`}>{req.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm password */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                        placeholder="Repeat your password"
                                        autoComplete="new-password"
                                        disabled={!isConfigured || authLoading}
                                        className={`w-full pl-4 pr-11 py-3.5 rounded-2xl bg-white/[0.05] text-white text-sm placeholder:text-white/20 focus:outline-none focus:bg-white/[0.07] transition-all disabled:opacity-40 border ${passwordMismatch ? "border-red-500/50 focus:border-red-500/50" : passwordsMatch ? "border-emerald-500/50 focus:border-emerald-500/50" : "border-white/[0.08] focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]"}`}
                                    />
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {confirmPassword && (
                                            passwordsMatch
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                : passwordMismatch
                                                    ? <AlertCircle className="w-4 h-4 text-red-400" />
                                                    : null
                                        )}
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="text-white/25 hover:text-white/50 transition-colors p-1"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                {passwordMismatch && (
                                    <p className="text-[11px] text-red-400">Passwords don&apos;t match</p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={authLoading || !isConfigured || !!passwordMismatch}
                                className="relative w-full py-3.5 rounded-2xl font-semibold text-sm text-white overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed group mt-2"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)" }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 shadow-[0_0_30px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-shadow rounded-2xl" />
                                <span className="relative flex items-center justify-center gap-2">
                                    {authLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                                    ) : (
                                        <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                    )}
                                </span>
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-white/30">
                            Already have an account?{" "}
                            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors inline-flex items-center gap-1">
                                Sign in <ChevronRight className="w-3 h-3" />
                            </Link>
                        </p>
                    </div>

                    <p className="mt-5 text-center text-[11px] text-white/20">
                        Your data is stored locally and synced privately via Supabase
                    </p>
                </div>
            </div>

            {/* ── Right Visual Panel ── */}
            <div className="hidden lg:flex w-[46%] xl:w-[48%] relative z-10 flex-col p-12 xl:p-16 border-l border-white/[0.05] order-1 lg:order-2">

                <div className="absolute inset-0 bg-gradient-to-bl from-violet-950/50 via-purple-950/20 to-transparent pointer-events-none" />

                <div className={`relative z-10 flex flex-col h-full transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>

                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-auto">
                        <div className="relative">
                            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.5)]">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-md" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">NextLife</span>
                    </div>

                    {/* Copy */}
                    <div className="my-10">
                        <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
                            Track everything<br />
                            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                                that matters.
                            </span>
                        </h1>
                        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                            From daily prayers to gym sessions, from finances to sleep — all your habits in one beautiful app.
                        </p>
                    </div>

                    {/* Dashboard preview card */}
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-5 mb-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs text-white/40 font-medium">Your Dashboard Preview</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            {PREVIEW_STATS.map((stat) => (
                                <div key={stat.label} className="bg-white/[0.04] rounded-2xl p-3.5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-base">{stat.emoji}</span>
                                        <span className="text-lg font-bold text-white">{stat.value}</span>
                                    </div>
                                    <p className="text-[10px] text-white/30">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-3 mt-auto">
                        {[
                            { emoji: "🔒", text: "Data stored locally — you own it" },
                            { emoji: "📶", text: "Works offline, syncs when online" },
                            { emoji: "🆓", text: "100% free, no subscriptions" },
                        ].map((f) => (
                            <div key={f.text} className="flex items-center gap-3 text-sm text-white/50">
                                <span>{f.emoji}</span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
