"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ProductGrid from "./product-grid"
import Cart from "./cart"
import CategoryTabs from "./category-tabs"
import { Home, LogOut } from "lucide-react"
import Link from "next/link"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function PosLayout({ categories, products, store, user }) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [filteredProducts, setFilteredProducts] = useState(products)
  const [cart, setCart] = useState([])

  // Filter products when category changes
  useEffect(() => {
    if (selectedCategory) {
      setFilteredProducts(products.filter((product) => product.category_id === selectedCategory))
    } else {
      setFilteredProducts(products)
    }
  }, [selectedCategory, products])

  // Add product to cart
  const addToCart = (product) => {
    setCart((prevCart) => {
      // Check if product is already in cart
      const existingItem = prevCart.find((item) => item.id === product.id)

      if (existingItem) {
        // Increase quantity if already in cart
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        // Add new item to cart
        return [...prevCart, { ...product, quantity: 1 }]
      }
    })
  }

  // Update cart item quantity
  const updateQuantity = (productId, quantity) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        return prevCart.filter((item) => item.id !== productId)
      }

      // Update quantity
      return prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item))
    })
  }

  // Remove item from cart
  const removeItem = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowser()
      await supabase.auth.signOut()
      router.push("/auth/login")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{store?.name || "Punto de Venta"}</h1>
            <p className="text-sm text-gray-500">Usuario: {user?.full_name || "Usuario"}</p>
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Product selection area */}
        <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />

          <div className="flex-1 overflow-auto p-4">
            <ProductGrid products={filteredProducts} addToCart={addToCart} />
          </div>
        </div>

        {/* Cart area */}
        <div className="w-full md:w-1/3 bg-white border-t md:border-t-0 md:border-l">
          <Cart
            items={cart}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            clearCart={clearCart}
            storeId={store.id}
            storeName={store?.name}
          />
        </div>
      </div>
    </div>
  )
}

