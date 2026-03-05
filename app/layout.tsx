import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "MimisApp",
  description: "Notre app de couple",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MimisApp" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ServiceWorkerRegistration />
        <div className="app-shell">
          <NavBar />
          <div className="app-content">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
