import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase pour les Server Components et API Routes.
// Lit/écrit les cookies de session via next/headers.
// Les cookies sont httpOnly et Secure — non accessibles depuis le JS du navigateur.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Dans un Server Component en lecture seule, set() lève une erreur.
            // On l'ignore ici — le middleware se charge du refresh des tokens.
          }
        },
      },
    }
  );
}
