// components/user-management.js
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

      // Prepare profile updates
      const profileUpdates = {
        role: updates.role,
        store_id: updates.role === "normal" ? updates.store_id : null,
        force_password_change: updates.role === "demo" ? false : updates.force_password_change,
        demo_view_privilege: updates.role === "demo" ? updates.demo_view_privilege : null,
      };

      // Update profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileError) throw new Error(`Profile update failed: ${profileError.message}`);

      // Set fixed password for demo users
      if (updates.role === "demo" && updates.demo_password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
          password: updates.demo_password,
        });
        if (passwordError) throw new Error(`Failed to set demo password: ${passwordError.message}`);
      }

      // Update manager_stores for manager or demo (manager privilege) roles
      if (updates.role === "manager" || (updates.role === "demo" && updates.demo_view_privilege === "manager")) {
        const { data: currentStores, error: fetchError } = await supabase
          .from("manager_stores")
          .select("store_id")
          .eq("user_id", userId);

        if (fetchError) throw new Error(`Failed to fetch manager_stores: ${fetchError.message}`);

        const currentStoreIds = currentStores.map((s) => s.store_id);
        const desiredStoreIds = (updates.manager_stores || [])
          .map((id) => Number.parseInt(id))
          .filter((id) => stores.some((s) => s.id === id));

        const uniqueStoreIds = [...new Set(desiredStoreIds)];
        if (uniqueStoreIds.length !== desiredStoreIds.length) {
          throw new Error("Se detectaron tiendas duplicadas");
        }

        const toAdd = uniqueStoreIds.filter((id) => !currentStoreIds.includes(id));
        const toRemove = currentStoreIds.filter((id) => !uniqueStoreIds.includes(id));

        console.log("manager_stores update:", { currentStoreIds, desiredStoreIds, toAdd, toRemove });

        if (toAdd.length > 0) {
          const managerStoresData = toAdd.map((storeId) => ({
            user_id: userId,
            store_id: storeId,
          }));
          console.log("Inserting manager_stores:", managerStoresData);
          const { error: insertError } = await supabase
            .from("manager_stores")
            .insert(managerStoresData);
          if (insertError) throw new Error(`Failed to insert manager_stores: ${insertError.message}`);
        }

        if (toRemove.length > 0) {
          console.log("Removing manager_stores:", toRemove);
          const { error: deleteError } = await supabase
            .from("manager_stores")
            .delete()
            .eq("user_id", userId)
            .in("store_id", toRemove);
          if (deleteError) throw new Error(`Failed to delete manager_stores: ${deleteError.message}`);
        }
      } else {
        const { error: deleteError } = await supabase
          .from("manager_stores")
          .delete()
          .eq("user_id", userId);
        if (deleteError) throw new Error(`Failed to clear manager_stores: ${deleteError.message}`);
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

  const handleEditUser = async (user) => {
    const supabase = getSupabaseBrowser();
    try {
      const { data: managerStores, error: fetchError } = await supabase
        .from("manager_stores")
        .select("store_id")
        .eq("user_id", user.id);

      if (fetchError) throw new Error(`Failed to fetch manager_stores: ${fetchError.message}`);

      setSelectedUser({
        ...user,
        manager_stores: managerStores.map((s) => s.store_id.toString()),
        demo_password: user.role === "demo" ? "" : null,
        demo_view_privilege: user.demo_view_privilege || "super_admin",
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      alert("Error al cargar datos del usuario: " + error.message);
      setSelectedUser({
        ...user,
        demo_password: user.role === "demo" ? "" : null,
        demo_view_privilege: user.role === "demo" ? "super_admin" : null,
      });
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tienda(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último acceso
                  </th>
                  <th className="relative px-6 py-3">
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
                            user.role === "super_admin"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "manager"
                              ? "bg-blue-100 text-blue-800"
                              : user.role === "demo"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.role === "super_admin"
                            ? "super_admin"
                            : user.role === "manager"
                            ? "Manager"
                            : user.role === "demo"
                            ? "Demo"
                            : "Normal"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role === "normal" && user.store
                          ? user.store.name
                          : (user.role === "manager" || (user.role === "demo" && user.demo_view_privilege === "manager")) && user.stores?.length > 0
                          ? user.stores.map((s) => s.name).join(", ")
                          : user.role === "demo" && user.demo_view_privilege === "super_admin"
                          ? "Todas las tiendas"
                          : "Sin asignar"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Nunca"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditUser(user)}
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
                      const newRole = e.target.value;
                      setSelectedUser({
                        ...selectedUser,
                        role: newRole,
                        store_id: newRole !== "normal" ? null : selectedUser.store_id,
                        manager_stores:
                          newRole === "manager" || (newRole === "demo" && selectedUser.demo_view_privilege === "manager")
                            ? selectedUser.manager_stores || []
                            : [],
                        force_password_change: newRole === "demo" ? false : selectedUser.force_password_change,
                        demo_view_privilege: newRole === "demo" ? selectedUser.demo_view_privilege || "super_admin" : null,
                        demo_password: newRole === "demo" ? selectedUser.demo_password || "" : null,
                      });
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="manager">Manager</option>
                    <option value="super_admin">super_admin</option>
                    <option value="demo">Demo</option>
                  </select>
                </div>

                {selectedUser.role === "demo" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Privilegio de Vista</label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={selectedUser.demo_view_privilege || "super_admin"}
                        onChange={(e) => {
                          const newPrivilege = e.target.value;
                          setSelectedUser({
                            ...selectedUser,
                            demo_view_privilege: newPrivilege,
                            manager_stores: newPrivilege === "manager" ? selectedUser.manager_stores || [] : [],
                          });
                        }}
                      >
                        <option value="super_admin">super_admin (Todas las tiendas)</option>
                        <option value="manager">Manager (Tiendas asignadas)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contraseña Fija</label>
                      <input
                        type="text"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={selectedUser.demo_password || ""}
                        onChange={(e) => {
                          setSelectedUser({
                            ...selectedUser,
                            demo_password: e.target.value,
                          });
                        }}
                        placeholder="Ingresa la contraseña fija"
                      />
                    </div>
                  </>
                )}

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

                {(selectedUser.role === "manager" || (selectedUser.role === "demo" && selectedUser.demo_view_privilege === "manager")) && (
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
                                : (selectedUser.manager_stores || []).filter(
                                    (id) => id !== store.id.toString()
                                  );
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

                {selectedUser.role !== "demo" && (
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
                )}
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
                      demo_view_privilege: selectedUser.demo_view_privilege,
                      demo_password: selectedUser.demo_password,
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