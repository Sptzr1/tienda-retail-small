"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function ProductForm({ categories }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    category_id: "",
    type: "",
    stock: "",
    image_url: "",
    store_id: "",
  });

  useEffect(() => {
    async function fetchStores() {
      const supabase = getSupabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        console.error("No authenticated user found");
        return;
      }
      const { data, error } = await supabase
        .from("manager_stores")
        .select("store_id, stores(name)")
        .eq("user_id", user.user.id);

      if (error) {
        console.error("Error fetching stores:", error);
      } else {
        setStores(data.map((s) => ({ id: s.store_id, name: s.stores.name })));
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, store_id: data[0].store_id }));
        }
      }
    }
    fetchStores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.store_id) {
        throw new Error("Por favor selecciona una tienda");
      }

      const productData = {
        ...formData,
        price: Number.parseFloat(formData.price),
        cost: Number.parseFloat(formData.cost),
        stock: Number.parseInt(formData.stock),
        category_id: formData.category_id ? Number.parseInt(formData.category_id) : null,
        store_id: Number.parseInt(formData.store_id),
      };

      console.log("Submitting product data:", productData);

      const supabase = getSupabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error("No authenticated user found");
      }
      console.log("Current user ID:", user.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.user.id)
        .single();
      console.log("User profile:", profile);

      const { data: stores } = await supabase
        .from("manager_stores")
        .select("store_id")
        .eq("user_id", user.user.id);
      console.log("Assigned stores:", stores);

      console.log("Attempting to insert product...");
      const { data, error } = await supabase.from("products").insert([productData]).select();

      if (error) {
        console.error("Insert error details:", error);
        throw error;
      }

      console.log("Insert successful, data:", data);

      setFormData({
        name: "",
        description: "",
        price: "",
        cost: "",
        category_id: "",
        type: "",
        stock: "",
        image_url: "",
        store_id: stores[0]?.id || "",
      });

      router.refresh();
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error al guardar el producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="store_id" className="block text-sm font-medium text-gray-700">
            Tienda
          </label>
          <select
            id="store_id"
            name="store_id"
            required
            value={formData.store_id}
            onChange={handleChange}
            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Seleccionar tienda</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            Categoría
          </label>
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Seleccionar categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Precio
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="price"
              id="price"
              required
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
            Costo
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="cost"
              id="cost"
              required
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={handleChange}
              className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Tipo
          </label>
          <input
            type="text"
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
            Existencias
          </label>
          <input
            type="number"
            name="stock"
            id="stock"
            required
            min="0"
            value={formData.stock}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
            URL de Imagen
          </label>
          <input
            type="text"
            name="image_url"
            id="image_url"
            value={formData.image_url}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="pt-5">
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Producto"}
        </button>
      </div>
    </form>
  );
}
