"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    // Vérifie d'abord si le hash contient une erreur (lien expiré, déjà utilisé…)
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) {
      router.replace("/login?error=invalid_link");
      return;
    }

    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
      } else if (event === "SIGNED_IN") {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <p style={{ color: "#71717a", fontFamily: "system-ui, sans-serif" }}>Chargement…</p>
    </main>
  );
}
