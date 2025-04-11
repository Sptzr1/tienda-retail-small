// app/api/print-ticket/route.js
import escpos from "escpos";
import escposNetwork from "escpos-network";

export async function POST(req) {
  try {
    const order = await req.json();

    const device = new escposNetwork("192.168.10.43", 9100); // Reemplaza con la IP y puerto de tu impresora
    const printer = new escpos.Printer(device);

    await device.open();
    printer
      .font("a")
      .align("ct")
      .style("bu")
      .size(1, 1)
      .text(order.store.name)
      .text("Recibo de Venta")
      .size(0, 0)
      .style("normal")
      .text(`Venta #: ${order.id}`)
      .text(`Fecha: ${new Date(order.created_at).toLocaleString()}`)
      .feed()
      .text("----------------------------------------");

    order.items.forEach((item) => {
      printer
        .align("lt")
        .text(`${item.quantity} x ${item.name}`)
        .align("rt")
        .text(`$${item.total.toFixed(2)}`);
    });

    printer
      .align("ct")
      .text("----------------------------------------")
      .align("rt")
      .text(`Subtotal: $${order.subtotal.toFixed(2)}`)
      .text(`IVA (16%): $${order.tax.toFixed(2)}`)
      .text(`TOTAL: $${order.total.toFixed(2)}`)
      .feed(2)
      .align("ct")
      .text("¡Gracias por su compra!")
      .feed()
      .cut()
      .close();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error printing ticket:", error);
    return new Response(JSON.stringify({ error: "Failed to print ticket", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}