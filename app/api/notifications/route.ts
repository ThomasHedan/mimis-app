import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { serverError, unauthorized } from "@/lib/http";
import type { Notification } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);

    // Mode count uniquement (pour le badge NavBar)
    if (searchParams.get("count") === "true") {
      const row = await queryOne<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND NOT read",
        [user.id]
      );
      return NextResponse.json({ count: row?.count ?? 0 });
    }

    // Liste complète
    const notifications = await query<Notification>(
      `SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [user.id]
    );

    return NextResponse.json(notifications);
  } catch (error) {
    return serverError("notifications/GET", error);
  }
}

// Marquer toutes les notifications comme lues
export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await query(
      "UPDATE notifications SET read = true WHERE user_id = $1 AND NOT read",
      [user.id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("notifications/PATCH", error);
  }
}
