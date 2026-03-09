import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now         = new Date();
  const today       = now.toISOString().split("T")[0];
  const startOfWeek = getMonday(now).toISOString().split("T")[0];
  const startOfMonth = today.slice(0, 7) + "-01";

  const [{ data: habits, error }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, logged_date")
      .eq("user_id", user.id)
      .gte("logged_date", startOfMonth),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logsByHabit = new Map<string, string[]>();
  for (const l of logs ?? []) {
    const arr = logsByHabit.get(l.habit_id) ?? [];
    arr.push(l.logged_date);
    logsByHabit.set(l.habit_id, arr);
  }

  const result = (habits ?? []).map((h) => {
    const dates = logsByHabit.get(h.id) ?? [];
    const freq  = h.frequency ?? "daily";
    let logged_period = false;
    if (freq === "daily")   logged_period = dates.includes(today);
    if (freq === "weekly")  logged_period = dates.some((d) => d >= startOfWeek);
    if (freq === "monthly") logged_period = dates.length > 0;
    return { ...h, logged_period };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { name, description, color, frequency } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("habits")
    .insert({
      name:        name.trim(),
      description: description?.trim() || null,
      color:       color || null,
      frequency:   frequency || "daily",
      user_id:     user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
