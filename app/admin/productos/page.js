import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProductForm from "@/components/admin/product-form";
import ProductList from "@/components/admin/product-list";

export const dynamic = "force-dynamic";

export default async function ProductosPage({ searchParams }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log("No session, redirecting to login");
    redirect("/auth/login?redirectedFrom=/admin/productos");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, store_id, demo_view_privilege")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return <div>Error al cargar el perfil</div>;
  }

  console.log("Profile:", profile);

  // Fetch exchange rates (latest two for rate section, latest one for ProductList)
  const { data: rates, error: ratesError } = await supabase
    .from("exchange_rates")
    .select("rate, created_at")
    .order("created_at", { ascending: false })
    .limit(2);

  if (ratesError) {
    console.error("Error fetching exchange rates:", ratesError);
  }

  const currentRate = rates?.[0]?.rate || null;
  const previousRate = rates?.[1]?.rate || null;
  const currentRateDate = rates?.[0]?.created_at
    ? new Date(rates[0].created_at).toLocaleString()
    : null;

  // Handle rate update submission (disabled for demo users)
  let rateUpdateError = null;
  if (searchParams.newRate && profile.role !== "demo") {
    const newRate = Number.parseFloat(searchParams.newRate);
    if (newRate > 0) {
      const { error } = await supabase
        .from("exchange_rates")
        .insert([{ rate: newRate, created_by: profile.id }]);
      if (error) {
        console.error("Error updating rate:", error);
        rateUpdateError = error.message;
      } else {
        redirect("/admin/productos");
      }
    } else {
      rateUpdateError = "La tasa debe ser un número positivo.";
    }
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

  // Apply store filtering for manager or demo with manager privilege
  if (profile.role === "manager" || (profile.role === "demo" && profile.demo_view_privilege === "manager")) {
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

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }

  console.log("Rendering page with products:", products);
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Administrar Productos</h1>

        {/* Exchange Rate Section */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900">Tasa de Cambio (Bs.D/USD)</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Tasa Actual</p>
              <p className="text-4xl font-bold text-gray-900">
                {currentRate ? `${currentRate.toFixed(2)} Bs.D/USD` : "No establecida"}
              </p>
              {currentRateDate && (
                <p className="text-sm text-gray-500">Actualizada: {currentRateDate}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Tasa Anterior</p>
              <p className="text-4xl font-bold text-gray-900">
                {previousRate ? `${previousRate.toFixed(2)} Bs.D/USD` : "N/A"}
              </p>
            </div>
          </div>
          {profile.role !== "demo" && (
            <form action="/admin/productos" method="GET" className="mt-6">
              <label htmlFor="newRate" className="block text-sm font-medium text-gray-700">
                Nueva Tasa (Bs.D por 1 USD)
              </label>
              <div className="mt-1 flex rounded-md shadow-sm max-w-xs">
                <input
                  type="number"
                  name="newRate"
                  id="newRate"
                  step="0.01"
                  min="0"
                  className="flex-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Ej. 36.50"
                />
                <button
                  type="submit"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Actualizar
                </button>
              </div>
              {rateUpdateError && (
                <p className="mt-2 text-sm text-red-600">{rateUpdateError}</p>
              )}
            </form>
          )}
          {profile.role === "demo" && (
            <p className="mt-2 text-sm text-blue-600">
              Usuarios demo no pueden actualizar la tasa de cambio.
            </p>
          )}
        </div>

        {/* Product Form (hidden for demo users) */}
        {profile.role !== "demo" && (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Agregar Nuevo Producto</h2>
            <ProductForm categories={categories || []} />
          </div>
        )}
        {profile.role === "demo" && (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Agregar Nuevo Producto</h2>
            <p className="text-sm text-blue-600">
              Usuarios demo no pueden agregar o editar productos.
            </p>
          </div>
        )}

        {/* Product List */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">Lista de Productos</h2>
          <ProductList products={products || []} exchangeRate={currentRate} isDemo={profile.role === "demo"} />
        </div>
      </div>
    </div>
  );
}