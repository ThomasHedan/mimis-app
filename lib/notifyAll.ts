import { query } from "@/lib/db";
import { getUsers } from "@/lib/auth/users";
import { sendPushToAll } from "@/lib/webpush";

/**
 * Insère une notification pour chaque utilisateur déclaré dans APP_USERS
 * et envoie un push web à tous les abonnés.
 *
 * Ne lève jamais : une notification qui échoue ne doit pas faire échouer
 * la création de la tâche ou de l'événement qui l'a déclenchée.
 */
export async function notifyAll(title: string, body: string) {
  try {
    const ids = getUsers().map((u) => u.id);

    // unnest() : une seule requête pour insérer une ligne par utilisateur.
    await query(
      `INSERT INTO notifications (user_id, title, body)
       SELECT unnest($1::text[]), $2, $3`,
      [ids, title, body]
    );
  } catch (error) {
    console.error("[notifyAll] Erreur insertion notifications:", error);
  }

  try {
    await sendPushToAll(title, body);
  } catch (error) {
    console.error("[notifyAll] Erreur envoi push:", error);
  }
}
