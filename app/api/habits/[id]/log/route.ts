import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Toggle : coche ou décoche l'habitude pour aujourd'hui
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", id)
    .eq("logged_date", today)
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
