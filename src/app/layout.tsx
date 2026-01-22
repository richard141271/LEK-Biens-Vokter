import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Birøkter-revolusjonen",
  description: "Fremtidens plattform for birøktere",
  manifest: "/manifest.json",
  themeColor: "#F79009",
};

export const viewport = {
  themeColor: "#F79009",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Header from "@/components/Header";
import ErrorBoundary from "@/components/ErrorBoundary";

import MainLayout from "@/components/MainLayout";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/shop/CartSidebar";
import { PWAProvider } from "@/context/PWAContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <PWAProvider>
          <CartProvider>
            <DesktopNav />
            <CartSidebar />
            
            <MainLayout>
              <Header />
              {children}
            </MainLayout>
            
            <div className="md:hidden print:hidden">
              <BottomNav />
            </div>
            
            <footer className="py-4 text-center text-xs text-gray-400 pb-20 md:pl-64 print:hidden">
              v0.1.0
            </footer>
          </CartProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
