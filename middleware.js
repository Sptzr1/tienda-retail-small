import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  console.log("Middleware - Session:", session);

  if (
    !session &&
    (req.nextUrl.pathname.startsWith("/admin") ||
      req.nextUrl.pathname.startsWith("/pos") ||
      req.nextUrl.pathname.startsWith("/profile"))
  ) {
    console.log("Middleware - No session, redirecting to login");
    const redirectUrl = new URL("/auth/login", req.url);
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && !req.nextUrl.pathname.startsWith("/auth/change-password")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("force_password_change")
      .eq("id", session.user.id)
      .single();

    console.log("Middleware - Profile:", profile);

    if (profile?.force_password_change) {
      console.log("Middleware - Force password change, redirecting");
      return NextResponse.redirect(new URL("/auth/change-password", req.url));
    }

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("expires_at, is_valid")
      .eq("id", session.id)
      .single();

    console.log("Middleware - Session data:", sessionData);

    if (sessionData) {
      const now = new Date();
      const expiresAt = new Date(sessionData.expires_at);
      if (now > expiresAt || !sessionData.is_valid) {
        console.log("Middleware - Session expired, redirecting to login");
        await supabase.from("sessions").update({ is_valid: false }).eq("id", session.id);
        await supabase.auth.signOut();
        const redirectUrl = new URL("/auth/login", req.url);
        redirectUrl.searchParams.set("error", "session_expired");
        return NextResponse.redirect(redirectUrl);
      }
      await supabase.from("sessions").update({ last_activity: new Date().toISOString() }).eq("id", session.id);
    }
  }

  console.log("Middleware - Proceeding to next");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/profile/:path*", "/", "/auth/change-password"],
};
