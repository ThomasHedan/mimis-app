import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUsers } from "@/lib/auth/users";
import { sendPushToUser } from "@/lib/webpush";
import { serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

type TitleRow = { title: string };
type EventRow = { title: string; start_at: string };

export async function GET(request: Request) {
  // Cette route est la seule à ne pas passer par le cookie de session (voir
  // proxy.ts) : elle est appelée par le workflow GitHub, qui s'authentifie avec
  // un secret partagé. Si CRON_SECRET n'est pas configuré on refuse — sinon
  // l'endpoint serait ouvert à tout le monde.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const now         = new Date();
    const todayStr    = now.toISOString().split("T")[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
    const in4daysStr  = new Date(now.getTime() + 4 * 86400000).toISOString().split("T")[0];

    // Les destinataires sont les comptes déclarés dans APP_USERS — plus besoin
    // de balayer les tables pour retrouver qui utilise l'app.
    const users = getUsers();

    // Données partagées (une seule fois pour tout le monde)
    const [overdueChores, dueTodayChores, newChores, upcomingEvents, newEvents] =
      await Promise.all([
        query<TitleRow>(
          "SELECT title FROM chores WHERE NOT done AND due_date IS NOT NULL AND due_date < $1",
          [todayStr]
        ),
        query<TitleRow>(
          "SELECT title FROM chores WHERE NOT done AND due_date = $1",
          [todayStr]
        ),
        query<TitleRow>(
          "SELECT title FROM chores WHERE created_at >= $1 AND created_at < $2",
          [`${todayStr}T00:00:00Z`, `${tomorrowStr}T00:00:00Z`]
        ),
        query<EventRow>(
          `SELECT title, start_at FROM events
            WHERE start_at >= $1 AND start_at <= $2
            ORDER BY start_at`,
          [`${tomorrowStr}T00:00:00Z`, `${in4daysStr}T23:59:59Z`]
        ),
        query<TitleRow>(
          "SELECT title FROM events WHERE created_at >= $1 AND created_at < $2",
          [`${todayStr}T00:00:00Z`, `${tomorrowStr}T00:00:00Z`]
        ),
      ]);

    const toInsert: { user_id: string; title: string; body: string }[] = [];

    for (const user of users) {
      // Déduplication : déjà envoyé aujourd'hui ?
      const existing = await query(
        "SELECT 1 FROM notifications WHERE user_id = $1 AND created_at >= $2 LIMIT 1",
        [user.id, `${todayStr}T00:00:00Z`]
      );
      if (existing.length > 0) continue;

      // Habitudes non effectuées (privées par user)
      const undoneHabits = await query<{ name: string }>(
        `SELECT h.name
           FROM habits h
          WHERE h.user_id = $1
            AND NOT EXISTS (
              SELECT 1 FROM habit_logs l
               WHERE l.habit_id = h.id AND l.logged_date = $2
            )`,
        [user.id, todayStr]
      );

      const lines: string[] = [];
      let count = 0;

      if (undoneHabits.length > 0) {
        count += undoneHabits.length;
        const names = undoneHabits.map((h) => h.name).join(", ");
        const s = undoneHabits.length > 1 ? "s" : "";
        lines.push(`• ${undoneHabits.length} habitude${s} non effectuée${s} : ${names}`);
      }
      if (overdueChores.length > 0) {
        count += overdueChores.length;
        lines.push(`• ${overdueChores.length} tâche${overdueChores.length > 1 ? "s" : ""} en retard`);
      }
      if (dueTodayChores.length > 0) {
        count += dueTodayChores.length;
        lines.push(`• ${dueTodayChores.length} tâche${dueTodayChores.length > 1 ? "s" : ""} à faire aujourd'hui`);
      }
      if (newChores.length > 0) {
        count += newChores.length;
        const s = newChores.length > 1 ? "s" : "";
        const names = newChores.slice(0, 3).map((c) => c.title).join(", ");
        lines.push(`• Nouvelle${s} tâche${s} : ${names}${newChores.length > 3 ? ` +${newChores.length - 3}` : ""}`);
      }
      if (upcomingEvents.length > 0) {
        count += upcomingEvents.length;
        const evNames = upcomingEvents.slice(0, 2).map((e) => {
          const d = new Date(e.start_at).toLocaleDateString("fr-FR", {
            weekday: "short", day: "numeric", month: "short",
          });
          return `${e.title} (${d})`;
        });
        lines.push(`• À venir : ${evNames.join(", ")}${upcomingEvents.length > 2 ? ` +${upcomingEvents.length - 2}` : ""}`);
      }
      if (newEvents.length > 0) {
        count += newEvents.length;
        const names = newEvents.slice(0, 2).map((e) => e.title).join(", ");
        lines.push(`• ${newEvents.length > 1 ? "Nouveaux événements" : "Nouvel événement"} : ${names}`);
      }

      if (lines.length > 0) {
        toInsert.push({
          user_id: user.id,
          title: `${count} point${count > 1 ? "s" : ""} à noter`,
          body: lines.join("\n"),
        });
      }
    }

    if (toInsert.length > 0) {
      // unnest() sur trois tableaux parallèles : une seule requête d'insertion.
      await query(
        `INSERT INTO notifications (user_id, title, body)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[])`,
        [
          toInsert.map((n) => n.user_id),
          toInsert.map((n) => n.title),
          toInsert.map((n) => n.body),
        ]
      );

      // Envoi des push web par utilisateur
      await Promise.allSettled(
        toInsert.map((n) => sendPushToUser(n.user_id, n.title, n.body))
      );
    }

    return NextResponse.json({ ok: true, sent: toInsert.length });
  } catch (error) {
    return serverError("cron/daily-summary", error);
  }
}
