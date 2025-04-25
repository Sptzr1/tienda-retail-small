import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import UserManagement from "@/components/admin/user-management";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Verificar si el usuario es administrador
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Acceso denegado</h1>
          <p className="mt-2">No tienes permiso para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || !["manager", "super_admin"].includes(profile.role)) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Acceso denegado</h1>
          <p className="mt-2">No tienes permiso para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  // Obtener usuarios con roles y tiendas asociadas
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      store_id,
      created_at,
      last_login,
      stores:store_id (
        id,
        name
      ),
      manager_stores (
        store_id,
        stores:store_id (
          id,
          name
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Error</h1>
          <p className="mt-2">No se pudieron cargar los usuarios. Intenta de nuevo más tarde.</p>
        </div>
      </div>
    );
  }

  // Transformar datos para UserManagement
  const formattedUsers = users
    ? users.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        store_id: user.store_id,
        last_login: user.last_login,
        store: user.role === "normal" && user.stores ? { id: user.stores.id, name: user.stores.name } : null,
        stores:
          user.role === "manager" && user.manager_stores?.length > 0
            ? user.manager_stores.map((ms) => ({ id: ms.stores.id, name: ms.stores.name }))
            : [],
      }))
    : [];

  const { data: stores, error: storesError } = await supabase
    .from("stores")
    .select("id, name")
    .order("name");

  if (storesError) {
    console.error("Error fetching stores:", storesError);
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Administrar Usuarios</h1>
          <Link
            href="/admin/create-user"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Crear usuario
          </Link>
        </div>

        <div className="mt-8">
          <UserManagement users={formattedUsers} stores={stores || []} />
        </div>
      </div>
    </div>
  );
}

