import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
import { OfflineProvider } from "@/context/OfflineContext";

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
        <Script
          id="sw-register"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (!('serviceWorker' in navigator)) return;
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
                    try { reg.update(); } catch (e) {}
                    navigator.serviceWorker.ready.then(function () {
                      if (navigator.serviceWorker.controller) return;
                      try {
                        var key = 'sw_reload_once';
                        if (sessionStorage.getItem(key) === '1') return;
                        sessionStorage.setItem(key, '1');
                        location.reload();
                      } catch (e) {}
                    }).catch(function () {});
                  }).catch(function () {});
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <PWAProvider>
          <OfflineProvider>
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
          </OfflineProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
