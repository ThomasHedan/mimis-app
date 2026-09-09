import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { notFound, serverError, unauthorized } from "@/lib/http";

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m.toISOString().split("T")[0];
}

// Toggle : coche ou décoche l'habitude pour la période courante
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const now   = new Date();
    const today = now.toISOString().split("T")[0];

    const habit = await queryOne<{ frequency: string }>(
      "SELECT frequency FROM habits WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!habit) return notFound();

    const freq = habit.frequency ?? "daily";

    // Début de la période courante, pour retrouver une coche existante
    let periodStart = today;
    if (freq === "weekly")  periodStart = getMonday(now);
    if (freq === "monthly") periodStart = today.slice(0, 7) + "-01";

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM habit_logs
        WHERE habit_id = $1 AND user_id = $2 AND logged_date >= $3
        ORDER BY logged_date DESC
        LIMIT 1`,
      [id, user.id, periodStart]
    );

    if (existing) {
      await query("DELETE FROM habit_logs WHERE id = $1", [existing.id]);
      return NextResponse.json({ logged: false });
    }

    // ON CONFLICT : deux clics simultanés ne doivent pas lever sur la
    // contrainte d'unicité (habit_id, logged_date).
    await query(
      `INSERT INTO habit_logs (habit_id, user_id, logged_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (habit_id, logged_date) DO NOTHING`,
      [id, user.id, today]
    );

    return NextResponse.json({ logged: true });
  } catch (error) {
    return serverError("habits/[id]/log/POST", error);
  }
}
