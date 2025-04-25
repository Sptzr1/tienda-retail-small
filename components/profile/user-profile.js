"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function UserProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, force_password_change")
        .eq("id", session.user.id)
        .single();

      if (error) {
        setError("Error al cargar el perfil");
        return;
      }

      setProfile(data);
      setNewFullName(data.full_name);
    };

    fetchProfile();
  }, [router]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (newPassword && newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("No estás autenticado");
        setLoading(false);
        return;
      }

      const updates = {};
      if (newFullName !== profile.full_name) {
        updates.full_name = newFullName;
      }
      if (newPassword) {
        updates.force_password_change = false;
      }

      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", session.user.id);

        if (profileError) {
          setError("Error al actualizar el perfil");
          setLoading(false);
          return;
        }
      }

      if (newPassword) {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (authError) {
          setError("Error al actualizar la contraseña");
          setLoading(false);
          return;
        }
      }

      setSuccess("Perfil actualizado exitosamente");
      setProfile({ ...profile, full_name: newFullName, force_password_change: false });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setError("Error al actualizar el perfil");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  const isDemo = profile.role === "demo";

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Perfil de usuario
          </h2>
          <p className="text-center text-sm text-gray-500 mt-2">
            {isDemo ? "Usuario Demo" : `Usuario: ${profile.full_name}`}
          </p>

          {profile.force_password_change && (
            <div className="mt-4 bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                Por favor, cambia tu contraseña temporal.
              </p>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleUpdateProfile}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                disabled={isDemo}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDemo ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isDemo}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDemo ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isDemo}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${isDemo ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            {isDemo && (
              <div className="rounded-md bg-yellow-50 p-4">
                <p className="text-sm text-yellow-700">
                  Los usuarios demo no pueden modificar su perfil. Contacta a un super admin para actualizar tu cuenta.
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || isDemo}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${isDemo ? "cursor-not-allowed" : ""}`}
              >
                {loading ? "Actualizando..." : "Actualizar perfil"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}