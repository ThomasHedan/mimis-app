import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Insère une notification pour tous les utilisateurs (via la table profiles).
 * Si profiles est vide ou inaccessible, notifie au moins le créateur.
 */
export async function notifyAll(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  fallbackUserId: string,
  title: string,
  body: string
) {
  const { data: profiles } = await supabase.from("profiles").select("id");
  const ids: string[] =
    profiles && profiles.length > 0
      ? profiles.map((p: { id: string }) => p.id)
      : [fallbackUserId];

  await supabase
    .from("notifications")
    .insert(ids.map((uid) => ({ user_id: uid, title, body })));
}
