import { Inter } from "next/font/google";
import "./globals.css";
import SessionManagerComponent from "@/components/session/session-manager";
import { SessionProvider } from "@/lib/session-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mi Tienda - Sistema POS",
  description: "Sistema de punto de venta e inventario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <SessionManagerComponent>{children}</SessionManagerComponent>
        </SessionProvider>
      </body>
    </html>
  );
}