import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;

    if (!code) {
        return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.redirect(`${origin}/auth/login?error=config`);
    }

    try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const authClient = supabase.auth as unknown as { exchangeCodeForSession?: (code: string) => Promise<{ error?: { message: string } }> };
        if (typeof authClient.exchangeCodeForSession === "function") {
            const result = await authClient.exchangeCodeForSession(code);
            if (result?.error) {
                console.error("Auth exchange failed:", result.error.message);
                return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
            }
        }
    } catch (err) {
        console.error("Auth callback error:", err);
        return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
}
