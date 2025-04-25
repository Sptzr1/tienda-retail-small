/* "use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function SalesReport({ profile, stores }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    storeId: profile?.is_admin ? "" : profile?.stores?.id?.toString() || "",
  });
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalAmount: 0,
    averageAmount: 0,
  });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();

      // Construir la consulta con todos los filtros antes de ejecutarla
      let query = supabase
        .from("sales")
        .select(`
          *,
          stores!fk_store_id(*),
          profiles!fk_created_by(full_name)
        `)
        .gte("created_at", `${filters.startDate}T00:00:00Z`) // Asegurar formato UTC
        .lte("created_at", `${filters.endDate}T23:59:59.999Z`) // Cubrir todo el día
        .order("created_at", { ascending: false });

      // Aplicar filtro de tienda según el rol
      if (filters.storeId) {
        query = query.eq("store_id", filters.storeId);
      } else if (!profile?.is_admin) {
        query = query.eq("store_id", profile.stores?.id);
      }

      // Ejecutar la consulta una sola vez
      const { data, error } = await query;
      if (error) throw error;

      console.log("Sales data fetched:", data);
      console.log("Filters applied:", filters);
      console.log("Profile:", profile);

      setSalesData(data || []);

      if (data && data.length > 0) {
        const totalAmount = data.reduce((sum, sale) => sum + sale.total_amount, 0);
        setSummary({
          totalSales: data.length,
          totalAmount,
          averageAmount: totalAmount / data.length,
        });
      } else {
        setSummary({
          totalSales: 0,
          totalAmount: 0,
          averageAmount: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setError(error.message || "Error al cargar los datos de ventas");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchSalesData();
  };

  return (
    <div>
      <form onSubmit={handleApplyFilters} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Fecha Inicio
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              Fecha Fin
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {profile?.is_admin && (
            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">
                Tienda
              </label>
              <select
                id="storeId"
                name="storeId"
                value={filters.storeId}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todas las tiendas</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Aplicar Filtros"}
            </button>
          </div>
        </div>
      </form> */
"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function SalesReport({ profile, stores }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    storeId: profile.role === "super_admin" ? "" : profile.store_id?.toString() || "",
  });
  const [summary, setSummary] = useState({ totalSales: 0, totalAmount: 0, averageAmount: 0 });

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowser();
      let query = supabase
        .from("sales")
        .select(`
          *,
          stores!fk_store_id(*),
          profiles!fk_created_by(full_name)
        `)
        .gte("created_at", `${filters.startDate}T00:00:00Z`)
        .lte("created_at", `${filters.endDate}T23:59:59.999Z`)
        .order("created_at", { ascending: false });

      if (profile.role === "super_admin") {
        if (filters.storeId) query = query.eq("store_id", filters.storeId);
      } else if (profile.role === "manager") {
        const { data: assignedStores } = await supabase
          .from("manager_stores")
          .select("store_id")
          .eq("user_id", profile.id);
        const storeIds = assignedStores.map((s) => s.store_id);
        query = query.in("store_id", storeIds);
        if (filters.storeId) query = query.eq("store_id", filters.storeId);
      } else {
        query = query.eq("store_id", profile.store_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSalesData(data || []);
      console.log("Sales data:", data);

      if (data && data.length > 0) {
        const totalAmount = data.reduce((sum, sale) => sum + sale.total_amount, 0);
        setSummary({
          totalSales: data.length,
          totalAmount,
          averageAmount: totalAmount / data.length,
        });
      } else {
        setSummary({ totalSales: 0, totalAmount: 0, averageAmount: 0 });
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setError(error.message || "Error al cargar los datos de ventas");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchSalesData();
  };

  return (
    <div>
      <form onSubmit={handleApplyFilters} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha Fin</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {(profile.role === "super_admin" || profile.role === "manager") && (
            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">Tienda</label>
              <select
                id="storeId"
                name="storeId"
                value={filters.storeId}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Todas las tiendas</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Aplicar Filtros"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total de Ventas</h3>
          <p className="text-2xl font-bold text-blue-900">{summary.totalSales}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-green-800 mb-1">Monto Total</h3>
          <p className="text-2xl font-bold text-green-900">${summary.totalAmount.toFixed(2)}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Promedio por Venta</h3>
          <p className="text-2xl font-bold text-purple-900">${summary.averageAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Fecha
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tienda
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Cajero
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Items
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesData.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron ventas en el período seleccionado
                </td>
              </tr>
            ) : (
              salesData.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.stores?.name || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.profiles?.full_name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.items_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    ${sale.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
