// middleware.js
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { pathname, origin, searchParams } = req.nextUrl;

  if (searchParams.get("email") || searchParams.get("password")) {
    console.warn("Sensitive query parameters detected in middleware:", searchParams.toString());
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return res;
  }

  let session = null;
  let profile = null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Middleware getSession error:", error.message);
      if (pathname !== "/auth/login") {
        return NextResponse.redirect(new URL("/auth/login", origin));
      }
      return res;
    }
    session = data.session;

    if (session) {
      const cookies = req.cookies.get("profile");
      if (cookies) {
        try {
          profile = JSON.parse(cookies.value);
          console.log("Using cached profile from cookie:", profile);
        } catch (err) {
          console.error("Error parsing profile cookie:", err.message);
        }
      }

      if (!profile) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,role,force_password_change,demo_view_privilege")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Middleware profile error:", profileError.message);
        } else {
          profile = profileData;
        }
      }
    }
  } catch (error) {
    console.error("Middleware error:", error.message);
    if (pathname !== "/auth/login") {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }
    return res;
  }

  if (!session && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  if (session && profile?.force_password_change && pathname !== "/profile") {
    return NextResponse.redirect(new URL("/profile", origin));
  }

  if (session && pathname.startsWith("/auth")) {
    if (profile?.role === "demo") {
      return NextResponse.redirect(new URL("/pos", origin));
    }
    return NextResponse.redirect(new URL("/", origin));
  }

  if (session && pathname.startsWith("/admin")) {
    if (profile?.role !== "super_admin" && !(profile?.role === "demo" && profile?.demo_view_privilege === "super_admin")) {
      return NextResponse.redirect(new URL("/", origin));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|static|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg)).*)",
  ],
};