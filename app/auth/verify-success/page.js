"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function VerifySuccessPage() {
  const router = useRouter()
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const supabase = getSupabaseBrowser()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          // Si hay una sesión, el usuario está verificado
          setVerified(true)
        } else {
          // Intentar verificar con el token de la URL si existe
          const url = new URL(window.location.href)
          const token = url.searchParams.get("token")
          const type = url.searchParams.get("type")

          if (token && type) {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: type === "signup" ? "signup" : "recovery",
            })

            if (error) {
              throw error
            }

            setVerified(true)
          }
        }
      } catch (error) {
        console.error("Error verifying email:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    checkVerification()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-center text-gray-600">Verificando tu correo electrónico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          {verified ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">¡Correo verificado!</h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Tu dirección de correo electrónico ha sido verificada correctamente.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Error de verificación</h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {error || "No se pudo verificar tu correo electrónico. Por favor, intenta nuevamente."}
              </p>
            </>
          )}
        </div>

        <div className="mt-8">
          <Link
            href="/auth/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

