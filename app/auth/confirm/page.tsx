"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Page de transit pour le flow Implicit de Supabase.
// Supabase redirige ici après vérification du lien email, avec les tokens
// dans le hash de l'URL (#access_token=xxx&type=recovery...).
// Le hash n'est jamais envoyé au serveur — on le lit ici côté client.
// createBrowserClient détecte automatiquement le hash et établit la session.
export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          // Lien de reset password → page de nouveau mot de passe
          router.replace("/reset-password");
        } else if (event === "SIGNED_IN") {
          // Lien d'invitation acceptée → accueil
          router.replace("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <p style={{ color: "#71717a", fontFamily: "system-ui, sans-serif" }}>Chargement…</p>
    </main>
  );
}
