import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const [{ data: habits, error }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id")
      .eq("logged_date", today),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const loggedIds = new Set(logs?.map((l) => l.habit_id) ?? []);
  const result = (habits ?? []).map((h) => ({
    ...h,
    logged_today: loggedIds.has(h.id),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { name, description, color } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("habits")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || null,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
