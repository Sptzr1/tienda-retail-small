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
/* "use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser, extendSession, invalidateSession } from "@/lib/supabase/supabase"

export default function SessionManager() {
  const router = useRouter()
  const [sessionExpiry, setSessionExpiry] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Verificar y extender la sesión periódicamente
  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
        return
      }

      try {
        // Obtener información de la sesión
        const { data: sessionData } = await supabase
          .from("sessions")
          .select("expires_at, is_valid")
          .eq("id", session.user.id)
          .single()

        if (!sessionData || !sessionData.is_valid) {
          // Sesión inválida, cerrar sesión
          await supabase.auth.signOut()
          router.push("/auth/login")
          return
        }

        const expiryTime = new Date(sessionData.expires_at).getTime()
        const currentTime = new Date().getTime()
        const timeRemaining = expiryTime - currentTime

        setSessionExpiry(expiryTime)

        // Si quedan menos de 5 minutos, mostrar advertencia
        if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0) {
          setShowWarning(true)
          setCountdown(Math.floor(timeRemaining / 1000))
        } else {
          setShowWarning(false)
        }

        // Si la sesión ha expirado, cerrar sesión
        if (timeRemaining <= 0) {
          await invalidateSession(supabase, session.user.id)
          await supabase.auth.signOut()
          router.push("/auth/login")
        }
      } catch (error) {
        console.error("Error checking session:", error)
      }
    }

    // Verificar la sesión inmediatamente y luego cada minuto
    checkSession()
    const interval = setInterval(checkSession, 60000)

    // Actualizar el contador cada segundo si se muestra la advertencia
    const countdownInterval = setInterval(() => {
      if (showWarning && countdown > 0) {
        setCountdown((prev) => prev - 1)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(countdownInterval)
    }
  }, [router, showWarning, countdown])

  // Extender la sesión
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

      const { expiresAt } = await extendSession(supabase, session.user.id)

      setSessionExpiry(new Date(expiresAt).getTime())
      setShowWarning(false)
    } catch (error) {
      console.error("Error extending session:", error)
    }
  }

  if (!showWarning) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 p-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-2 sm:mb-0">
          <p className="text-yellow-800">
            <strong>Advertencia:</strong> Su sesión expirará en {Math.floor(countdown / 60)}:
            {(countdown % 60).toString().padStart(2, "0")} minutos.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExtendSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Extender Sesión
          </button>
          <button
            onClick={async () => {
              const supabase = getSupabaseBrowser()
              await supabase.auth.signOut()
              router.push("/auth/login")
            }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}*/
