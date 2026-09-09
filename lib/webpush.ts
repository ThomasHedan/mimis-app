import webpush from "web-push";
import { query } from "@/lib/db";

type Subscription = { endpoint: string; p256dh: string; auth: string };

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:contact@mimis-app.vercel.app", pub, priv);
  vapidReady = true;
}

async function send(subs: Subscription[], title: string, body: string) {
  if (subs.length === 0) return;
  ensureVapid();

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
            return query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
          }
          console.error("[webpush] Erreur envoi:", err.message);
        })
    )
  );
}

/** Envoie une notification push à tous les abonnements d'un utilisateur. */
export async function sendPushToUser(userId: string, title: string, body: string) {
  const subs = await query<Subscription>(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );
  await send(subs, title, body);
}

/** Envoie une notification push à tous les abonnements, tous utilisateurs confondus. */
export async function sendPushToAll(title: string, body: string) {
  const subs = await query<Subscription>(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions"
  );
  await send(subs, title, body);
}
