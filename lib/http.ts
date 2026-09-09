import { NextResponse } from "next/server";

export const unauthorized = () =>
  NextResponse.json({ error: "Non autorisé" }, { status: 401 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const notFound = (message = "Introuvable") =>
  NextResponse.json({ error: message }, { status: 404 });

/**
 * Réponse d'erreur générique. Le détail part dans les logs serveur (Vercel) et
 * jamais dans le corps de la réponse : un message Postgres brut renseignerait
 * un attaquant sur le schéma.
 */
export function serverError(context: string, error: unknown) {
  console.error(`[${context}]`, error);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
