"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase"

export default function POSSystem({ products, profile, storeId }) {
  const router = useRouter()
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [ticketData, setTicketData] = useState(null)
  const printFrameRef = useRef(null)

  // Filtrar productos por término de búsqueda
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  // Actualizar cantidad de un producto en el carrito
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.id !== productId))
    } else {
      setCart(cart.map((item) => (item.id === productId ? { ...item, quantity } : item)))
    }
  }

  // Eliminar producto del carrito
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  // Calcular total
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  // Procesar venta
  const processSale = async () => {
    if (cart.length === 0) {
      setError("El carrito está vacío")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = getSupabaseBrowser()

      // Crear venta
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            store_id: storeId,
            total_amount: calculateTotal(),
            items_count: cart.reduce((count, item) => count + item.quantity, 0),
            created_by: profile.id,
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      // Crear items de venta
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

      if (itemsError) throw itemsError

      // Actualizar inventario (si existe la tabla)
      try {
        for (const item of cart) {
          await supabase.rpc("update_inventory", {
            p_product_id: item.id,
            p_store_id: storeId,
            p_quantity: -item.quantity,
          })
        }
      } catch (inventoryError) {
        console.error("Error updating inventory:", inventoryError)
        // No interrumpir la venta si hay error en inventario
      }

      // Preparar datos para el ticket
      const ticketInfo = {
        saleId: sale.id,
        date: new Date().toLocaleString(),
        store: profile.stores?.name || "Tienda",
        cashier: profile.full_name,
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
        total: calculateTotal(),
      }

      setTicketData(ticketInfo)
      setMessage("Venta procesada correctamente")
      setCart([])

      // Imprimir ticket automáticamente
      setTimeout(() => {
        printTicket()
      }, 500)
    } catch (error) {
      console.error("Error processing sale:", error)
      setError(error.message || "Error al procesar la venta")
    } finally {
      setLoading(false)
    }
  }

  // Imprimir ticket
  const printTicket = () => {
    if (!ticketData) return

    if (printFrameRef.current) {
      const frameWindow = printFrameRef.current.contentWindow
      frameWindow.document.open()
      frameWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Venta</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                width: 80mm;
                margin: 0;
                padding: 10px;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .store-name {
                font-size: 16px;
                font-weight: bold;
              }
              .info {
                margin-bottom: 10px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .total {
                font-weight: bold;
                text-align: right;
                margin-top: 10px;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 10px;
              }
              @media print {
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="store-name">${ticketData.store}</div>
              <div>Ticket de Venta</div>
            </div>
            
            <div class="info">
              <div>Ticket #: ${ticketData.saleId}</div>
              <div>Fecha: ${ticketData.date}</div>
              <div>Cajero: ${ticketData.cashier}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="items">
              ${ticketData.items
                .map(
                  (item) => `
                <div class="item">
                  <div>${item.quantity} x ${item.name}</div>
                  <div>$${item.subtotal.toFixed(2)}</div>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="divider"></div>
            
            <div class="total">
              TOTAL: $${ticketData.total.toFixed(2)}
            </div>
            
            <div class="footer">
              ¡Gracias por su compra!
            </div>
          </body>
        </html>
      `)
      frameWindow.document.close()
      frameWindow.focus()
      frameWindow.print()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Productos */}
        <div className="lg:w-2/3">
          <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Productos</h2>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos por nombre, SKU o código de barras"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.length === 0 ? (
                <p className="text-gray-500 col-span-full text-center py-4">No se encontraron productos</p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => addToCart(product)}
                  >
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-gray-500 text-sm mb-2">{product.sku || product.barcode || "Sin código"}</p>
                    <p className="text-blue-600 font-bold">${product.price.toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="lg:w-1/3">
          <div className="bg-white shadow-sm rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Carrito</h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">El carrito está vacío</p>
            ) : (
              <div className="space-y-4 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-gray-500 text-sm">${item.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 bg-gray-200 rounded-l-md"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 bg-gray-100">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 bg-gray-200 rounded-r-md"
                      >
                        +
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold mb-4">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>

              <button
                onClick={processSale}
                disabled={loading || cart.length === 0}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Procesar Venta"}
              </button>

              {ticketData && (
                <button
                  onClick={printTicket}
                  className="w-full mt-2 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Reimprimir Ticket
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {message && (
              <div className="mt-4 bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Frame oculto para impresión */}
      <iframe ref={printFrameRef} style={{ display: "none" }} title="Ticket de impresión" />
    </div>
  )
}

