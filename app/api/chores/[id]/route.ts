import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/http";
import type { Chore } from "@/lib/types";

function advanceDate(dueDateStr: string | null, value: number, unit: string): string {
  const base = dueDateStr ? new Date(dueDateStr + "T00:00:00") : new Date();
  if (unit === "weeks") base.setDate(base.getDate() + value * 7);
  else if (unit === "months") base.setMonth(base.getMonth() + value);
  return base.toISOString().split("T")[0];
}

// Toggle done / not done
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const current = await queryOne<Pick<Chore, "done" | "due_date" | "recurrence_value" | "recurrence_unit">>(
      "SELECT done, due_date, recurrence_value, recurrence_unit FROM chores WHERE id = $1",
      [id]
    );

    if (!current) return notFound();

    // Tâche récurrente cochée → avancer la date, ne pas marquer done
    if (!current.done && current.recurrence_value && current.recurrence_unit) {
      const nextDate = advanceDate(
        current.due_date,
        current.recurrence_value,
        current.recurrence_unit
      );
      const updated = await queryOne<Chore>(
        "UPDATE chores SET due_date = $1 WHERE id = $2 RETURNING *",
        [nextDate, id]
      );
      return NextResponse.json(updated);
    }

    const newDone = !current.done;
    const updated = await queryOne<Chore>(
      "UPDATE chores SET done = $1, done_at = $2 WHERE id = $3 RETURNING *",
      [newDone, newDone ? new Date().toISOString() : null, id]
    );

    return NextResponse.json(updated);
  } catch (error) {
    return serverError("chores/[id]/PATCH", error);
  }
}

// Mise à jour complète
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { title, due_date, assigned_to, priority, notes, recurrence_value, recurrence_unit } =
      await request.json();

    if (!title?.trim()) return badRequest("Titre requis");

    const chore = await queryOne<Chore>(
      `UPDATE chores
          SET title = $1, due_date = $2, assigned_to = $3, priority = $4,
              notes = $5, recurrence_value = $6, recurrence_unit = $7
        WHERE id = $8
        RETURNING *`,
      [
        title.trim(),
        due_date || null,
        Array.isArray(assigned_to) && assigned_to.length > 0 ? assigned_to : null,
        priority || "medium",
        notes?.trim() || null,
        recurrence_value || null,
        recurrence_unit || null,
        id,
      ]
    );

    if (!chore) return notFound();
    return NextResponse.json(chore);
  } catch (error) {
    return serverError("chores/[id]/PUT", error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await query("DELETE FROM chores WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("chores/[id]/DELETE", error);
  }
}
