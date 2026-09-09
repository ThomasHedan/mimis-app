import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import type { BudgetEntry } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest("Mois invalide (format AAAA-MM)");

    const [year, m] = month.split("-").map(Number);
    const dateFrom = `${year}-${String(m).padStart(2, "0")}-01`;
    const lastDay  = new Date(year, m, 0).getDate();
    const dateTo   = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const entries = await query<BudgetEntry>(
      `SELECT * FROM budget_entries
        WHERE date >= $1 AND date <= $2
        ORDER BY date DESC, created_at DESC`,
      [dateFrom, dateTo]
    );

    return NextResponse.json(entries);
  } catch (error) {
    return serverError("budget/entries/GET", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { category_id, amount, note, date } = await request.json();
    if (!category_id || !amount || !date) {
      return badRequest("Catégorie, montant et date requis");
    }

    const entry = await queryOne<BudgetEntry>(
      `INSERT INTO budget_entries (category_id, amount, note, date, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [category_id, Number(amount), note?.trim() || null, date, user.id]
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return serverError("budget/entries/POST", error);
  }
}
