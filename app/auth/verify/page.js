"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const type = searchParams.get("type")
  const errorCode = searchParams.get("error_code")

  const [status, setStatus] = useState("loading") // loading, success, error
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const verifyToken = async () => {
      // Si hay un error en la URL, mostrarlo
      if (errorCode) {
        setStatus("error")

        if (errorCode === "otp_expired") {
          setMessage("El enlace de verificación ha expirado. Por favor, solicita un nuevo enlace.")
        } else {
          setMessage("Se ha producido un error al verificar tu correo electrónico.")
        }
        return
      }

      // Si no hay token, no hacer nada
      if (!token || !type) {
        setStatus("error")
        setMessage("Enlace de verificación inválido.")
        return
      }

      try {
        const supabase = getSupabaseBrowser()

        // Verificar el token
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type === "signup" ? "signup" : "recovery",
        })

        if (error) throw error

        setStatus("success")
        setMessage(
          type === "signup"
            ? "Tu correo electrónico ha sido verificado correctamente. Ya puedes iniciar sesión."
            : "Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.",
        )
      } catch (error) {
        console.error("Error verifying token:", error)
        setStatus("error")
        setMessage(
          error.message === "Verification token expired"
            ? "El enlace de verificación ha expirado. Por favor, solicita un nuevo enlace."
            : "Se ha producido un error al verificar tu correo electrónico.",
        )
      }
    }

    verifyToken()
  }, [token, type, errorCode])

  const handleResendVerification = async (e) => {
    e.preventDefault()

    if (!email) {
      setMessage("Por favor, introduce tu dirección de correo electrónico.")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseBrowser()

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) throw error

      setMessage("Se ha enviado un nuevo correo de verificación. Por favor, revisa tu bandeja de entrada.")
    } catch (error) {
      console.error("Error resending verification:", error)
      setMessage("Error al reenviar el correo de verificación: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verificación de correo</h2>
        </div>

        <div
          className={`rounded-md p-4 ${
            status === "loading" ? "bg-gray-50" : status === "success" ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {status === "loading" && (
                <svg
                  className="h-5 w-5 text-gray-400 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {status === "success" && (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status === "error" && (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  status === "loading" ? "text-gray-800" : status === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {status === "loading" ? "Verificando..." : message}
              </p>
            </div>
          </div>
        </div>

        {status === "error" && errorCode === "otp_expired" && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Solicitar un nuevo enlace de verificación</h3>
            <form className="mt-4 space-y-4" onSubmit={handleResendVerification}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Reenviar correo de verificación"}
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center justify-center mt-6">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

