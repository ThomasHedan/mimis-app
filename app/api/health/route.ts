import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUsers } from "@/lib/auth/users";

// Diagnostic de configuration : dit si l'app est correctement branchée sur sa
// base et si les variables d'environnement attendues sont présentes.
//
// Volontairement accessible sans session — c'est justement quand la connexion
// ne marche pas qu'on en a besoin. Il ne renvoie donc JAMAIS de valeur de
// variable, d'identifiant ni de message d'erreur brut : uniquement des états.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLES_ATTENDUES = [
  "events", "habits", "habit_logs", "chores",
  "budget_categories", "budget_entries", "notifications", "push_subscriptions",
];

/** Ramène une erreur Postgres à une cause lisible, sans divulguer le détail. */
function diagnostiquer(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const message = err?.message ?? "";

  if (err.code === "28P01" || /password authentication/i.test(message)) {
    return "identifiants refusés par la base — vérifie DATABASE_URL";
  }
  if (err.code === "3D000") {
    return "la base nommée dans DATABASE_URL n'existe pas";
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(message)) {
    return "base injoignable — vérifie l'hôte dans DATABASE_URL";
  }
  if (/DATABASE_URL/.test(message)) {
    return "DATABASE_URL absente";
  }
  return "connexion à la base en échec";
}

export async function GET() {
  const env: Record<string, string> = {};
  const problemes: string[] = [];

  // ── Variables d'environnement ──────────────────────────────────────────
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    env.AUTH_SECRET = "absente";
    problemes.push("AUTH_SECRET manquante");
  } else if (secret.length < 32) {
    env.AUTH_SECRET = `trop courte (${secret.length} caractères, 32 minimum)`;
    problemes.push("AUTH_SECRET trop courte");
  } else {
    env.AUTH_SECRET = "ok";
  }

  let nbUtilisateurs = 0;
  try {
    const users = getUsers();
    nbUtilisateurs = users.length;
    // Un hash mal recopié (ou mangé par l'expansion dotenv) est la panne la
    // plus probable au premier déploiement : on la nomme explicitement.
    const hashInvalides = users.filter((u) => !/^scrypt:\d+:\d+:\d+:[^:]+:[^:]+$/.test(u.password));
    if (hashInvalides.length > 0) {
      env.APP_USERS = `${users.length} compte(s), mais hash invalide pour : ${hashInvalides.map((u) => u.display_name).join(", ")}`;
      problemes.push("hash de mot de passe malformé dans APP_USERS");
    } else {
      env.APP_USERS = `ok — ${users.length} compte(s) : ${users.map((u) => u.display_name).join(", ")}`;
    }
  } catch (error) {
    env.APP_USERS = (error as Error).message;
    problemes.push("APP_USERS invalide");
  }

  env.DATABASE_URL = process.env.DATABASE_URL ? "ok" : "absente";
  if (!process.env.DATABASE_URL) problemes.push("DATABASE_URL manquante");

  env.CRON_SECRET = process.env.CRON_SECRET
    ? "ok"
    : "absente — le résumé quotidien refusera tous les appels";
  env.VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? "ok"
    : "absentes — les notifications push ne partiront pas";

  // ── Base de données ────────────────────────────────────────────────────
  let base = "non testée (DATABASE_URL absente)";
  let tables = "non testées";

  if (process.env.DATABASE_URL) {
    try {
      await query("SELECT 1");
      base = "connectée";

      const presentes = await query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const noms = new Set(presentes.map((t) => t.table_name));
      const manquantes = TABLES_ATTENDUES.filter((t) => !noms.has(t));

      if (manquantes.length > 0) {
        tables = `manquantes : ${manquantes.join(", ")} — exécute db/schema.sql`;
        problemes.push("schéma incomplet");
      } else {
        tables = `ok — les ${TABLES_ATTENDUES.length} tables sont présentes`;
      }
    } catch (error) {
      console.error("[health] échec base:", error);
      base = diagnostiquer(error);
      problemes.push("base inaccessible");
    }
  }

  const ok = problemes.length === 0;
  return NextResponse.json(
    {
      ok,
      resume: ok
        ? `Tout est en place — ${nbUtilisateurs} compte(s), base connectée.`
        : `À corriger : ${problemes.join(", ")}.`,
      environnement: env,
      base,
      tables,
    },
    { status: ok ? 200 : 503 }
  );
}
