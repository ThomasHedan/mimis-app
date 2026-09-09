// Hachage et vérification des mots de passe avec scrypt (node:crypto, aucune
// dépendance externe). Utilisé par le script de génération de hash et par la
// route de connexion — tous deux en runtime Node, jamais en Edge.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Paramètres scrypt par défaut (OWASP : N ≥ 2^15, r = 8, p = 1). */
const DEFAULT_PARAMS = { N: 32768, r: 8, p: 1 } as const;

/**
 * Format sérialisé : scrypt:N:r:p:sel:hash — les deux derniers en base64.
 *
 * Le séparateur est ":" et non "$" (la convention habituelle de scrypt/argon2)
 * parce que ce hash transite par des fichiers .env : dotenv y interprète "$xxx"
 * comme une référence de variable et corromprait silencieusement la valeur.
 * ":" n'appartient pas à l'alphabet base64, la découpe reste donc sans
 * ambiguïté.
 */
export async function hashPassword(password: string): Promise<string> {
  const { N, r, p } = DEFAULT_PARAMS;
  const salt = randomBytes(16);
  const hash = await derive(password, salt, N, r, p);
  return `scrypt:${N}:${r}:${p}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

/**
 * Compare un mot de passe saisi au hash stocké. Retourne false — plutôt que de
 * lever — si le hash est malformé, pour que la route de connexion réponde
 * toujours la même chose quelle que soit la cause de l'échec.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  try {
    const actual = await derive(password, salt, N, r, p);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function derive(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      // maxmem doit être relevé : la valeur par défaut (32 Mo) est trop basse
      // pour N = 32768, et scrypt échouerait avec "memory limit exceeded".
      { N, r, p, maxmem: 256 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key as Buffer))
    );
  });
}
