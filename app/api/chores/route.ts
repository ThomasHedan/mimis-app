import { createClient } from "@/lib/supabase/server";
import { notifyAll } from "@/lib/notifyAll";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .order("done", { ascending: true })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { title, due_date, assigned_to, priority, notes } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("chores")
    .insert({
      title: title.trim(),
      created_by: user.id,
      due_date: due_date || null,
      assigned_to: assigned_to || null,
      priority: priority || "medium",
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notification pour tous
  const lines = [`• ${data.title}`];
  if (due_date) {
    const dateLabel = new Date(due_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    lines.push(`  Pour le ${dateLabel}`);
  }
  await notifyAll(supabase, user.id, "Nouvelle tâche", lines.join("\n"));

  return NextResponse.json(data, { status: 201 });
}
