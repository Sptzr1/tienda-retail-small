"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function UserManagement({ users, stores }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);

  const handleUpdateUser = async (userId, updates) => {
    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      // Update profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: updates.role,
          store_id: updates.store_id,
          force_password_change: updates.force_password_change,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update manager_stores for manager role
      if (updates.role === "manager" && updates.manager_stores?.length > 0) {
        // Delete existing manager_stores
        await supabase.from("manager_stores").delete().eq("user_id", userId);

        // Insert new manager_stores
        const managerStoresData = updates.manager_stores.map((storeId) => ({
          user_id: userId,
          store_id: Number.parseInt(storeId),
        }));
        const { error: storesError } = await supabase.from("manager_stores").insert(managerStoresData);
        if (storesError) throw storesError;
      } else if (updates.role !== "manager") {
        // Clear manager_stores for non-managers
        await supabase.from("manager_stores").delete().eq("user_id", userId);
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error al actualizar el usuario: " + error.message);
    } finally {
      setLoading(false);
      setSelectedUser(null);
    }
  };

  const handleResetPassword = async (userId) => {
    setLoading(true);
    setTempPassword(null);

    try {
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase.rpc("admin_create_temp_password", { user_id_param: userId });

      if (error) throw error;
      setTempPassword(data);
      router.refresh();
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Error al restablecer la contraseña: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Usuario
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Rol
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tienda(s)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Último acceso
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {user.full_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "superadmin"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.role === "superadmin" ? "Superadmin" : user.role === "manager" ? "Manager" : "Normal"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role === "normal" && user.store
                          ? user.store.name
                          : user.role === "manager" && user.stores?.length > 0
                          ? user.stores.map((s) => s.name).join(", ")
                          : "Sin asignar"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Nunca"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Restablecer contraseña
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Usuario: {selectedUser.full_name}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={selectedUser.role || "normal"}
                    onChange={(e) => {
                      setSelectedUser({
                        ...selectedUser,
                        role: e.target.value,
                        store_id: e.target.value !== "normal" ? null : selectedUser.store_id,
                        manager_stores:
                          e.target.value === "manager" ? selectedUser.manager_stores || [] : [],
                      });
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="manager">Manager</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>

                {selectedUser.role === "normal" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tienda asignada</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={selectedUser.store_id || ""}
                      onChange={(e) => {
                        setSelectedUser({
                          ...selectedUser,
                          store_id: e.target.value ? Number.parseInt(e.target.value) : null,
                        });
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedUser.role === "manager" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tiendas asignadas</label>
                    <div className="mt-1 space-y-2">
                      {stores.map((store) => (
                        <div key={store.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedUser.manager_stores?.includes(store.id.toString()) || false}
                            onChange={(e) => {
                              const newStores = e.target.checked
                                ? [...(selectedUser.manager_stores || []), store.id.toString()]
                                : (selectedUser.manager_stores || []).filter((id) => id !== store.id.toString());
                              setSelectedUser({
                                ...selectedUser,
                                manager_stores: newStores,
                              });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{store.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Forzar cambio de contraseña</label>
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={selectedUser.force_password_change || false}
                      onChange={(e) => {
                        setSelectedUser({
                          ...selectedUser,
                          force_password_change: e.target.checked,
                        });
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      El usuario deberá cambiar su contraseña en el próximo inicio de sesión
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateUser(selectedUser.id, {
                      role: selectedUser.role,
                      store_id: selectedUser.store_id,
                      manager_stores: selectedUser.manager_stores,
                      force_password_change: selectedUser.force_password_change,
                    })
                  }
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de contraseña temporal */}
      {tempPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contraseña temporal generada</h3>

              <div className="bg-yellow-50 p-4 rounded-md mb-4">
                <p className="text-sm text-yellow-700">
                  Esta contraseña solo se mostrará una vez. Asegúrate de copiarla y compartirla de forma segura con el
                  usuario.
                </p>
              </div>

              <div className="bg-gray-100 p-3 rounded-md font-mono text-center mb-6">{tempPassword}</div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setTempPassword(null)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

