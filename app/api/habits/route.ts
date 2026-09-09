import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import type { Habit } from "@/lib/types";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const now          = new Date();
    const today        = now.toISOString().split("T")[0];
    const startOfWeek  = getMonday(now).toISOString().split("T")[0];
    const startOfMonth = today.slice(0, 7) + "-01";

    const [habits, logs] = await Promise.all([
      query<Habit>(
        "SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at ASC",
        [user.id]
      ),
      query<{ habit_id: string; logged_date: string }>(
        `SELECT habit_id, logged_date
           FROM habit_logs
          WHERE user_id = $1 AND logged_date >= $2`,
        [user.id, startOfMonth]
      ),
    ]);

    const logsByHabit = new Map<string, string[]>();
    for (const l of logs) {
      const arr = logsByHabit.get(l.habit_id) ?? [];
      arr.push(l.logged_date);
      logsByHabit.set(l.habit_id, arr);
    }

    const result = habits.map((h) => {
      const dates = logsByHabit.get(h.id) ?? [];
      const freq  = h.frequency ?? "daily";
      let logged_period = false;
      if (freq === "daily")   logged_period = dates.includes(today);
      if (freq === "weekly")  logged_period = dates.some((d) => d >= startOfWeek);
      if (freq === "monthly") logged_period = dates.length > 0;
      return { ...h, logged_period };
    });

    return NextResponse.json(result);
  } catch (error) {
    return serverError("habits/GET", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { name, description, color, frequency } = await request.json();
    if (!name?.trim()) return badRequest("Nom requis");

    const habit = await queryOne<Habit>(
      `INSERT INTO habits (name, description, color, frequency, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        color || null,
        frequency || "daily",
        user.id,
      ]
    );

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    return serverError("habits/POST", error);
  }
}
