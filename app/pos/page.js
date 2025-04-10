import PosLayout from "@/components/pos/pos-layout";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Verificar si el usuario está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login?redirectedFrom=/pos");
  }

  // Obtener perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, store_id")
    .eq("id", session.user.id)
    .single();

  // Determinar qué tienda mostrar
  let storeId = null;

  if (profile.role === "superadmin" && searchParams?.store) {
    // Superadmin: usar la tienda especificada en la URL
    storeId = Number.parseInt(searchParams.store);
  } else if (profile.role === "manager") {
    // Manager: verificar tiendas asignadas y usar la de la URL si está presente
    const { data: assignedStores } = await supabase
      .from("manager_stores")
      .select("store_id")
      .eq("user_id", profile.id);

    if (!assignedStores || assignedStores.length === 0) {
      redirect("/"); // No tiene tiendas asignadas
    }

    const assignedStoreIds = assignedStores.map((s) => s.store_id);
    if (searchParams?.store && assignedStoreIds.includes(Number.parseInt(searchParams.store))) {
      storeId = Number.parseInt(searchParams.store);
    } else {
      storeId = assignedStoreIds[0]; // Usar la primera tienda asignada por defecto
    }
  } else if (profile.role === "normal" && profile.store_id) {
    // Normal: usar su tienda asignada
    storeId = profile.store_id;
  } else {
    // Si no tiene tienda asignada ni es un caso válido, redirigir
    redirect("/");
  }

  // Fetch categories
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  // Fetch products with categories for the specific store
  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .eq("store_id", storeId)
    .order("name");

  // Fetch store info
  const { data: store } = await supabase.from("stores").select("*").eq("id", storeId).single();

  if (!store) {
    redirect("/");
  }

  return (
    <PosLayout
      categories={categories || []}
      products={products || []}
      store={store}
      user={profile}
    />
  );
}