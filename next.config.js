/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactive le header X-Powered-By pour réduire l'exposition de la stack
  poweredByHeader: false,

  // Résout le warning Turbopack sur le workspace root (lockfile à la racine Users)
  turbopack: {
    root: __dirname,
  },

  // Headers de sécurité globaux
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Empêche le clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Empêche le MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Force HTTPS pour les futures visites (1 an)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Politique de référent : aucune info envoyée aux tiers
          { key: "Referrer-Policy", value: "no-referrer" },
          // Permissions API : désactive tout ce qui n'est pas nécessaire
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // Le Service Worker doit être servi sans cache pour détecter les mises à jour
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
