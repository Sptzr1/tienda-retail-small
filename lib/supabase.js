  import { createClient } from "@supabase/supabase-js"
  import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
  
  // Create a single supabase client for the browser
  const createBrowserClient = () => {
    return createClientComponentClient()
  }
  
  // Create a single supabase client for server components
  const createServerClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_ANON_KEY
  
    return createClient(supabaseUrl, supabaseServiceKey)
  }
  
  // Client singleton to avoid multiple instances
  let browserClient = null
  export const getSupabaseBrowser = () => {
    if (typeof window === "undefined") {
      throw new Error("getSupabaseBrowser should only be called in the browser")
    }
  
    if (!browserClient) {
      browserClient = createBrowserClient()
    }
    return browserClient
  }
  
  // For server components
  export const getSupabaseServer = () => {
    return createServerClient()
  }
  
  // Función para crear o actualizar una sesión
  export const createSession = async (supabase, userId) => {
    // Calcular tiempo de expiración (45 minutos)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 45)
  
    // Obtener información del navegador
    const userAgent = navigator.userAgent
  
    // Intentar obtener IP (esto es aproximado, en producción se haría de otra manera)
    let ipAddress = "unknown"
    try {
      const res = await fetch("https://api.ipify.org?format=json")
      const data = await res.json()
      ipAddress = data.ip
    } catch (error) {
      console.error("Error getting IP:", error)
    }
  
    // Crear o actualizar la sesión
    const { error } = await supabase.from("sessions").upsert(
      {
        id: userId,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        last_activity: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        extension_count: 0,
        is_valid: true,
      },
      {
        onConflict: "id",
      },
    )
  
    if (error) {
      console.error("Error creating session:", error)
      throw error
    }
  
    // Actualizar último login en el perfil
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", userId)
  
    return expiresAt
  }
  
  // Función para extender una sesión
  export const extendSession = async (supabase, userId) => {
    // Calcular nuevo tiempo de expiración (30 minutos adicionales)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)
  
    // Actualizar la sesión
    const { data, error } = await supabase
      .from("sessions")
      .update({
        expires_at: expiresAt.toISOString(),
        last_activity: new Date().toISOString(),
        extension_count: supabase.rpc("increment_extension_count", { session_id: userId }),
        is_valid: true,
      })
      .eq("id", userId)
      .select("extension_count")
      .single()
  
    if (error) {
      console.error("Error extending session:", error)
      throw error
    }
  
    return {
      expiresAt,
      extensionCount: data?.extension_count || 0,
    }
  }
  
  // Función para invalidar una sesión
  export const invalidateSession = async (supabase, userId) => {
    const { error } = await supabase.from("sessions").update({ is_valid: false }).eq("id", userId)
  
    if (error) {
      console.error("Error invalidating session:", error)
      throw error
    }
  }
  
  


