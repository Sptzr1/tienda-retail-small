import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReportsManager from "./reports-manager";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, stores(*)")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    console.error("Profile error:", profileError);
    return <div>Error al cargar el perfil</div>;
  }

  if (!profile?.stores?.id && !profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No tienes una tienda asignada</h1>
            <p className="text-gray-600 mb-4">
              Para acceder a los reportes, necesitas tener una tienda asignada. Por favor, contacta con un administrador
              para que te asigne a una tienda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let stores = [];
  if (profile?.is_admin) {
    const { data: storesData, error: storesError } = await supabase.from("stores").select("id, name").order("name");
    if (storesError) console.error("Stores error:", storesError);
    stores = storesData || [];
  } else {
    stores = [profile?.stores];
  }

  const storeId = profile?.stores?.id || (profile?.is_admin ? null : 0);
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

  if (!profile?.is_admin) {
    salesQuery = salesQuery.eq("store_id", storeId);
  }

  const { data: monthlySales, error: salesError } = await salesQuery;
  if (salesError) {
    console.error("Sales error:", salesError);
    return <div>Error al cargar las ventas: {salesError.message}</div>;
  }

  const topProductsQuery = supabase.rpc("get_top_products", {
    limit_count: 10,
    store_filter: storeId || null,
    is_admin: profile?.is_admin || false,
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

  if (!profile?.is_admin) {
    lowStockQuery = lowStockQuery.eq("store_id", storeId);
  }

  const { data: lowStockProductsRaw, error: lowStockError } = await lowStockQuery;
  if (lowStockError) console.error("Low stock error:", lowStockError);

  const lowStockProducts = lowStockProductsRaw?.filter((item) => item.quantity <= item.min_stock) || [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySalesQuery = supabase.rpc("get_daily_sales", {
    days_count: 30,
    store_filter: storeId || null,
    is_admin: profile?.is_admin || false,
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
