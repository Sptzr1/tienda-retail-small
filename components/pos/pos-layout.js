// components/pos/pos-layout.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductGrid from "./product-grid";
import Cart from "./cart";
import CategoryTabs from "./category-tabs";
import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function PosLayout({ categories, products, store: initialStore, stores, user, modules }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [cart, setCart] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateError, setRateError] = useState(null);
  const [store, setStore] = useState(initialStore);
  const [demoMessage, setDemoMessage] = useState(null);

  const isDemo = user.role === "demo";

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      const supabase = getSupabaseBrowser();

      // Fetch exchange rate
      const { data: rateData, error: rateError } = await supabase
        .from("exchange_rates")
        .select("rate")
        .order("created_at", { ascending: false })
        .limit(1);

      if (rateError || !rateData || rateData.length === 0) {
        console.error("Error fetching exchange rate:", { rateError, rateData });
        setRateError("No se pudo cargar la tasa de cambio. Contacta al administrador.");
      } else {
        const rate = parseFloat(rateData[0].rate);
        setExchangeRate(isNaN(rate) ? null : rate);
      }

      // Use initialStore from props, only fetch if critical data is missing
      if (initialStore.id && (!initialStore.name || Object.keys(initialStore).length < 2)) {
        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", initialStore.id)
          .single();

        if (storeError || !storeData) {
          console.error("Error fetching store:", storeError);
        } else {
          setStore(storeData);
        }
      }
    };

    fetchData(); // Initial fetch
    intervalId = setInterval(fetchData, 60000); // Fetch every minute

    return () => clearInterval(intervalId); // Cleanup
  }, [initialStore]);

  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter((product) => product.category_id === selectedCategory));
    } else {
      setFilteredProducts(products);
    }
  }, [selectedCategory, products]);

  const addToCart = (product) => {
    if (isDemo) {
      setDemoMessage("Usuarios demo no pueden modificar el carrito. Contacta a un super admin para actualizar tu cuenta.");
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (isDemo) {
      setDemoMessage("Usuarios demo no pueden modificar el carrito. Contacta a un super admin para actualizar tu cuenta.");
      return;
    }
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }

      return prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item));
    });
  };

  const removeItem = (productId) => {
    if (isDemo) {
      setDemoMessage("Usuarios demo no pueden modificar el carrito. Contacta a un super admin para actualizar tu cuenta.");
      return;
    }
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    if (isDemo) {
      setDemoMessage("Usuarios demo no pueden modificar el carrito. Contacta a un super admin para actualizar tu cuenta.");
      return;
    }
    setCart([]);
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleStoreChange = (storeId) => {
    router.push(`/?store=${storeId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store?.name || "Punto de Venta"}</h1>
            <p className="text-sm text-gray-500">Usuario: {user?.full_name || "Usuario"} {isDemo && "(Demo)"}</p>
            {stores.length > 1 && (user.role === "super_admin" || user.role === "manager" || user.role === "demo") && (
              <select
                value={store?.id || ""}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="mt-2 border border-gray-300 rounded-md p-1"
              >
                <option value="" disabled>Selecciona una tienda</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex space-x-4">
            <Link
              href="/"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Home className="h-4 w-4 mr-1" />
              Inicio
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {demoMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded">
          <p>{demoMessage}</p>
          <button
            onClick={() => setDemoMessage(null)}
            className="mt-2 text-sm underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          <div className="flex-1 overflow-auto p-4">
            <ProductGrid
              products={filteredProducts}
              addToCart={addToCart}
              exchangeRate={exchangeRate}
              rateError={rateError}
            />
          </div>
        </div>

        <div className="w-full md:w-1/3 bg-white border-t md:border-t-0 md:border-l">
          <Cart
            items={cart}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            clearCart={clearCart}
            storeId={store.id}
            profile={user}
            exchangeRate={exchangeRate}
            rateError={rateError}
          />
        </div>
      </div>
    </div>
  );
}