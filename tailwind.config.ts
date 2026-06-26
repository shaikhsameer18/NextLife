import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                // Aurora palette
                aurora: {
                    violet: "#7c3aed",
                    purple: "#a855f7",
                    indigo: "#6366f1",
                    cyan: "#06b6d4",
                    emerald: "#10b981",
                    rose: "#f43f5e",
                    amber: "#f59e0b",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                "2xl": "1.25rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
            fontFamily: {
                sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "gradient-aurora": "linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #10b981 100%)",
                "gradient-violet-indigo": "linear-gradient(135deg, #7c3aed, #6366f1)",
                "gradient-violet-cyan": "linear-gradient(135deg, #7c3aed, #06b6d4)",
                "gradient-glass": "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            },
            boxShadow: {
                "glow-sm": "0 0 10px rgba(124, 58, 237, 0.2)",
                "glow": "0 0 20px rgba(124, 58, 237, 0.3), 0 0 60px rgba(124, 58, 237, 0.1)",
                "glow-lg": "0 0 40px rgba(124, 58, 237, 0.4), 0 0 100px rgba(124, 58, 237, 0.15)",
                "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.3), 0 0 60px rgba(6, 182, 212, 0.1)",
                "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.1)",
                "glow-rose": "0 0 20px rgba(244, 63, 94, 0.3), 0 0 60px rgba(244, 63, 94, 0.1)",
                "glass": "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                "card-hover": "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
                "aurora": "0 20px 60px rgba(124, 58, 237, 0.15), 0 8px 24px rgba(0,0,0,0.4)",
            },
            keyframes: {
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(16px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-down": {
                    "0%": { opacity: "0", transform: "translateY(-16px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-left": {
                    "0%": { opacity: "0", transform: "translateX(-16px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                "slide-in-left": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                "slide-up": {
                    "0%": { transform: "translateY(100%)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-12px)" },
                },
                "float-slow": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                "glow-pulse": {
                    "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
                    "50%": { opacity: "0.7", transform: "scale(1.05)" },
                },
                "aurora-shift": {
                    "0%": { transform: "translate(0%, 0%) rotate(0deg)" },
                    "25%": { transform: "translate(3%, -3%) rotate(90deg)" },
                    "50%": { transform: "translate(0%, -6%) rotate(180deg)" },
                    "75%": { transform: "translate(-3%, -3%) rotate(270deg)" },
                    "100%": { transform: "translate(0%, 0%) rotate(360deg)" },
                },
                "shimmer": {
                    "from": { backgroundPosition: "-200% center" },
                    "to": { backgroundPosition: "200% center" },
                },
                "spin-slow": {
                    "from": { transform: "rotate(0deg)" },
                    "to": { transform: "rotate(360deg)" },
                },
                "ping-subtle": {
                    "0%": { transform: "scale(1)", opacity: "0.8" },
                    "75%, 100%": { transform: "scale(1.6)", opacity: "0" },
                },
                "pulse": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                "bounce-soft": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-6px)" },
                },
                "scale-in": {
                    "0%": { opacity: "0", transform: "scale(0.9)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.4s ease-out forwards",
                "fade-in-up": "fade-in-up 0.5s ease-out forwards",
                "fade-in-down": "fade-in-down 0.5s ease-out forwards",
                "fade-in-left": "fade-in-left 0.5s ease-out forwards",
                "slide-in-left": "slide-in-left 0.3s ease-out",
                "slide-up": "slide-up 0.4s ease-out forwards",
                "float": "float 6s ease-in-out infinite",
                "float-slow": "float-slow 8s ease-in-out infinite",
                "glow-pulse": "glow-pulse 3s ease-in-out infinite",
                "aurora": "aurora-shift 20s ease-in-out infinite",
                "shimmer": "shimmer 3s linear infinite",
                "spin-slow": "spin-slow 12s linear infinite",
                "ping-subtle": "ping-subtle 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "bounce-soft": "bounce-soft 2s ease-in-out infinite",
                "scale-in": "scale-in 0.3s ease-out forwards",
            },
        },
    },
    plugins: [],
};

export default config;
