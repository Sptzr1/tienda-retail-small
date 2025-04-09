"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowser, createSession } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectedFrom") || "/"
  const errorParam = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Añadir estos estados al inicio del componente, justo después de los estados existentes
  const [emailToVerify, setEmailToVerify] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationLoading, setVerificationLoading] = useState(false)

  // Mostrar mensaje de error si viene en la URL
  useEffect(() => {
    if (errorParam === "session_expired") {
      setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.")
    }
  }, [errorParam])

  // Modificar la función handleLogin para manejar el error de "email not confirmed"
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setEmailToVerify("")
    setVerificationSent(false)

    try {
      const supabase = getSupabaseBrowser()

      // Verificar si es una contraseña temporal
      const { data: tempPasswordData } = await supabase
        .from("temp_passwords")
        .select("*")
        .eq("temp_password", password)
        .eq("used", false)
        .single()

      let loginResult

      if (tempPasswordData) {
        // Iniciar sesión con contraseña temporal
        loginResult = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginResult.error) throw loginResult.error

        // Marcar la contraseña temporal como usada
        await supabase.from("temp_passwords").update({ used: true }).eq("id", tempPasswordData.id)

        // Crear sesión
        await createSession(supabase, loginResult.data.user.id)

        // Redirigir a cambio de contraseña
        router.push("/auth/change-password")
      } else {
        // Iniciar sesión normal
        loginResult = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginResult.error) {
          // Verificar si el error es "Email not confirmed"
          if (
            loginResult.error.message === "Email not confirmed" ||
            loginResult.error.message.includes("not confirmed")
          ) {
            setEmailToVerify(email)
            throw new Error("El correo electrónico no ha sido verificado.")
          }
          throw loginResult.error
        }

        // Crear sesión
        await createSession(supabase, loginResult.data.user.id)

        // Verificar si necesita cambiar contraseña
        const { data: profile } = await supabase
          .from("profiles")
          .select("force_password_change")
          .eq("id", loginResult.data.user.id)
          .single()

        if (profile?.force_password_change) {
          router.push("/auth/change-password")
        } else {
          router.push(redirectTo)
        }
      }

      router.refresh()
    } catch (error) {
      console.error("Error logging in:", error)
      setError(error.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  // Añadir función para reenviar el correo de verificación
  const handleResendVerification = async () => {
    if (!emailToVerify) return

    setVerificationLoading(true)
    try {
      const supabase = getSupabaseBrowser()

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailToVerify,
      })

      if (error) throw error

      setVerificationSent(true)
    } catch (error) {
      console.error("Error resending verification:", error)
      setError("Error al reenviar el correo de verificación: " + error.message)
    } finally {
      setVerificationLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar sesión</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            O{" "}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              regístrate si aún no tienes cuenta
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {emailToVerify && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Verificación de correo pendiente</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Debes verificar tu correo electrónico antes de iniciar sesión.
                      {verificationSent ? (
                        <span className="block font-medium mt-2 text-green-600">
                          Se ha enviado un nuevo correo de verificación. Revisa tu bandeja de entrada.
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={verificationLoading}
                          className="block mt-2 font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                        >
                          {verificationLoading
                            ? "Enviando..."
                            : "Haz clic aquí para reenviar el correo de verificación"}
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

