import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export async function POST(request) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(" ")[1]);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || profile.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado: Solo super admins pueden crear usuarios" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, fullName, role, storeId, assignedStores } = await request.json();

    if (!email || !fullName || !role) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos: email, fullName, role" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!["super_admin", "manager", "normal", "demo"].includes(role)) {
      return new Response(JSON.stringify({ error: "Rol inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (role === "normal" && !storeId) {
      return new Response(JSON.stringify({ error: "Usuarios normales requieren una tienda asignada" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (role === "manager" && (!assignedStores || assignedStores.length === 0)) {
      return new Response(JSON.stringify({ error: "Managers requieren al menos una tienda asignada" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tempPass = randomBytes(8).toString("hex");

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPass,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const profileData = {
      id: authData.user.id,
      full_name: fullName,
      role,
      is_admin: role === "super_admin",
      store_id: role === "normal" ? Number.parseInt(storeId) || null : null,
      force_password_change: true,
    };

    const tempPassData = {
      user_id: authData.user.id,
      temp_password: tempPass,
      used: false,
    };

    const managerStoresData = role === "manager" && assignedStores.length > 0
      ? assignedStores.map((storeId) => ({
          user_id: authData.user.id,
          store_id: Number.parseInt(storeId),
        }))
      : null;

    const [profileResult, tempPassResult, managerStoresResult] = await Promise.all([
      supabase.from("profiles").insert([profileData]),
      supabase.from("temp_passwords").insert([tempPassData]),
      managerStoresData ? supabase.from("manager_stores").insert(managerStoresData) : Promise.resolve({ error: null }),
    ]);

    if (profileResult.error || tempPassResult.error || managerStoresResult.error) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      const errorMsg = profileResult.error?.message ||
                       tempPassResult.error?.message ||
                       managerStoresResult.error?.message ||
                       "Error al guardar datos del usuario";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

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