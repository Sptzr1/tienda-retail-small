import AdminSidebar from "@/components/admin/sidebar"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Verificar si el usuario está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login?redirectedFrom=/admin")
  }

  // Verificar si el usuario es administrador
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

  if (!profile?.is_admin) {
    redirect("/")
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

