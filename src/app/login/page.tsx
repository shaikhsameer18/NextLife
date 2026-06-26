"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import { cloudSignIn, isSupabaseConfigured, sendPasswordReset } from "@/lib/supabase";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Sparkles, ArrowRight, ChevronRight } from "lucide-react";

const MODULES = [
    { emoji: "🕌", label: "Namaz", color: "from-purple-500 to-violet-600" },
    { emoji: "💧", label: "Water", color: "from-cyan-500 to-blue-600" },
    { emoji: "🏋️", label: "Fitness", color: "from-teal-500 to-emerald-600" },
    { emoji: "😴", label: "Sleep", color: "from-indigo-500 to-slate-600" },
    { emoji: "💰", label: "Finance", color: "from-amber-500 to-yellow-600" },
    { emoji: "✅", label: "Habits", color: "from-green-500 to-emerald-600" },
    { emoji: "⏱️", label: "Focus", color: "from-orange-500 to-red-600" },
    { emoji: "📖", label: "Journal", color: "from-pink-500 to-rose-600" },
    { emoji: "🔒", label: "Vault", color: "from-sky-500 to-blue-600" },
    { emoji: "🍽️", label: "Meals", color: "from-amber-400 to-orange-500" },
    { emoji: "📊", label: "Insights", color: "from-violet-500 to-purple-600" },
    { emoji: "✅", label: "Tasks", color: "from-rose-500 to-pink-600" },
];

export default function LoginPage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const isConfigured = isSupabaseConfigured();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        setMounted(true);
        const id = setInterval(() => setActiveIdx(p => (p + 1) % MODULES.length), 1800);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!loading && session) router.push("/dashboard");
    }, [session, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) { setError("Please enter your email and password"); return; }
        setAuthLoading(true);
        setError("");
        try {
            const result = await cloudSignIn(email.trim(), password);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => router.push("/dashboard"), 800);
            } else {
                const raw = (result.error || "").toLowerCase();
                if (raw.includes("not confirmed") || raw.includes("confirm")) {
                    setError("Confirm your email first — check your inbox for a verification link.");
                } else if (raw.includes("invalid") || raw.includes("credentials") || raw.includes("wrong")) {
                    setError("Wrong email or password. Please try again.");
                } else if (raw.includes("too many")) {
                    setError("Too many attempts. Wait a few minutes then try again.");
                } else {
                    setError(result.error || "Sign in failed. Please try again.");
                }
            }
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) { setError("Enter your email address above first"); return; }
        await sendPasswordReset(email.trim(), `${window.location.origin}/auth/callback`);
        setResetSent(true);
        setError("");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050814] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050814] text-white overflow-hidden flex">

            {/* ── Aurora Background ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[65vw] h-[65vh] rounded-full bg-violet-700/25 blur-[140px] animate-aurora" />
                <div className="absolute -bottom-[10%] -right-[5%] w-[55vw] h-[55vh] rounded-full bg-cyan-500/15 blur-[120px] animate-aurora" style={{ animationDelay: "-8s" }} />
                <div className="absolute top-[50%] left-[35%] w-[35vw] h-[35vh] rounded-full bg-purple-600/10 blur-[100px] animate-aurora" style={{ animationDelay: "-15s" }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:72px_72px]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(139,92,246,0.08),transparent)]" />
            </div>

            {/* ── Left Visual Panel ── */}
            <div className="hidden lg:flex w-[48%] xl:w-[50%] relative z-10 flex-col p-12 xl:p-16 border-r border-white/[0.05]">

                {/* Glow orb behind content */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-purple-950/30 to-transparent pointer-events-none" />

                <div className={`relative z-10 flex flex-col h-full transition-all duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>

                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-16">
                        <div className="relative">
                            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.5)]">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-md" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">NextLife</span>
                    </div>

                    {/* Headline */}
                    <div className="mb-12">
                        <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
                            Your life,<br />
                            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                                reimagined.
                            </span>
                        </h1>
                        <p className="text-white/45 text-base leading-relaxed max-w-sm">
                            12 modules to track everything that matters. Offline-first, cloud-synced, always private.
                        </p>
                    </div>

                    {/* Module grid */}
                    <div className="grid grid-cols-4 gap-2 mb-10">
                        {MODULES.map((mod, i) => (
                            <div
                                key={mod.label + i}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-500 ${i === activeIdx
                                    ? `bg-gradient-to-br ${mod.color} shadow-lg scale-105`
                                    : "bg-white/[0.04] hover:bg-white/[0.07]"}`}
                            >
                                <span className="text-lg">{mod.emoji}</span>
                                <span className={`text-[10px] font-semibold ${i === activeIdx ? "text-white" : "text-white/40"}`}>{mod.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Stats bar */}
                    <div className="mt-auto">
                        <div className="flex items-center gap-px mb-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {[
                                { val: "12", label: "Modules" },
                                { val: "∞", label: "Cloud Sync" },
                                { val: "100%", label: "Free" },
                            ].map((s) => (
                                <div key={s.label}>
                                    <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{s.val}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 sm:p-10">

                {/* Mobile logo */}
                <div className="flex items-center gap-2 mb-10 lg:hidden">
                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.4)]">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold">NextLife</span>
                </div>

                <div className={`w-full max-w-md transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>

                    {/* Form card */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-8 sm:p-10 shadow-[0_0_60px_rgba(0,0,0,0.5)]" style={{ backdropFilter: "blur(30px)" }}>

                        <div className="mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-1.5">Welcome back</h2>
                            <p className="text-white/40 text-sm">Sign in to continue to your dashboard</p>
                        </div>

                        {/* Alerts */}
                        {!isConfigured && (
                            <div className="mb-5 p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-amber-300 text-sm font-semibold">Supabase not configured</p>
                                    <p className="text-amber-400/50 text-xs mt-0.5">Add your credentials to .env.local and restart the server</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-5 p-4 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <p className="text-emerald-300 text-sm font-semibold">Signed in! Redirecting to your dashboard...</p>
                            </div>
                        )}

                        {resetSent && !error && (
                            <div className="mb-5 p-4 rounded-2xl bg-violet-500/8 border border-violet-500/20 flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-violet-400" />
                                <p className="text-violet-300 text-sm">Reset link sent — check your inbox.</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    disabled={!isConfigured || authLoading || success}
                                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all disabled:opacity-40"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Password</label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        {resetSent ? "✓ Email sent" : "Forgot password?"}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        disabled={!isConfigured || authLoading || success}
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
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={authLoading || !isConfigured || success}
                                className="relative w-full py-3.5 rounded-2xl font-semibold text-sm text-white overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed group mt-2"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)" }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 shadow-[0_0_30px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-shadow rounded-2xl" />
                                <span className="relative flex items-center justify-center gap-2">
                                    {authLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                                    ) : success ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Redirecting...</>
                                    ) : (
                                        <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Divider line */}
                        <div className="mt-6 flex items-center gap-4">
                            <div className="flex-1 h-px bg-white/[0.06]" />
                        </div>

                        <p className="mt-6 text-center text-sm text-white/30">
                            Don&apos;t have an account?{" "}
                            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors inline-flex items-center gap-1">
                                Create one free <ChevronRight className="w-3 h-3" />
                            </Link>
                        </p>
                    </div>

                    <p className="mt-5 text-center text-[11px] text-white/20">
                        By signing in you agree to our Terms of Service & Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
}
