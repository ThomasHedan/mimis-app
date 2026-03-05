"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleHash() {
      const hash = new URLSearchParams(window.location.hash.slice(1));

      // Lien expiré ou invalide — Supabase met l'erreur dans le hash
      if (hash.get("error")) {
        router.replace("/login?error=invalid_link");
        return;
      }

      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const type = hash.get("type");

      // Pas de tokens dans le hash → lien invalide
      if (!access_token || !refresh_token) {
        router.replace("/login?error=invalid_link");
        return;
      }

      // On établit la session manuellement avec les tokens du hash.
      // setSession() écrit les cookies de session côté client.
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });

      if (error) {
        router.replace("/login?error=invalid_link");
        return;
      }

      // type=recovery → reset password, sinon → accueil
      router.replace(type === "recovery" ? "/reset-password" : "/");
    }

    handleHash();
  }, [router]);

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <p style={{ color: "#71717a", fontFamily: "system-ui, sans-serif" }}>Chargement…</p>
    </main>
  );
}
