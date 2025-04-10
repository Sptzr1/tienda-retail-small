import AdminSidebar from "@/components/admin/sidebar";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Verificar si el usuario está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login?redirectedFrom=/admin");
  }

  // Verificar si el usuario tiene un rol permitido (superadmin o manager)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Error fetching profile in layout:", error);
    redirect("/auth/login"); // O maneja el error de otra forma
  }

  if (profile.role !== "superadmin" && profile.role !== "manager") {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

