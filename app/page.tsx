import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

// Server Component — la session est vérifiée côté serveur avant le rendu.
// Le middleware protège déjà cette route, mais on valide à nouveau ici
// pour être sûr (défense en profondeur).
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main style={s.main}>
      <div style={s.card}>
        <h1 style={s.title}>MimisApp</h1>
        <p style={s.email}>{user.email}</p>

        <div style={s.modules}>
          <div style={s.module}>Calendrier</div>
          <div style={s.module}>Habitudes</div>
          <div style={s.module}>Tâches</div>
          <div style={s.module}>Budget</div>
        </div>

        <LogoutButton />
      </div>
    </main>
  );
}

const s = {
  main: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "1rem",
    background: "#fafafa",
  } as React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: "22rem",
    background: "#fff",
    borderRadius: "1rem",
    padding: "2rem 1.75rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  } as React.CSSProperties,
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#18181b",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  email: {
    marginTop: "0.25rem",
    color: "#71717a",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  modules: {
    marginTop: "1.5rem",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  } as React.CSSProperties,
  module: {
    padding: "1rem",
    borderRadius: "0.75rem",
    background: "#fafafa",
    border: "1px solid #e4e4e7",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#3f3f46",
    textAlign: "center" as const,
  } as React.CSSProperties,
} as const;
