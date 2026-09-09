// Jeton de session signé, stocké dans un cookie httpOnly.
//
// Format : <payload base64url>.<signature base64url>
// La signature est un HMAC-SHA256 du payload avec AUTH_SECRET. Le payload n'est
// pas chiffré (il ne contient rien de secret : un id et une expiration) mais il
// est infalsifiable sans le secret.
//
// On utilise Web Crypto (et non node:crypto) pour que ce module fonctionne
// aussi bien dans le proxy (Edge) que dans les routes API (Node).

export const SESSION_COOKIE = "mimis_session";

/** Durée de vie d'une session, en secondes (30 jours). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type SessionPayload = {
  /** id de l'utilisateur (tel que déclaré dans APP_USERS) */
  sub: string;
  /** expiration, en secondes epoch */
  exp: number;
};

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET doit être définie et faire au moins 32 caractères.");
  }
  return secret;
}

const encoder = new TextEncoder();

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  // Allocation explicite plutôt que Uint8Array.from : garantit un ArrayBuffer
  // (et non un SharedArrayBuffer) tel que l'attendent les API Web Crypto.
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Crée un jeton signé pour l'utilisateur donné. */
export async function createSessionToken(userId: string): Promise<string> {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Vérifie la signature et l'expiration d'un jeton.
 * Retourne l'id de l'utilisateur, ou null si le jeton est invalide/expiré.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    // crypto.subtle.verify compare en temps constant.
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(encoded)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload.sub;
  } catch {
    return null;
  }
}

/** Options du cookie de session — partagées entre la pose et la suppression. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
