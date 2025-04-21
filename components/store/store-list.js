"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Pencil, Plus, Trash2, CheckCircle } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function StoreList({ stores, role }) {
  const [storeList, setStoreList] = useState(stores);
  const [editingStore, setEditingStore] = useState(null);
  const [newName, setNewName] = useState("");
  const [addingStore, setAddingStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [deletingStore, setDeletingStore] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState(null);

  const handleEditClick = (store) => {
    setEditingStore(store.id);
    setNewName(store.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingStore(null);
    setNewName("");
    setError(null);
  };

  const handleSaveEdit = async (storeId) => {
    if (!newName.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    const supabase = getSupabaseBrowser();
    const { error: updateError } = await supabase
      .from("stores")
      .update({ name: newName.trim() })
      .eq("id", storeId);

    if (updateError) {
      console.error("Error updating store:", updateError);
      setError("Error al actualizar el nombre: " + updateError.message);
      return;
    }

    setStoreList((prev) =>
      prev.map((store) =>
        store.id === storeId ? { ...store, name: newName.trim() } : store
      )
    );
    setEditingStore(null);
    setNewName("");
    setError(null);
  };

  const handleAddStoreClick = () => {
    setAddingStore(true);
    setNewStoreName("");
    setNewStoreAddress("");
    setError(null);
  };

  const handleCancelAdd = () => {
    setAddingStore(false);
    setNewStoreName("");
    setNewStoreAddress("");
    setError(null);
  };

  const handleSaveAdd = async () => {
    if (!newStoreName.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    const supabase = getSupabaseBrowser();
    const { data: newStore, error: insertError } = await supabase
      .from("stores")
      .insert([{ name: newStoreName.trim(), address: newStoreAddress.trim() || null }])
      .select()
      .single();

    if (insertError) {
      console.error("Error adding store:", insertError);
      setError("Error al agregar la tienda: " + insertError.message);
      return;
    }

    setStoreList((prev) => [...prev, newStore]);
    setAddingStore(false);
    setNewStoreName("");
    setNewStoreAddress("");
    setError(null);
  };

  const handleDeleteClick = async (store) => {
    const supabase = getSupabaseBrowser();
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .limit(1);

    if (productError) {
      console.error("Error checking products:", productError);
      setError("Error al verificar productos: " + productError.message);
      return;
    }

    setDeletingStore({ ...store, hasProducts: products.length > 0 });
    setDeleteConfirmText("");
    setError(null);
  };

  const handleCancelDelete = () => {
    setDeletingStore(null);
    setDeleteConfirmText("");
    setError(null);
  };

  const handleEnableStore = async (storeId) => {
    const supabase = getSupabaseBrowser();
    const { error: enableError } = await supabase
      .from("stores")
      .update({ is_active: true, disabled_at: null })
      .eq("id", storeId);

    if (enableError) {
      console.error("Error enabling store:", enableError);
      setError("Error al habilitar la tienda: " + enableError.message);
      return;
    }

    setStoreList((prev) =>
      prev.map((store) =>
        store.id === storeId ? { ...store, is_active: true, disabled_at: null } : store
      )
    );
    setError(null);
  };

  const handleDisableStore = async (storeId) => {
    const supabase = getSupabaseBrowser();
    const { error: disableError } = await supabase
      .from("stores")
      .update({ is_active: false, disabled_at: new Date().toISOString() })
      .eq("id", storeId);

    if (disableError) {
      console.error("Error disabling store:", disableError);
      setError("Error al inhabilitar la tienda: " + disableError.message);
      return;
    }

    setStoreList((prev) =>
      prev.map((store) =>
        store.id === storeId
          ? { ...store, is_active: false, disabled_at: new Date().toISOString() }
          : store
      )
    );
    setDeletingStore(null);
    setDeleteConfirmText("");
    setError(null);
  };

  const handleDeleteStore = async (storeId, hasProducts) => {
    if (hasProducts && deleteConfirmText !== "BORRADO TOTAL") {
      setError("Debes escribir 'BORRADO TOTAL' para confirmar el borrado definitivo");
      return;
    }

    const supabase = getSupabaseBrowser();

    if (hasProducts) {
      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .eq("store_id", storeId);

      if (productsError) {
        console.error("Error deleting products:", productsError);
        setError("Error al borrar productos: " + productsError.message);
        return;
      }
    }

    const { error: profilesError } = await supabase
      .from("profiles")
      .update({ store_id: null })
      .eq("store_id", storeId);

    if (profilesError) {
      console.error("Error updating profiles:", profilesError);
      setError("Error al actualizar usuarios: " + profilesError.message);
      return;
    }

    const { error: managersError } = await supabase
      .from("manager_stores")
      .delete()
      .eq("store_id", storeId);

    if (managersError) {
      console.error("Error deleting manager assignments:", managersError);
      setError("Error al borrar asignaciones de gerentes: " + managersError.message);
      return;
    }

    const { error: storeError } = await supabase
      .from("stores")
      .delete()
      .eq("id", storeId);

    if (storeError) {
      console.error("Error deleting store:", storeError);
      setError("Error al borrar la tienda: " + storeError.message);
      return;
    }

    setStoreList((prev) => prev.filter((store) => store.id !== storeId));
    setDeletingStore(null);
    setDeleteConfirmText("");
    setError(null);
  };

  const isPermanentDeleteEligible = (store) => {
    if (!store.disabled_at || store.is_active) return false;
    const disabledDate = new Date(store.disabled_at);
    const now = new Date();
    const daysDiff = (now - disabledDate) / (1000 * 60 * 60 * 24);
    return daysDiff >= 3;
  };

  const getTimeRemaining = (disabledAt) => {
    const disabledDate = new Date(disabledAt);
    const endDate = new Date(disabledDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const msRemaining = endDate - now;

    if (msRemaining <= 0) return "0 minutos";

    const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    let parts = [];
    if (days > 0) parts.push(`${days} día${days !== 1 ? "s" : ""}`);
    if (hours > 0) parts.push(`${hours} hora${hours !== 1 ? "s" : ""}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minuto${minutes !== 1 ? "s" : ""}`);

    return parts.join(", ");
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {storeList.map((store) => (
        <div key={store.id} className="relative">
          <div
            className={`block p-6 bg-white rounded-lg shadow-md transition-shadow ${
              store.is_active ? "hover:shadow-lg" : "bg-gray-100 opacity-75"
            }`}
          >
            {store.is_active ? (
              <Link href={`/pos?store=${store.id}`} className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold">{store.name}</h2>
                  <p className="mt-1 text-gray-600">Punto de Venta</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-gray-200 text-gray-600">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-500">{store.name}</h2>
                  <p className="mt-1 text-gray-400">Tienda inhabilitada</p>
                </div>
              </div>
            )}
          </div>
          {role === "superadmin" && (
            <div className="absolute top-2 right-2 flex space-x-2">
              {!store.is_active && (
                <button
                  onClick={() => handleEnableStore(store.id)}
                  className="p-1 text-green-500 hover:text-green-700"
                  aria-label={`Habilitar ${store.name}`}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => handleEditClick(store)}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label={`Editar nombre de ${store.name}`}
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteClick(store)}
                className="p-1 text-red-500 hover:text-red-700"
                aria-label={`${store.is_active ? "Inhabilitar" : "Borrar"} ${store.name}`}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
          {editingStore === store.id && (
            <div className="absolute inset-0 bg-white bg-opacity-95 p-6 flex flex-col justify-center rounded-lg shadow-lg">
              <label htmlFor="edit-name" className="text-sm font-medium text-gray-700 mb-1">
                Nombre de la tienda
              </label>
              <input
                id="edit-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nuevo nombre"
              />
              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveEdit(store.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      {role === "superadmin" && (
        <div className="relative">
          <button
            onClick={handleAddStoreClick}
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow w-full"
            aria-label="Agregar nueva tienda"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Plus className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold">Agregar Tienda</h2>
                <p className="mt-1 text-gray-600">Crear una nueva tienda</p>
              </div>
            </div>
          </button>
          {addingStore && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva Tienda</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="store-name" className="text-sm font-medium text-gray-700">
                      Nombre
                    </label>
                    <input
                      id="store-name"
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre de la tienda"
                    />
                  </div>
                  <div>
                    <label htmlFor="store-address" className="text-sm font-medium text-gray-700">
                      Dirección
                    </label>
                    <input
                      id="store-address"
                      type="text"
                      value={newStoreAddress}
                      onChange={(e) => setNewStoreAddress(e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dirección de la tienda"
                    />
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={handleCancelAdd}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveAdd}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {deletingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            {deletingStore.hasProducts && deletingStore.is_active ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Inhabilitar {deletingStore.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  ¿Estás seguro de inhabilitar {deletingStore.name}? Los productos quedarán inaccesibles hasta que la tienda sea reactivada.
                </p>
                {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDisableStore(deletingStore.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Inhabilitar
                  </button>
                </div>
              </>
            ) : !deletingStore.is_active && !isPermanentDeleteEligible(deletingStore) ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  No se puede borrar {deletingStore.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  Aún no puedes borrar esta tienda. Tiempo restante: {getTimeRemaining(deletingStore.disabled_at)}.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700"
                  >
                    Aceptar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Borrar Definitivamente {deletingStore.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {deletingStore.hasProducts
                    ? `El borrado de ${deletingStore.name} será definitivo y eliminará todos los productos asociados. Escribe "BORRADO TOTAL" para confirmar.`
                    : `¿Estás seguro de borrar ${deletingStore.name}? Esta acción no se puede deshacer.`}
                </p>
                {deletingStore.hasProducts && (
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:ring-red-500 focus:border-red-500"
                    placeholder="Escribe BORRADO TOTAL"
                  />
                )}
                {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteStore(deletingStore.id, deletingStore.hasProducts)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Confirmar Borrado
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}