import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import SalesReport from "./sales-report"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Obtener información del perfil
  const { data: profile } = await supabase.from("profiles").select("*, stores(*)").eq("id", session.user.id).single()

  // Obtener tiendas
  const storesQuery = supabase.from("stores").select("*").order("name")

  const { data: stores } = await storesQuery

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h1>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reporte de Ventas</h2>

          <SalesReport profile={profile} stores={stores || []} />
        </div>
      </div>
    </div>
  )
}