"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductGrid from "./product-grid";
import Cart from "./cart";
import CategoryTabs from "./category-tabs";
import { Home, LogOut } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function PosLayout({ categories, products, store: initialStore, stores, user, modules, isDemo }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [cart, setCart] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rateError, setRateError] = useState(null);
  const [store, setStore] = useState(initialStore);
  const [demoMessage, setDemoMessage] = useState(null);

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
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    if (isDemo) {
      setDemoMessage("Producto añadido al carrito en modo demo. La venta no se guardará en la base de datos.");
      setTimeout(() => setDemoMessage(null), 3000); // Clear message after 3 seconds
    }
  };

  const updateQuantity = (productId, quantity) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.id !== productId);
      }
      return prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item));
    });
    if (isDemo) {
      setDemoMessage("Cantidad actualizada en modo demo. La venta no se guardará en la base de datos.");
      setTimeout(() => setDemoMessage(null), 3000);
    }
  };

  const removeItem = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    if (isDemo) {
      setDemoMessage("Producto eliminado del carrito en modo demo.");
      setTimeout(() => setDemoMessage(null), 3000);
    }
  };

  const clearCart = () => {
    setCart([]);
    setTicket(null);
    if (isDemo) {
      setDemoMessage("Carrito limpiado en modo demo.");
      setTimeout(() => setDemoMessage(null), 3000);
    }
  };

  const completeSale = async () => {
    if (isDemo) {
      // Generate dummy ticket for demo users
      const taxRate = 0.16;
      const dummyProducts = cart.length > 0
        ? cart.map((item) => {
            const total_usd = item.price * item.quantity;
            const subtotal_usd = total_usd / (1 + taxRate);
            const tax_usd = total_usd - subtotal_usd;
            return {
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total_usd,
              subtotal_usd,
              tax_usd,
              total_bsd: exchangeRate ? total_usd * exchangeRate : null,
              subtotal_bsd: exchangeRate ? subtotal_usd * exchangeRate : null,
              tax_bsd: exchangeRate ? tax_usd * exchangeRate : null,
            };
          })
        : [{
            id: "generic",
            name: "Producto Genérico",
            price: 10.00,
            quantity: 1,
            total_usd: 10.00,
            subtotal_usd: 10.00 / (1 + taxRate),
            tax_usd: 10.00 - (10.00 / (1 + taxRate)),
            total_bsd: exchangeRate ? 10.00 * exchangeRate : null,
            subtotal_bsd: exchangeRate ? (10.00 / (1 + taxRate)) * exchangeRate : null,
            tax_bsd: exchangeRate ? (10.00 - (10.00 / (1 + taxRate))) * exchangeRate : null,
          }];

      const subtotal_usd = dummyProducts.reduce((sum, item) => sum + item.subtotal_usd, 0);
      const tax_usd = dummyProducts.reduce((sum, item) => sum + item.tax_usd, 0);
      const total_usd = dummyProducts.reduce((sum, item) => sum + item.total_usd, 0);
      const subtotal_bsd = exchangeRate ? subtotal_usd * exchangeRate : null;
      const tax_bsd = exchangeRate ? tax_usd * exchangeRate : null;
      const total_bsd = exchangeRate ? total_usd * exchangeRate : null;

      const dummyTicket = {
        ticket_id: `DEMO-${Date.now()}`,
        store: { id: store.id, name: store.name },
        products: dummyProducts,
        subtotal_usd,
        tax_usd,
        total_usd,
        subtotal_bsd,
        tax_bsd,
        total_bsd,
        timestamp: new Date().toISOString(),
      };

      setTicket(dummyTicket);
      setCart([]); // Clear cart
      setDemoMessage("Venta simulada completada. Ticket generado en modo demo.");
      setTimeout(() => setDemoMessage(null), 5000);
      return;
    }

    // Normal sale process (blocked by RLS for demo users)
    try {
      const supabase = getSupabaseBrowser();
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          store_id: store.id,
          user_id: user.id,
          total_amount: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
          tax_amount: cart.reduce((sum, item) => sum + ((item.price * item.quantity) - ((item.price * item.quantity) / (1 + 0.16))), 0),
          items: cart.map((item) => ({
            product_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        })
        .select()
        .single();

      if (error) throw error;

      const ticketData = {
        ticket_id: sale.id,
        store: { id: store.id, name: store.name },
        products: sale.items,
        subtotal_usd: sale.items.reduce((sum, item) => sum + ((item.price * item.quantity) / (1 + 0.16)), 0),
        tax_usd: sale.items.reduce((sum, item) => sum + ((item.price * item.quantity) - ((item.price * item.quantity) / (1 + 0.16))), 0),
        total_usd: sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        subtotal_bsd: exchangeRate ? sale.items.reduce((sum, item) => sum + ((item.price * item.quantity) / (1 + 0.16)), 0) * exchangeRate : null,
        tax_bsd: exchangeRate ? sale.items.reduce((sum, item) => sum + ((item.price * item.quantity) - ((item.price * item.quantity) / (1 + 0.16))), 0) * exchangeRate : null,
        total_bsd: exchangeRate ? sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * exchangeRate : null,
        timestamp: sale.created_at,
      };

      setTicket(ticketData);
      setCart([]);
    } catch (error) {
      console.error("Error completing sale:", error);
      setDemoMessage("Error al completar la venta. Contacta al administrador.");
    }
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
    router.push(`/pos?store=${storeId}`);
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
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 m-4 rounded">
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
            completeSale={completeSale}
            ticket={ticket}
            storeId={store.id}
            profile={user}
            exchangeRate={exchangeRate}
            rateError={rateError}
            isDemo={isDemo}
          />
        </div>
      </div>
    </div>
  );
}