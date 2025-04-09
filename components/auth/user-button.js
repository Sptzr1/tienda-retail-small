"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, User, Settings } from "lucide-react"
import { getSupabaseBrowser, invalidateSession } from "@/lib/supabase"

export default function UserButton() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = getSupabaseBrowser()

        // Obtener sesión actual
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)

          // Obtener perfil del usuario
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*, stores(*)")
            .eq("id", session.user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        // Invalidar la sesión en la base de datos
        await invalidateSession(supabase, session.user.id)
      }

      // Cerrar sesión en Supabase Auth
      await supabase.auth.signOut()

      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Iniciar sesión
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          {user.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1 border-b">
            <div className="px-4 py-2">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || "Usuario"}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {profile?.stores && (
            <div className="py-1 border-b">
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500">Tienda asignada:</p>
                <p className="text-sm text-gray-900">{profile.stores.name || "Sin asignar"}</p>
              </div>
            </div>
          )}

          <div className="py-1">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
              onClick={() => setIsOpen(false)}
            >
              <User className="mr-2 h-4 w-4" />
              Mi perfil
            </Link>

            {profile?.is_admin && (
              <Link
                href="/admin/usuarios"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Administrar usuarios
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

