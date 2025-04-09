"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Store, Tag, BarChart3, Home, Users, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const navigation = [
    { name: "Inicio", href: "/", icon: Home },
    { name: "Productos", href: "/admin/productos", icon: Store },
    { name: "Categorías", href: "/admin/categorias", icon: Tag },
    { name: "Usuarios", href: "/admin/usuarios", icon: Users },
    { name: "Reportes", href: "/admin/reportes", icon: BarChart3 },
  ]

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser()
      await supabase.auth.signOut()
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold">Mi Tienda Admin</h1>
        </div>
        <div className="mt-5 flex-1 flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 flex-shrink-0 h-6 w-6
                      ${isActive ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <button onClick={handleLogout} className="flex-shrink-0 w-full group block text-left">
            <div className="flex items-center">
              <div>
                <LogOut className="inline-block h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Cerrar sesión</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

