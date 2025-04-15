"use client";

import { useState } from "react";
import { getSupabaseBrowser, invalidateSession } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);
    const supabase = getSupabaseBrowser();

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session for logout:", sessionError);
      } else if (session?.user?.id) {
        await invalidateSession(supabase, session.id, session.user.id);
        console.log("Session invalidated:", { sessionId: session.id, userId: session.user.id });
      } else {
        console.warn("No valid session for logout");
      }

      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
    >
      {loading ? "Cerrando..." : "Cerrar Sesión"}
    </button>
  );
}