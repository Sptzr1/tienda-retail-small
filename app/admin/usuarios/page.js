import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import UserManagement from "@/components/admin/user-management"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function UsuariosPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Verificar si el usuario es administrador
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Acceso denegado</h1>
          <p className="mt-2">No tienes permiso para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

  if (!profile?.is_admin) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Acceso denegado</h1>
          <p className="mt-2">No tienes permiso para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  // Obtener usuarios y tiendas
  const { data: users } = await supabase
    .from("profiles")
    .select(`
      *,
      stores:store_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false })

  const { data: stores } = await supabase.from("stores").select("*").order("name")

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Administrar Usuarios</h1>
          <Link
            href="/admin/create-user"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Crear usuario
          </Link>
        </div>

        <div className="mt-8">
          <UserManagement users={users || []} stores={stores || []} />
        </div>
      </div>
    </div>
  )
}

