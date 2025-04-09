import { getSupabaseServer } from "@/lib/supabase"
import CategoryForm from "@/components/admin/category-form"
import CategoryList from "@/components/admin/category-list"

export const dynamic = "force-dynamic"

export default async function CategoriasPage() {
  const supabase = getSupabaseServer()

  const { data: categories, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error fetching categories:", error)
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Administrar Categorías</h1>

        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Agregar Nueva Categoría</h2>
          <CategoryForm />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Lista de Categorías</h2>
          <CategoryList categories={categories || []} />
        </div>
      </div>
    </div>
  )
}

