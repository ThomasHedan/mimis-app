import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const [year, m] = month.split("-").map(Number);
  const dateFrom = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay  = new Date(year, m, 0).getDate();
  const dateTo   = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("budget_entries")
    .select("*")
    .gte("date", dateFrom)
    .lte("date", dateTo)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { category_id, amount, note, date } = await request.json();
  if (!category_id || !amount || !date) {
    return NextResponse.json({ error: "Catégorie, montant et date requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budget_entries")
    .insert({
      category_id,
      amount: Number(amount),
      note: note?.trim() || null,
      date,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
