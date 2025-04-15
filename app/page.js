import Link from "next/link";
import { Store, BarChart3, ShoppingCart } from "lucide-react";
import UserButton from "@/components/auth/user-button";
import StoreList from "@/components/store/store-list";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let profile = null;
  let stores = [];

  if (session?.user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, role, store_id")
      .eq("id", session.user.id)
      .single();

    profile = profileData;

    if (profile?.role === "superadmin") {
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name, address, is_active, disabled_at")
        .order("name");
      stores = storesData || [];
    } else if (profile?.role === "manager") {
      const { data: assignedStoresData } = await supabase
        .from("manager_stores")
        .select("store_id")
        .eq("user_id", profile.id);

      if (assignedStoresData && assignedStoresData.length > 0) {
        const storeIds = assignedStoresData.map((store) => store.store_id);
        const { data: storesData } = await supabase
          .from("stores")
          .select("id, name, address, is_active, disabled_at")
          .in("id", storeIds)
          .order("name");
        stores = storesData || [];
      }
    } else if (profile?.role === "normal" && profile?.store_id) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, name, address, is_active, disabled_at")
        .eq("id", profile.store_id)
        .single();
      stores = storeData ? [storeData] : [];
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mi Tienda</h1>
          <UserButton />
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {!session ? (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Sistema de Punto de Venta</h2>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                Inicia sesión para acceder al sistema
              </p>
              <div className="mt-10 flex justify-center">
                <Link
                  href="/auth/login"
                  className="px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/register"
                  className="ml-4 px-5 py-3 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Registrarse
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Bienvenido, {profile?.full_name || "Usuario"}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {profile?.role === "superadmin"
                    ? "Tienes acceso de administrador a todas las tiendas"
                    : profile?.role === "manager"
                    ? `Gestionas ${stores.length} tienda${stores.length > 1 ? "s" : ""}`
                    : profile?.store_id
                    ? `Estás asignado a: ${stores[0]?.name || "Tienda desconocida"}`
                    : "No tienes una tienda asignada aún"}
                </p>
              </div>

              <StoreList stores={stores} role={profile?.role} />

              {(profile?.role === "superadmin" || profile?.role === "manager") && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  <Link
                    href="/admin/productos"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100 text-green-600">
                        <Store className="h-8 w-8" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold">Inventario</h2>
                        <p className="mt-1 text-gray-600">Administrar productos y categorías</p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/reportes"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                        <BarChart3 className="h-8 w-8" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold">Reportes</h2>
                        <p className="mt-1 text-gray-600">Visualiza informes de ventas, inventario y rendimiento.</p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="bg-white shadow-sm-up">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Mi Tienda. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}