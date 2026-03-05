"use client";

import { useEffect } from "react";

// Composant client invisible — enregistre le SW au premier rendu côté navigateur.
// Isolé dans un composant dédié pour ne pas polluer le layout avec "use client".
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Enregistré, scope :", registration.scope);
        })
        .catch((error) => {
          console.error("[SW] Échec d'enregistrement :", error);
        });
    }
  }, []);

  return null;
}
