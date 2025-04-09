import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Si el usuario no está autenticado y está intentando acceder a una ruta protegida
  if (
    !session &&
    (req.nextUrl.pathname.startsWith("/admin") ||
      req.nextUrl.pathname.startsWith("/pos") ||
      req.nextUrl.pathname.startsWith("/profile"))
  ) {
    const redirectUrl = new URL("/auth/login", req.url)
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Si el usuario está autenticado, verificar si necesita cambiar su contraseña
  if (session && !req.nextUrl.pathname.startsWith("/auth/change-password")) {
    // Verificar si el usuario necesita cambiar su contraseña
    const { data: profile } = await supabase
      .from("profiles")
      .select("force_password_change")
      .eq("id", session.user.id)
      .single()

    if (profile?.force_password_change) {
      return NextResponse.redirect(new URL("/auth/change-password", req.url))
    }

    // Verificar si la sesión ha expirado
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("expires_at, is_valid")
      .eq("user_id", session.user.id)
      .eq("id", session.user.id) // Usamos el mismo ID para la sesión
      .single()

    if (sessionData) {
      const now = new Date()
      const expiresAt = new Date(sessionData.expires_at)

      // Si la sesión ha expirado o no es válida
      if (now > expiresAt || !sessionData.is_valid) {
        // Invalidar la sesión
        await supabase.from("sessions").update({ is_valid: false }).eq("id", session.user.id)

        // Cerrar sesión
        await supabase.auth.signOut()

        // Redirigir a login con mensaje de sesión expirada
        const redirectUrl = new URL("/auth/login", req.url)
        redirectUrl.searchParams.set("error", "session_expired")
        return NextResponse.redirect(redirectUrl)
      }

      // Actualizar la última actividad
      await supabase.from("sessions").update({ last_activity: new Date().toISOString() }).eq("id", session.user.id)
    }
  }

  return res
}

export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/profile/:path*", "/", "/auth/change-password"],
}

