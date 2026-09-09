import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/http";
import type { Habit } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { name, description, color, frequency } = await request.json();
    if (!name?.trim()) return badRequest("Nom requis");

    // Les habitudes sont privées : le filtre sur user_id empêche de modifier
    // celles de l'autre compte.
    const habit = await queryOne<Habit>(
      `UPDATE habits
          SET name = $1, description = $2, color = $3, frequency = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        color || null,
        frequency || "daily",
        id,
        user.id,
      ]
    );

    if (!habit) return notFound();
    return NextResponse.json(habit);
  } catch (error) {
    return serverError("habits/[id]/PATCH", error);
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

    // Le filtre sur user_id fait que la suppression ne touche rien si
    // l'habitude appartient à l'autre compte : on répond 404 plutôt qu'un
    // 200 qui laisserait croire à une suppression.
    const deleted = await query(
      "DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, user.id]
    );
    if (deleted.length === 0) return notFound();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("habits/[id]/DELETE", error);
  }
}
