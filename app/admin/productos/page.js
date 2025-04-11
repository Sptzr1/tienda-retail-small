import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductForm from "@/components/admin/product-form";
import ProductList from "@/components/admin/product-list";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const cookieStore =await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log("No session, redirecting to login");
    redirect("/auth/login?redirectedFrom=/admin/productos");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, store_id")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return <div>Error al cargar el perfil</div>;
  }

  console.log("Profile:", profile);

  if (profile.role !== "superadmin" && profile.role !== "manager") {
    console.log("Invalid role, redirecting to /");
    redirect("/");
  }

  let productsQuery = supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `);

  if (profile.role === "manager") {
    const { data: assignedStores, error: storesError } = await supabase
      .from("manager_stores")
      .select("store_id")
      .eq("user_id", profile.id);

    console.log("Assigned stores:", assignedStores, "Error:", storesError);

    if (!assignedStores || assignedStores.length === 0) {
      console.log("Redirecting: No assigned stores found");
      redirect("/");
    }

    const storeIds = assignedStores.map((s) => s.store_id);
    console.log("Store IDs:", storeIds);
    productsQuery = productsQuery.in("store_id", storeIds);
  }

  console.log("Executing products query...");
  const { data: products, error } = await productsQuery.order("name");
  console.log("Products result:", products, "Error:", error);

  if (error) {
    console.error("Error fetching products:", error);
    return <div>Error al cargar los productos: {error.message}</div>;
  }

  const { data: categories } = await supabase.from("categories").select("*").order("name");

  console.log("Rendering page with products:", products);
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
  );
}
