import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/webpush";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vérification du secret cron (Vercel envoie Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now        = new Date();
  const todayStr   = now.toISOString().split("T")[0];
  const tomorrowMs = now.getTime() + 86400000;
  const in4daysMs  = now.getTime() + 4 * 86400000;
  const tomorrowStr = new Date(tomorrowMs).toISOString().split("T")[0];
  const in4daysStr  = new Date(in4daysMs).toISOString().split("T")[0];

  // 1. Tous les user_ids actifs
  const [{ data: habitUsers }, { data: choreUsers }, { data: eventUsers }] = await Promise.all([
    supabase.from("habits").select("user_id"),
    supabase.from("chores").select("created_by"),
    supabase.from("events").select("created_by"),
  ]);

  const userIds = [...new Set([
    ...(habitUsers?.map((h) => h.user_id) ?? []),
    ...(choreUsers?.map((c) => c.created_by) ?? []),
    ...(eventUsers?.map((e) => e.created_by) ?? []),
  ])];

  if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // 2. Données partagées (une seule fois)
  const [
    { data: overdueChores },
    { data: dueTodayChores },
    { data: newChores },
    { data: upcomingEvents },
    { data: newEvents },
  ] = await Promise.all([
    supabase.from("chores").select("title").eq("done", false).not("due_date", "is", null).lt("due_date", todayStr),
    supabase.from("chores").select("title").eq("done", false).eq("due_date", todayStr),
    supabase.from("chores").select("title").gte("created_at", `${todayStr}T00:00:00Z`).lte("created_at", `${todayStr}T23:59:59Z`),
    supabase.from("events").select("title, start_at").gte("start_at", `${tomorrowStr}T00:00:00Z`).lte("start_at", `${in4daysStr}T23:59:59Z`).order("start_at"),
    supabase.from("events").select("title").gte("created_at", `${todayStr}T00:00:00Z`).lte("created_at", `${todayStr}T23:59:59Z`),
  ]);

  // 3. Notification par user
  const toInsert: { user_id: string; title: string; body: string }[] = [];

  for (const userId of userIds) {
    // Déduplication : déjà envoyé aujourd'hui ?
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", `${todayStr}T00:00:00Z`)
      .limit(1);
    if (existing && existing.length > 0) continue;

    // Habitudes non effectuées (privées par user)
    const [{ data: userHabits }, { data: todayLogs }] = await Promise.all([
      supabase.from("habits").select("id, name").eq("user_id", userId),
      supabase.from("habit_logs").select("habit_id").eq("user_id", userId).eq("logged_date", todayStr),
    ]);
    const loggedIds   = new Set(todayLogs?.map((l) => l.habit_id) ?? []);
    const undoneHabits = (userHabits ?? []).filter((h) => !loggedIds.has(h.id));

    const lines: string[] = [];
    let count = 0;

    if (undoneHabits.length > 0) {
      count += undoneHabits.length;
      const names = undoneHabits.map((h) => h.name).join(", ");
      lines.push(`• ${undoneHabits.length} habitude${undoneHabits.length > 1 ? "s" : ""} non effectuée${undoneHabits.length > 1 ? "s" : ""} : ${names}`);
    }
    if ((overdueChores?.length ?? 0) > 0) {
      count += overdueChores!.length;
      lines.push(`• ${overdueChores!.length} tâche${overdueChores!.length > 1 ? "s" : ""} en retard`);
    }
    if ((dueTodayChores?.length ?? 0) > 0) {
      count += dueTodayChores!.length;
      lines.push(`• ${dueTodayChores!.length} tâche${dueTodayChores!.length > 1 ? "s" : ""} à faire aujourd'hui`);
    }
    if ((newChores?.length ?? 0) > 0) {
      count += newChores!.length;
      const names = newChores!.slice(0, 3).map((c) => c.title).join(", ");
      lines.push(`• Nouvelle${newChores!.length > 1 ? "s" : ""} tâche${newChores!.length > 1 ? "s" : ""} : ${names}${newChores!.length > 3 ? ` +${newChores!.length - 3}` : ""}`);
    }
    if ((upcomingEvents?.length ?? 0) > 0) {
      count += upcomingEvents!.length;
      const evNames = upcomingEvents!.slice(0, 2).map((e) => {
        const d = new Date(e.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
        return `${e.title} (${d})`;
      });
      lines.push(`• À venir : ${evNames.join(", ")}${upcomingEvents!.length > 2 ? ` +${upcomingEvents!.length - 2}` : ""}`);
    }
    if ((newEvents?.length ?? 0) > 0) {
      count += newEvents!.length;
      const names = newEvents!.slice(0, 2).map((e) => e.title).join(", ");
      lines.push(`• Nouvel événement${newEvents!.length > 1 ? "s" : ""} : ${names}`);
    }

    if (lines.length > 0) {
      toInsert.push({
        user_id: userId,
        title: `${count} point${count > 1 ? "s" : ""} à noter`,
        body: lines.join("\n"),
      });
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("notifications").insert(toInsert);

    // Envoi des push web par utilisateur
    await Promise.allSettled(
      toInsert.map((n) => sendPushToUser(supabase, n.user_id, n.title, n.body))
    );
  }

  return NextResponse.json({ ok: true, sent: toInsert.length });
}
