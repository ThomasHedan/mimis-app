import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now   = new Date();
  const today = now.toISOString().split("T")[0];

  // Fetch the habit to know its frequency
  const { data: habit } = await supabase
    .from("habits")
    .select("frequency")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!habit) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const freq = habit.frequency ?? "daily";

  // Determine the start of the current period to search for existing logs
  let periodStart = today;
  if (freq === "weekly")  periodStart = getMonday(now);
  if (freq === "monthly") periodStart = today.slice(0, 7) + "-01";

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", id)
    .eq("user_id", user.id)
    .gte("logged_date", periodStart)
    .order("logged_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase.from("habit_logs").delete().eq("id", existing.id);
    return NextResponse.json({ logged: false });
  }

  await supabase
    .from("habit_logs")
    .insert({ habit_id: id, user_id: user.id, logged_date: today });

  return NextResponse.json({ logged: true });
}
