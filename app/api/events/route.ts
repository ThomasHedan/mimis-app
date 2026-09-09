import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { notifyAll } from "@/lib/notifyAll";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import type { Event } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    // Par défaut : à partir d'aujourd'hui minuit.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const conditions = ["start_at >= $1"];
    const params: unknown[] = [from ?? today.toISOString()];

    if (to) {
      params.push(to);
      conditions.push(`start_at <= $${params.length}`);
    }

    const events = await query<Event>(
      `SELECT * FROM events
        WHERE ${conditions.join(" AND ")}
        ORDER BY start_at ASC
        LIMIT 100`,
      params
    );

    return NextResponse.json(events);
  } catch (error) {
    return serverError("events/GET", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { title, description, location, color, start_at, end_at, all_day } =
      await request.json();

    if (!title?.trim() || !start_at) return badRequest("Titre et date requis");

    const event = await queryOne<Event>(
      `INSERT INTO events (title, description, location, color, start_at, end_at, all_day, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        location?.trim() || null,
        color || null,
        start_at,
        end_at || null,
        all_day ?? false,
        user.id,
      ]
    );

    // Notification pour tous
    const dateLabel = new Date(start_at).toLocaleDateString("fr-FR", {
      weekday: "short", day: "numeric", month: "short",
    });
    await notifyAll(
      "Nouvel événement",
      `• ${event!.title} — ${dateLabel}${location ? ` · ${location}` : ""}`
    );

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return serverError("events/POST", error);
  }
}
