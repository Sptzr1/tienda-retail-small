// app/page.js
import Link from "next/link";
import { Store, BarChart3, ShoppingCart } from "lucide-react";
import UserButton from "@/components/auth/user-button";
import StoreList from "@/components/store/store-list";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

async function fetchProfileAndStores(supabase, userId) {
  const cookieStore = await cookies();
  let profile = null;
  const cachedProfile = cookieStore.get("profile")?.value;
  if (cachedProfile) {
    try {
      profile = JSON.parse(cachedProfile);
      console.log("Using cached profile:", profile);
    } catch (err) {
      console.error("Error parsing cached profile:", err.message);
    }
  }

  if (!profile) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, store_id, demo_view_privilege")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError.message);
      return { profile: null, stores: [] };
    }
    profile = profileData;
  }

  let stores = [];
  if (profile?.role === "super_admin" || (profile?.role === "demo" && profile?.demo_view_privilege === "super_admin")) {
    const { data: storesData, error: storesError } = await supabase
      .from("stores")
      .select("id, name, address, is_active, disabled_at")
      .order("name");
    if (storesError) {
      console.error("Error fetching stores:", storesError.message);
    } else {
      stores = storesData || [];
    }
  } else if (profile?.role === "manager" || (profile?.role === "demo" && profile?.demo_view_privilege === "manager")) {
    const { data: assignedStoresData, error: assignedError } = await supabase
      .from("manager_stores")
      .select("stores!manager_stores_store_id_fkey(id, name, address, is_active, disabled_at)")
      .eq("user_id", profile.id);
    if (assignedError) {
      console.error("Error fetching manager stores:", assignedError.message);
    } else {
      stores = assignedStoresData?.map((item) => item.stores) || [];
    }
  } else if (profile?.role === "normal" && profile?.store_id) {
    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("id, name, address, is_active, disabled_at")
      .eq("id", profile.store_id)
      .single();
    if (storeError) {
      console.error("Error fetching normal user store:", storeError.message);
    } else {
      stores = storeData ? [storeData] : [];
    }
  }

  return { profile, stores };
}

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let profile = null;
  let stores = [];

  if (session?.user) {
    const result = await fetchProfileAndStores(supabase, session.user.id);
    profile = result.profile;
    stores = result.stores;
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
          {!profile ? (
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
                  {profile?.role === "super_admin"
                    ? "Tienes acceso de administrador a todas las tiendas"
                    : profile?.role === "manager"
                    ? `Gestionas ${stores.length} tienda${stores.length > 1 ? "s" : ""}`
                    : profile?.role === "demo" && profile?.demo_view_privilege === "super_admin"
                    ? "Vista demo de administrador (todas las tiendas)"
                    : profile?.role === "demo" && profile?.demo_view_privilege === "manager"
                    ? `Vista demo de gerente (${stores.length} tienda${stores.length > 1 ? "s" : ""})`
                    : profile?.store_id
                    ? `Estás asignado a: ${stores[0]?.name || "Tienda desconocida"}`
                    : "No tienes una tienda asignada aún"}
                </p>
              </div>

              <StoreList stores={stores} role={profile?.role} />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                {profile?.role === "normal" && profile?.store_id && (
                  <Link
                    href="/cart"
                    className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <ShoppingCart className="h-8 w-8" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold">Carrito de Compras</h2>
                        <p className="mt-1 text-gray-600">Realiza ventas y gestiona pedidos</p>
                      </div>
                    </div>
                  </Link>
                )}

                {(profile?.role === "super_admin" ||
                  profile?.role === "manager" ||
                  (profile?.role === "demo" && profile?.demo_view_privilege === "super_admin") ||
                  (profile?.role === "demo" && profile?.demo_view_privilege === "manager")) && (
                  <>
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
                          <p className="mt-1 text-gray-600">
                            {profile?.role === "demo" ? "Ver productos y categorías" : "Administrar productos y categorías"}
                          </p>
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
                          <p className="mt-1 text-gray-600">
                            Visualiza informes de ventas, inventario y rendimiento
                          </p>
                        </div>
                      </div>
                    </Link>
                  </>
                )}
              </div>
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