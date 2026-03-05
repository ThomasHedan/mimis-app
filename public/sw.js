// Service Worker — MimisApp
// Stratégie : Cache-First pour les assets statiques, Network-First pour les pages.
// Ce fichier est servi avec Cache-Control: no-cache (voir next.config.js)
// pour que le navigateur détecte toujours les mises à jour.

const CACHE_NAME = "mimisapp-v1";

// Assets à précacher au moment de l'installation
const PRECACHE_ASSETS = ["/", "/offline"];

// ─── Installation ────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Active immédiatement sans attendre que l'onglet soit fermé
  self.skipWaiting();
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
          caches.match(request).then((cached) => cached || caches.match("/offline"))
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
