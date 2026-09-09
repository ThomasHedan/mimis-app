import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/http";
import type { Event } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { title, description, location, color, start_at, end_at, all_day } =
      await request.json();

    if (!title?.trim() || !start_at) return badRequest("Titre et date requis");

    const event = await queryOne<Event>(
      `UPDATE events
          SET title = $1, description = $2, location = $3, color = $4,
              start_at = $5, end_at = $6, all_day = $7
        WHERE id = $8
        RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        location?.trim() || null,
        color || null,
        start_at,
        end_at || null,
        all_day ?? false,
        id,
      ]
    );

    if (!event) return notFound();
    return NextResponse.json(event);
  } catch (error) {
    return serverError("events/[id]/PATCH", error);
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

    await query("DELETE FROM events WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("events/[id]/DELETE", error);
  }
}
