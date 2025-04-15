"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    async function performDeferredTasks() {
      const supabase = getSupabaseBrowser();
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No user logged in:", userError?.message || "No user data");
          // Stay on login page
          return;
        }

        console.log("User found:", { userId: user.id, email: user.email });

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, store_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setError("Error al cargar el perfil.");
          return;
        }

        console.log("Profile fetched:", { role: profile.role, store_id: profile.store_id });

        // Redirect to homepage for all users
        router.push("/");
      } catch (err) {
        console.error("Unexpected error in performDeferredTasks:", err);
        setError("Error inesperado al procesar la sesión.");
      }
    }

    performDeferredTasks();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowser();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const { user } = data;

      console.log("Login successful:", { userId: user.id, email: user.email });

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, store_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      console.log("Profile fetched:", { role: profile.role, store_id: profile.store_id });

      // Redirect to homepage for all users
      router.push("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Error al iniciar sesión: " + (err.message || "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Iniciar Sesión"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}