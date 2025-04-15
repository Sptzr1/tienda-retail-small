"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Pencil } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function StoreList({ stores, role }) {
  const [storeList, setStoreList] = useState(stores);
  const [editingStore, setEditingStore] = useState(null);
  const [newName, setNewName] = useState("");
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

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {storeList.map((store) => (
        <div key={store.id} className="relative">
          <Link
            href={`/pos?store=${store.id}`}
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold">{store.name}</h2>
                <p className="mt-1 text-gray-600">Punto de Venta</p>
              </div>
            </div>
          </Link>
          {role === "superadmin" && (
            <button
              onClick={() => handleEditClick(store)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
              aria-label={`Editar nombre de ${store.name}`}
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}
          {editingStore === store.id && (
            <div className="absolute inset-0 bg-white bg-opacity-90 p-4 flex flex-col justify-center rounded-lg">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border rounded-md mb-2"
                placeholder="Nuevo nombre"
              />
              {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveEdit(store.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}