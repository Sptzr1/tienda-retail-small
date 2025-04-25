import AdminSidebar from "@/components/admin/sidebar";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Verificar si el usuario está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login?redirectedFrom=/admin");
  }

  // Verificar si el usuario tiene un rol permitido (super_admin, manager, o demo con privilegios)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, demo_view_privilege")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Error fetching profile in layout:", error);
    redirect("/auth/login");
  }

  if (
    profile.role !== "super_admin" &&
    profile.role !== "manager" &&
    !(profile.role === "demo" && (profile.demo_view_privilege === "super_admin" || profile.demo_view_privilege === "manager"))
  ) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}