import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { headers } from "next/headers";

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
import DemoModeBanner from "@/components/DemoModeBanner";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/shop/CartSidebar";
import { PWAProvider } from "@/context/PWAContext";
import { OfflineProvider } from "@/context/OfflineContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = headers();
  const rawHost =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    "";
  const host = rawHost.split(",")[0]?.trim().split(":")[0]?.toLowerCase() || "";
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "";
  const isStockHost = host === "aksjer.lekbie.no" || host.startsWith("aksjer.");
  const isStagingHost =
    appEnv === "staging" ||
    process.env.VERCEL_ENV === "preview" ||
    host === "staging.lekbie.no" ||
    host.endsWith(".staging.lekbie.no") ||
    host.startsWith("staging.") ||
    host.includes("lek-biens-vokter-staging") ||
    host.includes("-staging.");
  const isProdTest = appEnv === "prod-test";
  const isDemoEnabled =
    process.env.LEK_DEMO_ENABLED === "1" ||
    process.env.LEK_DEMO_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === "true";
  const shortCommitHash =
    process.env.NEXT_PUBLIC_BUILD_REVISION?.slice(0, 7) ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    "ukjent";

  return (
    <html lang="no">
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <Script
          id="polyfill-at"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (!String.prototype.at) {
                    String.prototype.at = function (index) {
                      index = Math.trunc(index) || 0;
                      if (index < 0) index += this.length;
                      if (index < 0 || index >= this.length) return undefined;
                      return this[index];
                    };
                  }
                  if (!Array.prototype.at) {
                    Array.prototype.at = function (index) {
                      index = Math.trunc(index) || 0;
                      if (index < 0) index += this.length;
                      if (index < 0 || index >= this.length) return undefined;
                      return this[index];
                    };
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {isStockHost ? null : (
          <Script
            id="sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  try {
                    if (!('serviceWorker' in navigator)) return;
                    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
                      try { reg.update(); } catch (e) {}
                    }).catch(function () {});
                  } catch (e) {}
                })();
              `,
            }}
          />
        )}
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        {isStockHost ? (
          children
        ) : (
          <PWAProvider>
            <OfflineProvider>
              <CartProvider>
                {isProdTest ? (
                  <div className="print:hidden bg-red-600 text-white text-xs font-semibold text-center py-1">
                    PROD
                  </div>
                ) : isStagingHost ? (
                  <div className="print:hidden bg-red-600 text-white text-[11px] font-semibold text-center py-1">
                    TESTMILJØ · {shortCommitHash}
                  </div>
                ) : null}
                <DesktopNav />
                <CartSidebar />

                <MainLayout>
                  <Header isStagingHost={isStagingHost} />
                  <DemoModeBanner isDemoAllowed={isStagingHost || isDemoEnabled} isStagingHost={isStagingHost} />
                  {children}
                </MainLayout>

                <div className="md:hidden print:hidden">
                  <BottomNav />
                </div>

                <footer className="py-4 text-center text-xs text-gray-400 pb-20 md:pl-64 print:hidden">
                  v0.1.2
                </footer>
              </CartProvider>
            </OfflineProvider>
          </PWAProvider>
        )}
      </body>
    </html>
  );
}
