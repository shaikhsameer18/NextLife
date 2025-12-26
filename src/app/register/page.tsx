"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, Check } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const { register, isAuthenticated, isLoading: authLoading } = useAuthStore();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, authLoading, router]);

    const passwordStrength = () => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;
        return score;
    };

    const strength = passwordStrength();
    const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({ title: "Passwords don't match", variant: "destructive" });
            return;
        }

        if (password.length < 8) {
            toast({ title: "Password must be at least 8 characters", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const success = await register(email.toLowerCase().trim(), password, name.trim());
            if (success) {
                toast({ title: "Welcome to SamLife! 🎉" });
                router.push("/dashboard");
            }
        } catch {
            toast({ title: "Registration failed", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden flex flex-col lg:flex-row">
            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">SamLife</span>
                    </Link>
                </div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white mb-3">Start Your Journey ✨</h1>
                    <p className="text-white/70 mb-6">Track habits, improve your lifestyle.</p>
                    <div className="space-y-2">
                        {["Track habits that stick", "Monitor your prayers", "Cloud sync backup"].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-white/80 text-sm">
                                <Check className="w-4 h-4 text-green-400" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-white/50 text-sm">Made with ❤️ by Sameer</p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-8 bg-background overflow-y-auto">
                <div className="w-full max-w-sm mx-auto">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-6">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">SamLife</span>
                        </Link>
                    </div>

                    <div className="text-center lg:text-left mb-6">
                        <h2 className="text-2xl font-bold mb-1">Create Account</h2>
                        <p className="text-muted-foreground text-sm">Start your journey</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary outline-none text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary border-2 border-transparent focus:border-primary outline-none text-sm"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {password && (
                                <div className="flex gap-1 mt-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : "bg-muted"
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border-2 outline-none text-sm ${confirmPassword && confirmPassword !== password
                                            ? "border-destructive"
                                            : confirmPassword && confirmPassword === password
                                                ? "border-green-500"
                                                : "border-transparent focus:border-primary"
                                        }`}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-muted-foreground text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
