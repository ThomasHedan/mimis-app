import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { findUserByEmail } from "@/lib/auth/users";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { badRequest, serverError } from "@/lib/http";

// scrypt vient de node:crypto — cette route ne peut pas tourner en Edge.
export const runtime = "nodejs";

// Hash bidon calculé une seule fois par instance : quand l'email est inconnu on
// vérifie quand même le mot de passe contre lui, pour que la réponse mette le
// même temps que pour un email connu (pas d'énumération des comptes au chrono).
let dummyHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  return (dummyHash ??= hashPassword(randomBytes(32).toString("hex")));
}

export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return badRequest("Requête invalide");
  }

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return badRequest("Email et mot de passe requis");
  }

  try {
    const user = findUserByEmail(email);
    const ok = await verifyPassword(password, user ? user.password : await getDummyHash());

    if (!user || !ok) {
      // Message volontairement générique : ne révèle pas si l'email existe.
      return NextResponse.json(
        { error: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user.id);
    const response = NextResponse.json({
      user: { id: user.id, display_name: user.display_name },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return serverError("auth/login", error);
  }
}
