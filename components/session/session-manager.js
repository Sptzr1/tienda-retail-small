"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser, extendSession, invalidateSession } from "@/lib/supabase"

export default function SessionManager() {
  const router = useRouter()
  const [sessionExpiring, setSessionExpiring] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [expiresAt, setExpiresAt] = useState(null)

  // Función para obtener el tiempo de expiración de la sesión
  const fetchSessionExpiration = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return null

      const { data } = await supabase.from("sessions").select("expires_at").eq("id", session.user.id).single()

      if (data?.expires_at) {
        setExpiresAt(new Date(data.expires_at))
        return new Date(data.expires_at)
      }

      return null
    } catch (error) {
      console.error("Error fetching session expiration:", error)
      return null
    }
  }, [])

  // Función para extender la sesión
  const handleExtendSession = async () => {
    try {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
        return
      }

      const { expiresAt: newExpiresAt } = await extendSession(supabase, session.user.id)

      setExpiresAt(newExpiresAt)
      setSessionExpiring(false)
      setCountdown(10)
    } catch (error) {
      console.error("Error extending session:", error)
      // Si hay un error, cerrar sesión
      handleLogout()
    }
  }

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        await invalidateSession(supabase, session.user.id)
        await supabase.auth.signOut()
      }

      router.push("/auth/login?error=session_expired")
    } catch (error) {
      console.error("Error logging out:", error)
      router.push("/auth/login")
    }
  }

  // Verificar la expiración de la sesión cada minuto
  useEffect(() => {
    const checkSessionExpiration = async () => {
      const expiration = await fetchSessionExpiration()

      if (!expiration) return

      const now = new Date()
      const timeUntilExpiration = expiration.getTime() - now.getTime()

      // Si faltan menos de 2 minutos para que expire la sesión
      if (timeUntilExpiration > 0 && timeUntilExpiration <= 2 * 60 * 1000) {
        setSessionExpiring(true)
      } else {
        setSessionExpiring(false)
      }
    }

    // Verificar al cargar el componente
    checkSessionExpiration()

    // Verificar cada minuto
    const interval = setInterval(checkSessionExpiration, 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchSessionExpiration])

  // Cuenta regresiva cuando la sesión está por expirar
  useEffect(() => {
    let timer

    if (sessionExpiring) {
      setCountdown(10)

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [sessionExpiring])

  if (!sessionExpiring) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-yellow-100 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <p className="font-medium text-yellow-800">
            Tu sesión expirará pronto. ¿Deseas extenderla por 30 minutos más?
          </p>
          <p className="text-sm text-yellow-700">La sesión se cerrará automáticamente en {countdown} segundos.</p>
        </div>
        <button
          onClick={handleExtendSession}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Extender sesión
        </button>
      </div>
    </div>
  )
}
