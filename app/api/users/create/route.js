import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(" ")[1]);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile.role !== "superadmin") {
    return new Response(JSON.stringify({ error: "No autorizado: Solo superadmins pueden crear usuarios" }), { status: 403 });
  }

  try {
    const { email, fullName, role, storeId, assignedStores } = await request.json();

    const tempPass = `User${Math.floor(Math.random() * 10000)}!`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPass,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) throw authError;

    const profileData = {
      id: authData.user.id,
      full_name: fullName,
      role,
      store_id: role === "normal" ? Number.parseInt(storeId) || null : null,
      force_password_change: true,
    };

    const { error: profileError } = await supabase.from("profiles").insert([profileData]);
    if (profileError) throw profileError;

    if (role === "manager" && assignedStores.length > 0) {
      const managerStores = assignedStores.map((storeId) => ({
        user_id: authData.user.id,
        store_id: Number.parseInt(storeId),
      }));
      const { error: storesError } = await supabase.from("manager_stores").insert(managerStores);
      if (storesError) throw storesError;
    }

    const { error: tempPassError } = await supabase.from("temp_passwords").insert([
      { user_id: authData.user.id, temp_password: tempPass, force_change: true },
    ]);
    if (tempPassError) throw tempPassError;

    return new Response(JSON.stringify({ tempPassword: tempPass }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(JSON.stringify({ error: error.message || "Error al crear el usuario" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}