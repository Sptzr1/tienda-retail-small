import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import UserProfile from "@/components/profile/user-profile"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Verificar si el usuario está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login?redirectedFrom=/profile")
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase.from("profiles").select("*, stores(*)").eq("id", session.user.id).single()

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <UserProfile user={session.user} profile={profile} />
        </div>
      </div>
    </div>
  )
}

