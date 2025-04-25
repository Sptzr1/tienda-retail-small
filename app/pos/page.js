// app/pos/page.js
import PosLayout from "@/components/pos/pos-layout";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return redirect("/auth/login?redirectedFrom=/pos");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, store_id")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return <div>Error al cargar el perfil</div>;
  }

  let stores = [];
  let selectedStoreId = searchParams?.store ? Number.parseInt(searchParams.store) : null;

  if (profile.role === "super_admin") {
    const { data: allStores } = await supabase.from("stores").select("id, name").order("id");
    stores = allStores || [];
    selectedStoreId = selectedStoreId && stores.some((s) => s.id === selectedStoreId) ? selectedStoreId : stores[0]?.id;
  } else if (profile.role === "manager") {
    const { data: assignedStores } = await supabase
      .from("manager_stores")
      .select("store_id, stores!manager_stores_store_id_fkey(id, name)")
      .eq("user_id", profile.id);

    stores = assignedStores?.map((s) => s.stores) || [];
    selectedStoreId = selectedStoreId && stores.some((s) => s.id === selectedStoreId) ? selectedStoreId : stores[0]?.id;
  } else if (profile.role === "demo") {
    const { data: allStores } = await supabase.from("stores").select("id, name").order("id");
    stores = allStores || [];
    selectedStoreId = selectedStoreId && stores.some((s) => s.id === selectedStoreId) ? selectedStoreId : stores[0]?.id;
  } else if (profile.role === "normal" && profile.store_id) {
    const { data: store } = await supabase.from("stores").select("id, name").eq("id", profile.store_id).single();
    stores = store ? [store] : [];
    selectedStoreId = store?.id;
  }

  if (stores.length === 0 || !selectedStoreId) {
    return <div>No tienes tiendas asignadas</div>;
  }

  const { data: categories } = await supabase.from("categories").select("*").order("name");

  const { data: products } = await supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .eq("store_id", selectedStoreId)
    .order("name");

  const { data: selectedStore } = await supabase.from("stores").select("*").eq("id", selectedStoreId).single();

  const modules = {
    super_admin: ['admin', 'products', 'stores', 'users', 'cart'],
    manager: ['products', 'cart'],
    normal: ['cart'],
    demo: ['cart']
  }[profile.role] || [];

  return (
    <PosLayout
      categories={categories || []}
      products={products || []}
      store={selectedStore || {}}
      stores={stores}
      user={profile}
      modules={modules}
    />
  );
}