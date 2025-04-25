"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function CreateUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "normal",
    storeId: "",
    assignedStores: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [stores, setStores] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Debes iniciar sesión para crear usuarios.");
          setIsAuthorized(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "super_admin") {
          setIsAuthorized(true);
        } else {
          setError("No tienes permiso para crear usuarios.");
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setError("Error al verificar permisos.");
        setIsAuthorized(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    const fetchStores = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase
          .from("stores")
          .select("id,name")
          .order("name");
        setStores(data || []);
      } catch (error) {
        console.error("Error fetching stores:", error);
        setError("Error al cargar las tiendas.");
      }
    };
    fetchStores();
  }, [isAuthorized]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "assignedStores") {
      const storeId = Number(value);
      setFormData((prev) => ({
        ...prev,
        assignedStores: checked
          ? [...prev.assignedStores, storeId]
          : prev.assignedStores.filter((id) => id !== storeId),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No estás autenticado");

      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Error al crear el usuario");

      setTempPassword(result.tempPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      setError(error.message || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
        <div className="animate-pulse h-10 bg-gray-200 rounded w-64"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
        <div className="max-w-md w-full space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Acceso denegado</h2>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (tempPassword) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center">Usuario creado exitosamente</h2>
            <div className="mt-6 bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                Esta contraseña temporal solo se mostrará una vez. Asegúrate de copiarla y compartirla de forma segura con el usuario.
              </p>
            </div>
            <div className="mt-4 bg-gray-100 p-3 rounded-md font-mono text-center">{tempPassword}</div>
            <div className="mt-8 flex justify-center space-x-4">
              <Link
                href="/admin/usuarios"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver a usuarios
              </Link>
              <button
                onClick={() => {
                  setTempPassword(null);
                  setFormData({ email: "", fullName: "", role: "normal", storeId: "", assignedStores: [] });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Crear otro usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Crear nuevo usuario</h2>
            <Link href="/admin/usuarios" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Volver a usuarios
            </Link>
          </div>

          <form className="space-y-6" onSubmit={handleCreateUser}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nombre completo</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="normal">Normal</option>
                <option value="manager">Manager</option>
                <option value="super_admin">Super Admin</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            {formData.role === "normal" && (
              <div>
                <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">Tienda asignada</label>
                <select
                  id="storeId"
                  name="storeId"
                  value={formData.storeId}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Selecciona una tienda</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.role === "manager" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Tiendas asignadas</label>
                <div className="mt-2 space-y-2">
                  {stores.map((store) => (
                    <div key={store.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`store-${store.id}`}
                        name="assignedStores"
                        value={store.id}
                        checked={formData.assignedStores.includes(store.id)}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`store-${store.id}`} className="ml-2 text-sm text-gray-700">{store.name}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !isAuthorized}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Creando usuario..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}