import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/http";
import type { BudgetCategory } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { name, color, monthly_limit, icon } = await request.json();
    if (!name?.trim()) return badRequest("Nom requis");

    const category = await queryOne<BudgetCategory>(
      `UPDATE budget_categories
          SET name = $1, color = $2, monthly_limit = $3, icon = $4
        WHERE id = $5
        RETURNING *`,
      [name.trim(), color || "blue", Number(monthly_limit) || 0, icon?.trim() || null, id]
    );

    if (!category) return notFound();
    return NextResponse.json(category);
  } catch (error) {
    return serverError("budget/categories/[id]/PUT", error);
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

    // Les dépenses de la catégorie partent avec elle (ON DELETE CASCADE).
    await query("DELETE FROM budget_categories WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("budget/categories/[id]/DELETE", error);
  }
}
