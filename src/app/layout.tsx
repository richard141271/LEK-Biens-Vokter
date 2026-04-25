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
  const isStockHost = host === "aksjer.lekbie.no" || host.startsWith("aksjer.");
  const isStagingHost =
    process.env.VERCEL_ENV === "preview" ||
    host === "staging.lekbie.no" ||
    host.endsWith(".staging.lekbie.no") ||
    host.startsWith("staging.") ||
    host.includes("lek-biens-vokter-staging") ||
    host.includes("-staging.");
  const isDemoEnabled =
    process.env.LEK_DEMO_ENABLED === "1" ||
    process.env.LEK_DEMO_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === "true";

  return (
    <html lang="no">
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        {isStockHost ? null : (
          <Script
            id="sw-register"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  try {
                    if (!('serviceWorker' in navigator)) return;
                    var marker = '__sw_reload=1';
                    var url = new URL(location.href);
                    if (navigator.serviceWorker.controller && url.searchParams.has('__sw_reload')) {
                      url.searchParams.delete('__sw_reload');
                      history.replaceState(null, '', url.toString());
                    }

                    function hardReloadOnce() {
                      try {
                        if (sessionStorage.getItem('__sw_hard_reload_done') === '1') return;
                        sessionStorage.setItem('__sw_hard_reload_done', '1');
                      } catch (e) {}
                      var u = new URL(location.href);
                      if (u.searchParams.get('__sw_reload') === '1') return;
                      u.searchParams.set('__sw_reload', '1');
                      location.replace(u.toString());
                    }

                    function selfHealAndReload() {
                      try {
                        try {
                          if (sessionStorage.getItem('__sw_self_heal_done') === '1') return;
                          sessionStorage.setItem('__sw_self_heal_done', '1');
                        } catch (e) {}
                        Promise.all([
                          navigator.serviceWorker.getRegistrations().then(function (regs) {
                            return Promise.all(regs.map(function (r) { return r.unregister(); }));
                          }),
                          (self.caches && caches.keys
                            ? caches.keys().then(function (keys) {
                                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                              })
                            : Promise.resolve())
                        ]).finally(function () {
                          navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
                            try { reg.update(); } catch (e) {}
                            navigator.serviceWorker.ready.then(function () {
                              hardReloadOnce();
                            }).catch(function () {});
                          }).catch(function () {});
                        });
                      } catch (e) {
                        hardReloadOnce();
                      }
                    }

                    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (reg) {
                      try { reg.update(); } catch (e) {}

                      setTimeout(function () {
                        try {
                          if (navigator.serviceWorker.controller) return;
                          if (url.searchParams.get('__sw_reload') === '1') {
                            selfHealAndReload();
                            return;
                          }
                          hardReloadOnce();
                        } catch (e) {}
                      }, 2500);

                      navigator.serviceWorker.ready.then(function () {
                        if (navigator.serviceWorker.controller) return;
                        setTimeout(function () {
                          if (navigator.serviceWorker.controller) return;
                          if (url.searchParams.get('__sw_reload') === '1') {
                            selfHealAndReload();
                            return;
                          }
                          hardReloadOnce();
                        }, 1200);
                      }).catch(function () {});
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
                {isStagingHost ? (
                  <div className="hidden md:block print:hidden bg-red-600 text-white text-xs font-semibold text-center py-1">
                    STAGING – ikke ekte app
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
