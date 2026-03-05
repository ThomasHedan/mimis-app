import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase.from("events").select("*");

  if (from) {
    query = query.gte("start_at", from);
  } else {
    // Par défaut : depuis aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("start_at", today.toISOString());
  }

  if (to) query = query.lte("start_at", to);

  const { data, error } = await query.order("start_at", { ascending: true }).limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { title, description, start_at, end_at, all_day } = body;

  if (!title?.trim() || !start_at) {
    return NextResponse.json({ error: "Titre et date requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      start_at,
      end_at: end_at || null,
      all_day: all_day ?? false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
