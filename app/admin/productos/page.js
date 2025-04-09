import { getSupabaseServer } from "@/lib/supabase"
import ProductForm from "@/components/admin/product-form"
import ProductList from "@/components/admin/product-list"

export const dynamic = "force-dynamic"

export default async function ProductosPage() {
  const supabase = getSupabaseServer()

  // Fetch products with category names
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .order("name")

  // Fetch categories for the form
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error fetching products:", error)
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Administrar Productos</h1>

        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Agregar Nuevo Producto</h2>
          <ProductForm categories={categories || []} />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Lista de Productos</h2>
          <ProductList products={products || []} />
        </div>
      </div>
    </div>
  )
}

