"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function CreateUserPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    isAdmin: false,
    storeId: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tempPassword, setTempPassword] = useState(null)
  const [stores, setStores] = useState([])

  // Cargar tiendas al iniciar
  useState(() => {
    const fetchStores = async () => {
      try {
        const supabase = getSupabaseBrowser()
        const { data } = await supabase.from("stores").select("*").order("name")

        setStores(data || [])
      } catch (error) {
        console.error("Error fetching stores:", error)
      }
    }

    fetchStores()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowser()

      // Generar una contraseña temporal aleatoria
      const tempPass = `User${Math.floor(Math.random() * 10000)}!`

      // Registrar usuario
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: tempPass,
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
        },
      })

      if (authError) throw authError

      // Crear perfil de usuario
      if (authData?.user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            full_name: formData.fullName,
            is_admin: formData.isAdmin,
            store_id: formData.storeId ? Number.parseInt(formData.storeId) : null,
            force_password_change: true,
          },
        ])

        if (profileError) throw profileError

        // Crear contraseña temporal
        const { error: tempPassError } = await supabase.from("temp_passwords").insert([
          {
            user_id: authData.user.id,
            temp_password: tempPass,
            force_change: true,
          },
        ])

        if (tempPassError) throw tempPassError

        // Mostrar la contraseña temporal
        setTempPassword(tempPass)
      }
    } catch (error) {
      console.error("Error creating user:", error)
      setError(error.message || "Error al crear el usuario")
    } finally {
      setLoading(false)
    }
  }

  // Si se muestra la contraseña temporal
  if (tempPassword) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Usuario creado exitosamente</h2>

            <div className="mt-6 bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                Esta contraseña temporal solo se mostrará una vez. Asegúrate de copiarla y compartirla de forma segura
                con el usuario.
              </p>
            </div>

            <div className="mt-4 bg-gray-100 p-3 rounded-md font-mono text-center">{tempPassword}</div>

            <div className="mt-8 flex justify-center space-x-4">
              <Link
                href="/admin/usuarios"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver a usuarios
              </Link>
              <button
                onClick={() => {
                  setTempPassword(null)
                  setFormData({
                    email: "",
                    fullName: "",
                    isAdmin: false,
                    storeId: "",
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Crear otro usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Crear nuevo usuario</h2>
            <Link href="/admin/usuarios" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Volver a usuarios
            </Link>
          </div>

          <form className="space-y-6" onSubmit={handleCreateUser}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">
                Tienda asignada
              </label>
              <select
                id="storeId"
                name="storeId"
                value={formData.storeId}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Sin asignar</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="isAdmin"
                  name="isAdmin"
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isAdmin" className="font-medium text-gray-700">
                  Administrador
                </label>
                <p className="text-gray-500">Los administradores tienen acceso a todas las funciones del sistema</p>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Creando usuario..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

