import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:contact@mimis-app.vercel.app", pub, priv);
  vapidReady = true;
}

/**
 * Envoie une notification push à tous les abonnés d'un utilisateur.
 */
export async function sendPushToUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  title: string,
  body: string
) {
  ensureVapid();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .catch((err) => {
          // Si l'abonnement est expiré (410), on le supprime
          if (err.statusCode === 410) {
            return supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          console.error("[webpush] Erreur envoi:", err.message);
        })
    )
  );
}

/**
 * Envoie une notification push à tous les utilisateurs abonnés.
 */
export async function sendPushToAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  title: string,
  body: string
) {
  ensureVapid();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .catch((err) => {
          if (err.statusCode === 410) {
            return supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          console.error("[webpush] Erreur envoi:", err.message);
        })
    )
  );
}
