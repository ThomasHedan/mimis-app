// Accès Postgres (Neon) via le driver serverless HTTP.
//
// Pas de pool de connexions à gérer : chaque requête est un appel HTTP, ce qui
// convient aux fonctions serverless de Vercel. Le driver est instancié
// paresseusement pour qu'un build sans DATABASE_URL ne casse pas.

import { neon, types, type NeonQueryFunction } from "@neondatabase/serverless";

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
    client = neon(url, { types: customTypes });
  }
  return client;
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
  const rows = await getClient().query(text, params as unknown[]);
  return rows as T[];
}

/** Première ligne du résultat, ou null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
