// Accès à l'utilisateur courant depuis une route API ou un Server Component.

import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { findUserById, type AppUser } from "@/lib/auth/users";

/**
 * Utilisateur de la requête en cours, ou null.
 * Un jeton valide dont l'id n'existe plus dans APP_USERS est rejeté : retirer
 * un utilisateur de l'environnement invalide immédiatement ses sessions.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return findUserById(userId);
}
