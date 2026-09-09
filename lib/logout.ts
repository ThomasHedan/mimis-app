/**
 * Déconnexion : le serveur efface le cookie de session (httpOnly, donc
 * inaccessible au JS de la page). Partagé par le bouton dédié et la NavBar.
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Hors ligne : on renvoie quand même l'utilisateur vers /login. Le cookie
    // sera refusé au prochain appel serveur.
  }
}
