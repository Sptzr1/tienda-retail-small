"use client";
import { useSearchParams } from "next/navigation";
import PosLayout from "@/components/pos/pos-layout";
import { useEffect, useState } from "react";

export default function PosClient({
  initialCategories,
  initialProducts,
  initialStore,
  user,
  initialStoreId,
}) {
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState(initialStoreId);
  const [products, setProducts] = useState(initialProducts);
  const [store, setStore] = useState(initialStore);

  // Actualizar storeId cuando cambien los parámetros de búsqueda
  useEffect(() => {
    const storeParam = searchParams.get("store");
    if (user.is_admin && storeParam) {
      const newStoreId = Number.parseInt(storeParam, 10);
      if (!isNaN(newStoreId) && newStoreId !== storeId) {
        setStoreId(newStoreId);
        // Aquí podrías hacer una nueva consulta a Supabase si necesitas datos actualizados
        // Por ahora, usamos los datos iniciales y asumimos que el cambio de storeId se manejará en el cliente
      }
    }
  }, [searchParams, user.is_admin, storeId]);

  return (
    <PosLayout
      categories={initialCategories}
      products={products}
      store={store}
      user={user}
    />
  );
}