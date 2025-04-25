import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReportsManager from "./reports-manager";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/auth/login?redirectedFrom=/admin/reportes");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, store_id")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    console.error("Profile error:", profileError);
    return <div>Error al cargar el perfil</div>;
  }

  // Permitir solo a super_admin y manager
  if (profile.role !== "super_admin" && profile.role !== "manager") {
    redirect("/");
  }

  let stores = [];
  let storeId = null;

  if (profile.role === "super_admin") {
    const { data: storesData, error: storesError } = await supabase.from("stores").select("id, name").order("name");
    if (storesError) console.error("Stores error:", storesError);
    stores = storesData || [];
  } else if (profile.role === "manager") {
    const { data: assignedStores, error: storesError } = await supabase
      .from("manager_stores")
      .select("store_id, stores(id, name)")
      .eq("user_id", profile.id);
    if (storesError || !assignedStores || assignedStores.length === 0) {
      console.error("Stores error or no stores assigned:", storesError);
      redirect("/"); // Redirige si no tiene tiendas asignadas
    }
    stores = assignedStores.map((s) => s.stores);
    storeId = stores[0].id; // Usar la primera tienda por defecto
  }

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

  let salesQuery = supabase
    .from("sales")
    .select(`
      id,
      total_amount,
      items_count,
      created_at,
      stores!fk_store_id (name)
    `)
    .gte("created_at", firstDayOfMonth)
    .lte("created_at", lastDayOfMonth)
    .order("created_at", { ascending: false });

  if (profile.role === "manager") {
    salesQuery = salesQuery.in("store_id", stores.map((s) => s.id));
  }

  const { data: monthlySales, error: salesError } = await salesQuery;
  if (salesError) {
    console.error("Sales error:", salesError);
    return <div>Error al cargar las ventas: {salesError.message}</div>;
  }

  const topProductsQuery = supabase.rpc("get_top_products", {
    limit_count: 10,
    store_filter: profile.role === "manager" ? storeId : null,
    is_admin: profile.role === "super_admin",
    start_date: firstDayOfMonth,
    end_date: lastDayOfMonth,
  });

  const { data: topProducts, error: topProductsError } = await topProductsQuery;
  if (topProductsError) console.error("Top products error:", topProductsError);

  let lowStockQuery = supabase
    .from("inventory")
    .select(`
      id,
      quantity,
      min_stock,
      products (
        id,
        name,
        price
      ),
      stores (
        id,
        name
      )
    `)
    .order("quantity");

  if (profile.role === "manager") {
    lowStockQuery = lowStockQuery.in("store_id", stores.map((s) => s.id));
  }

  const { data: lowStockProductsRaw, error: lowStockError } = await lowStockQuery;
  if (lowStockError) console.error("Low stock error:", lowStockError);

  const lowStockProducts = lowStockProductsRaw?.filter((item) => item.quantity <= item.min_stock) || [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySalesQuery = supabase.rpc("get_daily_sales", {
    days_count: 30,
    store_filter: profile.role === "manager" ? storeId : null,
    is_admin: profile.role === "super_admin",
  });

  const { data: dailySales, error: dailySalesError } = await dailySalesQuery;
  if (dailySalesError) console.error("Daily sales error:", dailySalesError);

  return (
    <div className="min-h-screen bg-gray-100">
      <ReportsManager
        profile={profile}
        stores={stores}
        storeId={storeId}
        monthlySales={monthlySales || []}
        topProducts={topProducts || []}
        lowStockProducts={lowStockProducts || []}
        dailySales={dailySales || []}
      />
    </div>
  );
}
