"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  try {
    // Vérifie si déjà abonné
    const existing = await registration.pushManager.getSubscription();
    if (existing) return; // Déjà abonné, pas besoin de resubscrire

    // Demande permission si pas encore accordée
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const key = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");
    if (!key || !auth) return;

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      }),
    });

    console.log("[SW] Abonné aux notifications push");
  } catch (err) {
    console.error("[SW] Erreur abonnement push:", err);
  }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Enregistré, scope :", registration.scope);
        // Attendre que le SW soit actif avant de s'abonner
        if (registration.active) {
          subscribeToPush(registration);
        } else {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                subscribeToPush(registration);
              }
            });
          });
          // Fallback si le SW s'active sans updatefound
          navigator.serviceWorker.ready.then((reg) => subscribeToPush(reg));
        }
      })
      .catch((error) => {
        console.error("[SW] Échec d'enregistrement :", error);
      });
  }, []);

  return null;
}
