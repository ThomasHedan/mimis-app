import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { notifyAll } from "@/lib/notifyAll";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import type { Chore } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    // Les tâches à faire d'abord, puis par priorité décroissante.
    // `priority` est textuel : on le projette sur un rang pour trier
    // high > medium > low plutôt qu'alphabétiquement.
    const chores = await query<Chore>(
      `SELECT * FROM chores
        ORDER BY done ASC,
                 CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
                 created_at DESC`
    );

    return NextResponse.json(chores);
  } catch (error) {
    return serverError("chores/GET", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { title, due_date, assigned_to, priority, notes, recurrence_value, recurrence_unit } =
      await request.json();

    if (!title?.trim()) return badRequest("Titre requis");

    const chore = await queryOne<Chore>(
      `INSERT INTO chores
         (title, created_by, due_date, assigned_to, priority, notes, recurrence_value, recurrence_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title.trim(),
        user.id,
        due_date || null,
        Array.isArray(assigned_to) && assigned_to.length > 0 ? assigned_to : null,
        priority || "medium",
        notes?.trim() || null,
        recurrence_value || null,
        recurrence_unit || null,
      ]
    );

    // Notification pour tous
    const lines = [`• ${chore!.title}`];
    if (due_date) {
      const dateLabel = new Date(due_date + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "numeric", month: "short",
      });
      lines.push(`  Pour le ${dateLabel}`);
    }
    await notifyAll("Nouvelle tâche", lines.join("\n"));

    return NextResponse.json(chore, { status: 201 });
  } catch (error) {
    return serverError("chores/POST", error);
  }
}
