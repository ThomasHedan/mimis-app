// Liste des utilisateurs autorisés — lue depuis la variable d'environnement
// APP_USERS (Vercel). Il n'y a plus de table `users` ni de base d'authentification :
// pour une app à deux comptes, l'environnement fait office de source de vérité.
//
// Format attendu (JSON) :
//   [
//     { "id": "…", "email": "a@b.c", "display_name": "Thomas", "password": "scrypt$…" },
//     { "id": "…", "email": "d@e.f", "display_name": "Mimi",   "password": "scrypt$…" }
//   ]
//
// `password` est un hash scrypt produit par `npm run hash-password` — jamais un
// mot de passe en clair. `id` est libre mais doit rester STABLE : c'est lui qui
// est stocké dans les colonnes created_by / user_id / assigned_to de la base.
//
// Ce module n'importe rien de `node:crypto` : il doit rester utilisable depuis
// le proxy (runtime Edge). La vérification des mots de passe vit dans password.ts.

export type AppUser = {
  id: string;
  email: string;
  display_name: string;
  /** Hash scrypt, jamais exposé au client. */
  password: string;
};

/** Vue publique d'un utilisateur — c'est tout ce qui sort vers le navigateur. */
export type PublicUser = Pick<AppUser, "id" | "display_name">;

let cache: AppUser[] | null = null;

function parseUsers(raw: string): AppUser[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("APP_USERS n'est pas un JSON valide.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("APP_USERS doit être un tableau JSON non vide.");
  }

  const users = parsed.map((entry, i) => {
    const u = entry as Partial<AppUser>;
    for (const field of ["id", "email", "display_name", "password"] as const) {
      if (typeof u[field] !== "string" || !u[field]!.trim()) {
        throw new Error(`APP_USERS[${i}] : champ "${field}" manquant ou vide.`);
      }
    }
    return {
      id: u.id!.trim(),
      // L'email sert d'identifiant de connexion : on normalise pour que la
      // casse saisie au clavier n'empêche pas de se connecter.
      email: u.email!.trim().toLowerCase(),
      display_name: u.display_name!.trim(),
      password: u.password!.trim(),
    };
  });

  const ids = new Set(users.map((u) => u.id));
  if (ids.size !== users.length) throw new Error("APP_USERS : deux utilisateurs partagent le même id.");
  const emails = new Set(users.map((u) => u.email));
  if (emails.size !== users.length) throw new Error("APP_USERS : deux utilisateurs partagent le même email.");

  return users;
}

/** Tous les utilisateurs déclarés. Lève si APP_USERS est absent ou malformé. */
export function getUsers(): AppUser[] {
  if (cache) return cache;
  const raw = process.env.APP_USERS;
  if (!raw?.trim()) throw new Error("APP_USERS n'est pas définie.");
  cache = parseUsers(raw);
  return cache;
}

export function findUserById(id: string): AppUser | null {
  return getUsers().find((u) => u.id === id) ?? null;
}

export function findUserByEmail(email: string): AppUser | null {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((u) => u.email === normalized) ?? null;
}

export function toPublicUser(u: AppUser): PublicUser {
  return { id: u.id, display_name: u.display_name };
}
