"use client";

import { useState, useRef } from "react";
import { Minus, Plus, Trash2, Printer } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Cart({ items, updateQuantity, removeItem, clearCart, storeId, storeName }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false); // Estado para el modal
  const [completedOrder, setCompletedOrder] = useState(null);
  const printFrameRef = useRef(null); // Ref para el iframe de impresión

  console.log("Cart received storeId:", storeId);

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate tax (16%)
  const taxRate = 0.16;
  const tax = subtotal * taxRate;

  // Calculate total
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    console.log("handleCheckout - storeId before insertion:", storeId);
    if (!storeId || isNaN(storeId)) {
      console.error("storeId is invalid:", storeId);
      alert("Error: ID de tienda inválido. Por favor, intenta de nuevo.");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowser();

      const saleData = {
        store_id: Number(storeId),
        total_amount: total,
        tax_amount: tax, // Nuevo campo
        status: "completed", // Nuevo campo
        items_count: items.reduce((sum, item) => sum + item.quantity, 0),
        created_by: profile.id,
      };
      console.log("Data sent to Supabase (newsales):", saleData);

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));
      console.log("Data sent to Supabase (sale_items):", saleItems);

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems);

      if (itemsError) throw itemsError;

      for (const item of items) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: item.stock - item.quantity })
          .eq("id", item.id);

        if (stockError) throw stockError;
      }

      setCompletedOrder({
        ...sale,
        items: items.map((item) => ({
          ...item,
          total: item.price * item.quantity,
        })),
        subtotal,
        tax,
        total,
        store: {
          id: storeId,
          name: storeName,
        },
      });

      setShowReceipt(true);
      clearCart();
      router.refresh();
    } catch (error) {
      console.error("Error processing checkout:", error);
      alert("Error al procesar la venta: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!completedOrder || !printFrameRef.current) return;

    const frameWindow = printFrameRef.current.contentWindow;
    frameWindow.document.open();
    frameWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Venta</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 10px; }
            .header { text-align: center; margin-bottom: 10px; }
            .store-name { font-size: 16px; font-weight: bold; }
            .info { margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; text-align: right; margin-top: 10px; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            @media print { @page { size: 80mm auto; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${completedOrder.store.name}</div>
            <div>Recibo de Venta</div>
          </div>
          <div class="info">
            <div>Venta #: ${completedOrder.id}</div>
            <div>Fecha: ${new Date(completedOrder.created_at).toLocaleString()}</div>
          </div>
          <div class="divider"></div>
          <div class="items">
            ${completedOrder.items
              .map((item) => `
                <div class="item">
                  <div>${item.quantity} x ${item.name}</div>
                  <div>$${item.total.toFixed(2)}</div>
                </div>
              `)
              .join("")}
          </div>
          <div class="divider"></div>
          <div class="total">
            Subtotal: $${completedOrder.subtotal.toFixed(2)}<br>
            IVA (16%): $${completedOrder.tax.toFixed(2)}<br>
            TOTAL: $${completedOrder.total.toFixed(2)}
          </div>
          <div class="footer">
            ¡Gracias por su compra!
          </div>
        </body>
      </html>
    `);
    frameWindow.document.close();
    frameWindow.focus();
    frameWindow.print();
  };

  const handleShowPrintModal = () => {
    setShowPrintModal(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCompletedOrder(null);
    setShowPrintModal(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (showReceipt && completedOrder) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recibo</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleShowPrintModal}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={handleCloseReceipt}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Modal para el recibo */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold">{completedOrder.store.name}</h3>
                <p className="text-gray-500 text-sm">Recibo de Venta</p>
                <p className="text-gray-500 text-sm">{new Date(completedOrder.created_at).toLocaleString()}</p>
                <p className="text-gray-500 text-sm">Orden #{completedOrder.id}</p>
              </div>

              <div className="border-t border-b py-2 my-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Producto</th>
                      <th className="text-center py-1">Cant.</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrder.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-1">{item.quantity} x {item.name}</td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-right py-1">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>{formatCurrency(completedOrder.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span>{formatCurrency(completedOrder.total)}</span>
                </div>
              </div>

              <div className="mt-4 text-center text-gray-500 text-xs">
                <p>¡Gracias por su compra!</p>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-md mx-auto bg-white p-6 border rounded-lg">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">{completedOrder.store.name}</h3>
              <p className="text-gray-500 text-sm">Recibo de Venta</p>
              <p className="text-gray-500 text-sm">{new Date(completedOrder.created_at).toLocaleString()}</p>
              <p className="text-gray-500 text-sm">Orden #{completedOrder.id}</p>
            </div>

            <div className="border-t border-b py-4 my-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-center py-2">Cant.</th>
                    <th className="text-right py-2">Precio</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrder.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2">{item.name}</td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2">{formatCurrency(item.price)}</td>
                      <td className="text-right py-2">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(completedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>{formatCurrency(completedOrder.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total:</span>
                <span>{formatCurrency(completedOrder.total)}</span>
              </div>
            </div>

            <div className="mt-8 text-center text-gray-500 text-xs">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Carrito de compra</h2>
      </div>

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>El carrito está vacío</p>
            <p className="text-sm">Agrega productos para comenzar</p>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="p-4 flex items-center">
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-gray-500 text-sm">{formatCurrency(item.price)}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <span className="w-8 text-center">{item.quantity}</span>

                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-full ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-4 bg-gray-50">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%):</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={items.length === 0 || loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Procesando..." : "Completar venta"}
        </button>

        {items.length > 0 && (
          <button
            onClick={clearCart}
            disabled={loading}
            className="w-full mt-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Vaciar carrito
          </button>
        )}
      </div>
    </div>
  );
}