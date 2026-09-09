import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, serverError, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { endpoint, p256dh, auth } = await request.json();
    if (!endpoint || !p256dh || !auth) return badRequest("Données manquantes");

    // Upsert : si l'endpoint existe déjà, on met à jour (l'appareil a pu
    // changer de main entre les deux comptes).
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     p256dh  = EXCLUDED.p256dh,
                     auth    = EXCLUDED.auth`,
      [user.id, endpoint, p256dh, auth]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("push/subscribe/POST", error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { endpoint } = await request.json();
    if (!endpoint) return badRequest("Endpoint requis");

    await query(
      "DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2",
      [endpoint, user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("push/subscribe/DELETE", error);
  }
}
