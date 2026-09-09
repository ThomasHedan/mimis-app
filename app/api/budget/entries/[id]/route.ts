import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { serverError, unauthorized } from "@/lib/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await query("DELETE FROM budget_entries WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("budget/entries/[id]/DELETE", error);
  }
}
