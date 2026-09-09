// Accès Postgres (Neon) via le driver serverless HTTP.
//
// Pas de pool de connexions à gérer : chaque requête est un appel HTTP, ce qui
// convient aux fonctions serverless de Vercel. Le driver est instancié
// paresseusement pour qu'un build sans DATABASE_URL ne casse pas.

import { neon, types, type NeonQueryFunction } from "@neondatabase/serverless";
import { SCHEMA_SQL, SCHEMA_TABLES } from "@/db/schema";

// OID des types Postgres dont on veut changer le décodage par défaut.
const PG_INT8    = 20;   // bigint  → string par défaut (précision > 2^53)
const PG_NUMERIC = 1700; // numeric → string par défaut (précision décimale)
const PG_DATE    = 1082; // date    → objet Date par défaut

/**
 * Le décodage par défaut de node-postgres ne correspond pas à ce que le front
 * attend :
 *  - `date` deviendrait un Date, sérialisé en "2026-01-05T00:00:00.000Z" et
 *    décalé d'un jour selon le fuseau ; l'UI compare des chaînes "YYYY-MM-DD".
 *  - `numeric` et `bigint` deviendraient des chaînes, alors que les montants du
 *    budget et les compteurs sont manipulés comme des nombres.
 * Les montants de l'app tiennent largement dans un double, donc la conversion
 * en Number est sans risque de perte ici.
 */
const customTypes = {
  getTypeParser(id: number, format?: unknown) {
    if (id === PG_DATE) return (value: string) => value;
    if (id === PG_NUMERIC || id === PG_INT8) return (value: string) => Number(value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (types.getTypeParser as any)(id, format);
  },
};

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL n'est pas définie.");
    client = neon(url);
  }
  return client;
}

/**
 * Requête sans vérification de schéma — réservée à l'amorçage ci-dessous,
 * pour ne pas boucler sur ensureSchema().
 *
 * `customTypes` est passé ici, par requête, et non à `neon()` : le driver
 * ne lit les parseurs de types que dans les options d'appel et ignore
 * silencieusement ceux du constructeur.
 */
async function rawQuery<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const rows = await getClient().query(text, params as unknown[], { types: customTypes });
  return rows as T[];
}

let schemaReady: Promise<void> | null = null;

/** Erreurs bénignes quand deux instances créent le même objet en même temps. */
const CONFLITS_CONCURRENTS = new Set([
  "23505", // unique_violation sur un catalogue système
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42P16", // invalid_table_definition (index déjà en cours de création)
]);

/**
 * Crée les tables si elles manquent, une seule fois par instance.
 *
 * Éviter d'avoir à exécuter le SQL à la main est ce qui rend l'app
 * déployable depuis un téléphone. Toutes les instructions sont en
 * IF NOT EXISTS, mais ça ne suffit pas : deux instances qui démarrent
 * ensemble sur une base vide peuvent malgré tout se heurter dans les
 * catalogues Postgres. On tolère donc les conflits de création
 * instruction par instruction — sans jamais interrompre la boucle, sinon
 * l'instance repartirait avec un schéma à moitié appliqué — et on ne
 * conclut au succès qu'après avoir vérifié que TOUTES les tables sont là.
 */
async function ensureSchema(): Promise<void> {
  if (await tablesManquantes().then((m) => m.length === 0)) return;

  console.log("[db] schéma incomplet — création des tables");

  // Neon en HTTP n'accepte qu'une instruction par requête : on découpe.
  const instructions = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.replace(/--[^\n]*/g, "").trim().length > 0);

  for (const instruction of instructions) {
    try {
      await rawQuery(instruction);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (!code || !CONFLITS_CONCURRENTS.has(code)) throw error;
      console.warn("[db] conflit de création concurrente, on continue:", code);
    }
  }

  const manquantes = await tablesManquantes();
  if (manquantes.length > 0) {
    throw new Error(`Schéma incomplet après création : ${manquantes.join(", ")}`);
  }

  console.log(`[db] schéma appliqué (${instructions.length} instructions)`);
}

/** Tables attendues qui n'existent pas encore. */
async function tablesManquantes(): Promise<string[]> {
  const rows = await rawQuery<{ nom: string }>(
    `SELECT nom FROM unnest($1::text[]) AS nom
      WHERE to_regclass('public.' || quote_ident(nom)) IS NULL`,
    [[...SCHEMA_TABLES]]
  );
  return rows.map((r) => r.nom);
}

/** Mémorise la vérification, et la rejoue au prochain appel si elle a échoué. */
function schemaChecked(): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/**
 * Exécute une requête paramétrée et retourne les lignes typées.
 * Toujours passer les valeurs via `params` ($1, $2, …) — jamais par
 * concaténation — pour écarter toute injection SQL.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await schemaChecked();
  return rawQuery<T>(text, params);
}

/** Première ligne du résultat, ou null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
