import Link from "next/link";
import { Home, AlertTriangle, Sparkles } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950 flex flex-col items-center justify-center p-4 text-white">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 -left-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/3 -right-20 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center max-w-md">
                {/* Icon */}
                <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                            <AlertTriangle className="w-12 h-12 text-purple-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-6xl font-black bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent mb-2">
                    404
                </h1>
                <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
                <p className="text-purple-200/70 text-sm mb-8">
                    Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all shadow-xl shadow-purple-500/30"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </Link>
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold hover:bg-white/20 transition-all"
                    >
                        Dashboard
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-purple-200/50 text-xs mt-8">
                    SamLife • Your Personal Life Buddy
                </p>
            </div>
        </div>
    );
}
