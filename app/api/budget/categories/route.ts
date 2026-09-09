import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import type { BudgetCategory } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const categories = await query<BudgetCategory>(
      "SELECT * FROM budget_categories ORDER BY created_at ASC"
    );

    return NextResponse.json(categories);
  } catch (error) {
    return serverError("budget/categories/GET", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { name, color, monthly_limit, icon } = await request.json();
    if (!name?.trim()) return badRequest("Nom requis");

    const category = await queryOne<BudgetCategory>(
      `INSERT INTO budget_categories (name, color, monthly_limit, icon, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name.trim(),
        color || "blue",
        Number(monthly_limit) || 0,
        icon?.trim() || null,
        user.id,
      ]
    );

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return serverError("budget/categories/POST", error);
  }
}
