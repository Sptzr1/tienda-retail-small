export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, created_at, store, items, subtotal_bsd, tax_bsd, total_bsd, payment_method } = req.body;

  try {
    // Simulate printing logic (replace with actual printer integration)
    const ticketContent = `
      ${store.name}
      Recibo de Venta
      Fecha: ${new Date(created_at).toLocaleString()}
      Orden #${id}
      
      --------------------------------
      Producto        Cant.    Total (Bs.D)
      --------------------------------
      ${items
        .map(
          (item) => `${item.quantity} x ${item.name.padEnd(20)} ${item.total_bsd.toFixed(2)}`
        )
        .join("\n")}
      --------------------------------
      Subtotal: ${subtotal_bsd.toFixed(2)}
      Total: ${total_bsd.toFixed(2)}
      Método de pago: ${payment_method}
      
      ¡Gracias por su compra!
    `;

    // Example: Log to console (replace with actual print logic)
    console.log("Printing ticket:\n", ticketContent);

    // Simulate success
    return res.status(200).json({ message: "Ticket printed successfully" });
  } catch (error) {
    console.error("Error in print-ticket:", error);
    return res.status(500).json({ error: error.message });
  }
}