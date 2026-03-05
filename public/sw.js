// Service Worker — MimisApp
// Stratégie : Cache-First pour les assets statiques, Network-First pour les pages.
// Ce fichier est servi avec Cache-Control: no-cache (voir next.config.js)
// pour que le navigateur détecte toujours les mises à jour.

const CACHE_NAME = "mimisapp-v2";

// HTML de la page offline embarqué directement dans le SW.
// Avantage : disponible instantanément dès l'installation, sans dépendre
// d'une requête réseau vers /offline (qui peut échouer ou être bloquée
// par les headers Cache-Control de Next.js).
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hors-ligne — MimisApp</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100dvh; font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa; color: #18181b;
    }
    .card { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 700; }
    p  { margin-top: 0.5rem; color: #71717a; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hors-ligne</h1>
    <p>Vérifie ta connexion et réessaie.</p>
  </div>
</body>
</html>`;

// ─── Installation ────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  // skipWaiting dans waitUntil pour s'activer dès que l'install est terminée
  event.waitUntil(self.skipWaiting());
});

// ─── Activation ──────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        // Supprime les anciens caches (versions précédentes du SW)
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Prend le contrôle de tous les clients immédiatement
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes API — toujours réseau
  if (url.pathname.startsWith("/api/")) return;

  // Ne pas intercepter les requêtes vers d'autres origines
  if (url.origin !== self.location.origin) return;

  // Stratégie Network-First pour la navigation (pages HTML)
  // Fallback sur le cache si hors-ligne
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Met à jour le cache avec la version réseau
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          // Essaie d'abord le cache pour cette URL précise,
          // puis retourne le HTML offline embarqué — toujours disponible.
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(OFFLINE_HTML, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
          )
        )
    );
    return;
  }

  // Stratégie Cache-First pour les assets statiques (JS, CSS, images)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Ne cache que les réponses valides
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ─── Push notifications (sera complété à l'étape 7) ─────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "MimisApp", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
    })
  );
});
