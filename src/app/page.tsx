"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers";
import {
    Sparkles, ArrowRight, CheckCircle2, Moon, Bed, Droplets,
    ListChecks, Timer, BookOpen, Wallet, Shield, Zap, Heart, Download,
    Utensils, Dumbbell, Star, BarChart3, Lightbulb, ChevronRight
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const FEATURES = [
    { icon: CheckCircle2, label: "Habits", desc: "Build daily streaks", color: "from-emerald-500 to-green-400", glow: "shadow-emerald-500/20" },
    { icon: Moon, label: "Namaz", desc: "5 daily prayers", color: "from-violet-500 to-purple-400", glow: "shadow-violet-500/20" },
    { icon: Bed, label: "Sleep", desc: "Track rest quality", color: "from-indigo-500 to-blue-400", glow: "shadow-indigo-500/20" },
    { icon: Droplets, label: "Water", desc: "Stay hydrated", color: "from-cyan-500 to-blue-400", glow: "shadow-cyan-500/20" },
    { icon: Utensils, label: "Meals", desc: "Log calories", color: "from-amber-500 to-orange-400", glow: "shadow-amber-500/20" },
    { icon: ListChecks, label: "Tasks", desc: "Get things done", color: "from-rose-500 to-pink-400", glow: "shadow-rose-500/20" },
    { icon: Timer, label: "Focus", desc: "Pomodoro timer", color: "from-yellow-500 to-amber-400", glow: "shadow-yellow-500/20" },
    { icon: BookOpen, label: "Journal", desc: "Daily reflection", color: "from-pink-500 to-rose-400", glow: "shadow-pink-500/20" },
    { icon: Wallet, label: "Finance", desc: "Track spending", color: "from-green-500 to-emerald-400", glow: "shadow-green-500/20" },
    { icon: Dumbbell, label: "Fitness", desc: "Gym progress", color: "from-teal-500 to-cyan-400", glow: "shadow-teal-500/20" },
    { icon: Lightbulb, label: "Vault", desc: "Secure notes", color: "from-sky-500 to-blue-400", glow: "shadow-sky-500/20" },
    { icon: BarChart3, label: "Insights", desc: "Analytics", color: "from-purple-500 to-violet-400", glow: "shadow-purple-500/20" },
];

const STATS = [
    { value: "12+", label: "Life Trackers", color: "text-violet-400" },
    { value: "100%", label: "Free Forever", color: "text-cyan-400" },
    { value: "∞", label: "Offline Sync", color: "text-emerald-400" },
    { value: "0", label: "Ads. Ever.", color: "text-rose-400" },
];

const BENEFITS = [
    { icon: Shield, label: "Private by default", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Zap, label: "Works offline", color: "text-amber-400", bg: "bg-amber-500/10" },
    { icon: Heart, label: "No ads, no tracking", color: "text-rose-400", bg: "bg-rose-500/10" },
    { icon: Star, label: "Built with love", color: "text-violet-400", bg: "bg-violet-500/10" },
];

export default function HomePage() {
    const router = useRouter();
    const { session, loading } = useAuth();
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);

    useEffect(() => {
        setMounted(true);
        const interval = setInterval(() => {
            setActiveFeature(prev => (prev + 1) % FEATURES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!loading && session) router.push("/dashboard");
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-glow animate-pulse">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 animate-ping-subtle" />
                </div>
            </div>
        );
    }

    if (session) return null;

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden">

            {/* ── Aurora Background ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Primary violet orb */}
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] animate-aurora" />
                {/* Secondary cyan orb */}
                <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] animate-aurora" style={{ animationDelay: "4s" }} />
                {/* Tertiary emerald orb */}
                <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px] animate-aurora" style={{ animationDelay: "8s" }} />
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
                {/* Radial fade */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.08),rgba(0,0,0,0))]" />
            </div>

            {/* ── Header ── */}
            <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                    <div className="relative w-9 h-9">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-700 rounded-xl flex items-center justify-center shadow-glow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 animate-ping-subtle" />
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight">NextLife</span>
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">BETA</span>
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                    <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                    <a href="#why" className="hover:text-foreground transition-colors">Why NextLife</a>
                </nav>

                <div className="flex items-center gap-2">
                    <Link href="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
                        Sign In
                    </Link>
                    <Link href="/register" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white rounded-lg transition-all shadow-glow-sm">
                        Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </header>

            {/* ── Hero Section ── */}
            <section className="relative z-10 pt-16 sm:pt-24 lg:pt-32 pb-16 px-5 sm:px-8 lg:px-12 text-center">
                <div className={`max-w-4xl mx-auto transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
                        <Zap className="w-4 h-4 text-violet-400 animate-pulse" />
                        <span>Free forever · Works offline · No accounts needed*</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
                        <span className="text-foreground">Your entire life,</span>
                        <br />
                        <span className="relative">
                            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                                tracked beautifully
                            </span>
                            <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 300 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 3 Q75 0 150 3 Q225 6 300 3" stroke="url(#underline-grad)" strokeWidth="2.5" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="underline-grad" x1="0" y1="0" x2="300" y2="0">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                        Habits, prayers, sleep, fitness, finance — every dimension of your life in one private, offline-first app. No subscriptions. No limits.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
                        <Link href="/register" className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-semibold rounded-xl shadow-aurora transition-all hover:shadow-glow hover:-translate-y-0.5 text-sm sm:text-base">
                            Start for free
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        {isInstallable && (
                            <button onClick={handleInstall} className="flex items-center gap-2 px-7 py-3.5 glass border border-white/10 hover:border-white/20 hover:bg-white/5 text-foreground font-semibold rounded-xl transition-all text-sm sm:text-base">
                                <Download className="w-4 h-4" /> Install App
                            </button>
                        )}
                        <Link href="/login" className="flex items-center gap-2 px-7 py-3.5 glass border border-white/10 hover:border-white/20 hover:bg-white/5 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-all text-sm sm:text-base">
                            I have an account
                        </Link>
                    </div>

                    {/* Stats row */}
                    <div className="inline-grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.03]">
                        {STATS.map((stat, i) => (
                            <div key={i} className="flex flex-col items-center px-5 sm:px-8 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                <span className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.value}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features Showcase ── */}
            <section id="features" className="relative z-10 py-16 sm:py-24 px-5 sm:px-8 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                            Everything you need to{" "}
                            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">level up your life</span>
                        </h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">12 powerful modules working together as one beautiful experience</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {FEATURES.map((feature, i) => (
                            <div
                                key={i}
                                onMouseEnter={() => setActiveFeature(i)}
                                className={`group relative flex flex-col gap-3 p-4 sm:p-5 rounded-2xl cursor-default border transition-all duration-300 hover:-translate-y-1 ${activeFeature === i
                                    ? "glass-md border-white/10 shadow-glass"
                                    : "glass border-white/[0.05] hover:border-white/10"
                                    }`}
                            >
                                {/* Active indicator */}
                                {activeFeature === i && (
                                    <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping-subtle" />
                                )}

                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.glow} group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm sm:text-base text-foreground">{feature.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Why NextLife ── */}
            <section id="why" className="relative z-10 py-16 sm:py-24 px-5 sm:px-8 lg:px-12">
                <div className="max-w-5xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-cyan-600/10" />
                        <div className="absolute inset-0 glass-md" />
                        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl" />

                        <div className="relative z-10 p-8 sm:p-12 lg:p-16">
                            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
                                        <Heart className="w-3.5 h-3.5" /> Why people love it
                                    </div>
                                    <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                                        Built for people who want to{" "}
                                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">own their data</span>
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed mb-8">
                                        NextLife stores everything on your device first. Your habits, prayers, thoughts, and finances are yours — always accessible, even without internet.
                                    </p>
                                    <Link href="/register" className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-semibold rounded-xl shadow-aurora transition-all hover:-translate-y-0.5 text-sm">
                                        Start now — it&apos;s free
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {BENEFITS.map((benefit, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-2xl glass border border-white/[0.06] hover:border-white/10 transition-all">
                                            <div className={`w-9 h-9 rounded-xl ${benefit.bg} flex items-center justify-center flex-shrink-0`}>
                                                <benefit.icon className={`w-4.5 h-4.5 ${benefit.color}`} />
                                            </div>
                                            <p className="text-sm font-medium mt-1.5">{benefit.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="relative z-10 py-16 sm:py-24 px-5 sm:px-8 lg:px-12">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Ready to take control?
                    </h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Join and start building a life you&apos;re proud of. No credit card, no ads, no tracking.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href="/register" className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-bold rounded-xl shadow-aurora transition-all hover:shadow-glow hover:-translate-y-0.5">
                            Get started free
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <p className="mt-5 text-xs text-muted-foreground">*Supabase optional — works fully offline without an account</p>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="relative z-10 border-t border-white/[0.04] px-5 sm:px-8 py-6">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-700 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-semibold">NextLife</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} NextLife — Built with ♥ by Sameer
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                        <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
