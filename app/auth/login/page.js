"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser, createSession } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { useSessionContext } from "@/lib/session-context";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { setSession } = useSessionContext();
  useEffect(() => {
    async function performDeferredTasks() {
      const supabase = getSupabaseBrowser();
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log("No user logged in:", userError?.message || "No user data");
          return;
        }

        console.log("User found:", { userId: user.id, email: user.email });

        const { data: session, error: sessionError } = await supabase
          .from("sessions")
          .select("id, expires_at, is_valid")
          .eq("user_id", user.id)
          .eq("is_valid", true)
          .gte("expires_at", new Date().toISOString())
          .single();

        if (sessionError || !session) {
          console.log("No valid session found:", sessionError?.message || "No session data");
          await supabase.auth.signOut();
          return;
        }

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
    if (loading) return;

    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Por favor, completa todos los campos.");
      setLoading(false);
      return;
    }

    console.log("Attempting login:", { email: trimmedEmail });

    const supabase = getSupabaseBrowser();

    try {
      let signInError;
      let data;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          ({ data, error: signInError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          }));
          if (!signInError) break;
          console.warn(`Login attempt ${attempt} failed:`, signInError);
          if (attempt === 3) throw signInError;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (retryError) {
          console.error(`Login retry ${attempt} error:`, retryError);
          throw retryError;
        }
      }

      if (signInError) {
        console.error("Sign-in error details:", signInError);
        throw new Error(signInError.message);
      }

      const { user, session } = data;

      console.log("Login successful:", { userId: user.id, email: user.email });

      let sessionId = session?.id;
      if (!sessionId) {
        console.warn("No session ID from auth, generating UUID");
        sessionId = uuidv4();
      }
  
      try {
        await createSession(supabase, sessionId, user.id, navigator.userAgent);
        setSession(sessionId, user.id); // Update context
      } catch (sessionError) {
        console.error("Session creation failed:", sessionError);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, store_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw new Error(`Profile fetch failed: ${profileError.message}`);
      }

      console.log("Profile fetched:", { role: profile.role, store_id: profile.store_id });

      setEmail("");
      setPassword("");
      router.push("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Error al iniciar sesión: " + (err.message || "Credenciales inválidas"));
      setEmail("");
      setPassword("");
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
        <form className="mt-8 space-y-6" onSubmit={handleLogin} method="POST">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
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