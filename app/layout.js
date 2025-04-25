// app/layout.js
import { Inter } from "next/font/google";
import "./globals.css";
import SessionManagerComponent from "@/components/session/session-manager";
import { SessionProvider } from "@/lib/session-context";
import { ProfileProvider } from "@/lib/profile-context";
import { memo } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mi Tienda - Sistema POS",
  description: "Sistema de punto de venta e inventario",
};

function RootLayout({ children }) {
  console.log("RootLayout rendered:", new Date().toISOString());
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <ProfileProvider>
            <SessionManagerComponent>{children}</SessionManagerComponent>
          </ProfileProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

export default memo(RootLayout);