"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function ProductList({ products, exchangeRate, isDemo }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    setDeleting(id);

    try {
      const supabase = await import("@/lib/supabase").then((m) => m.getSupabaseBrowser());
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error al eliminar el producto: " + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    if (currency === "VES") {
      return new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency: "VES",
        minimumFractionDigits: 2,
      }).format(amount);
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="mt-4 flex flex-col">
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
                    Producto
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Categoría
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Precio (USD/Bs.D)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Costo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Stock
                  </th>
                  {!isDemo && (
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isDemo ? 5 : 6}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No hay productos registrados
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url && (
                            <div className="flex-shrink-0 h-10 w-10 mr-4">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={product.image_url || "/placeholder.svg"}
                                alt=""
                              />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.type && <div className="text-sm text-gray-500">{product.type}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.categories?.name || "Sin categoría"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.price)}
                          {exchangeRate ? (
                            <span> / {formatCurrency(product.price * exchangeRate, "VES")}</span>
                          ) : (
                            <span> / Bs.D no disponible</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(product.cost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.stock}</div>
                      </td>
                      {!isDemo && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {isDemo && (
        <p className="mt-4 text-sm text-blue-600">
          Usuarios demo no pueden eliminar productos.
        </p>
      )}
    </div>
  );
}