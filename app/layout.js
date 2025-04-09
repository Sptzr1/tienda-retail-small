import { Inter } from "next/font/google"
import "./globals.css"
import SessionManager from "@/components/session/session-manager"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Mi Tienda - Sistema POS",
  description: "Sistema de punto de venta e inventario",
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <SessionManager />
      </body>
    </html>
  )
}