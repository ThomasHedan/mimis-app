import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // maxAge 0 : le navigateur supprime le cookie immédiatement.
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
