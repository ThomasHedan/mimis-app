import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

// ─── Métadonnées SEO + PWA ────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "MimisApp",
  description: "Notre app de couple",
  // Masque l'app des moteurs de recherche — données privées
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  // Tags spécifiques iOS pour l'installation en PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MimisApp",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

// Viewport séparé de metadata (requis par Next.js 14)
export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  // Empêche le zoom manuel — adapté pour une app, pas un site de contenu
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* Enregistrement du Service Worker côté client uniquement */}
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
