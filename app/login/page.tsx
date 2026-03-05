"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Message volontairement générique : ne révèle pas si l'email existe
      setError("Identifiants incorrects. Vérifie ton email et mot de passe.");
      setLoading(false);
      return;
    }

    // Refresh complet pour que le middleware détecte la session immédiatement
    router.refresh();
    router.push("/");
  }

  return (
    <main style={s.main}>
      <div style={s.card}>
        <h1 style={s.title}>MimisApp</h1>
        <p style={s.subtitle}>Connexion</p>

        <form onSubmit={handleSubmit} style={s.form} noValidate>
          <div style={s.field}>
            <label htmlFor="email" style={s.label}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={s.input}
              disabled={loading}
            />
          </div>

          <div style={s.field}>
            <label htmlFor="password" style={s.label}>Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={s.input}
              disabled={loading}
            />
          </div>

          {error && <p style={s.error} role="alert">{error}</p>}

          <button type="submit" style={s.button} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
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
  subtitle: {
    marginTop: "0.25rem",
    color: "#71717a",
    fontSize: "0.9rem",
  } as React.CSSProperties,
  form: {
    marginTop: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  } as React.CSSProperties,
  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.375rem",
  } as React.CSSProperties,
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#3f3f46",
  } as React.CSSProperties,
  input: {
    padding: "0.625rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #d4d4d8",
    // 16px minimum requis sur iOS pour éviter le zoom automatique au focus
    fontSize: "16px",
    color: "#18181b",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
  error: {
    fontSize: "0.875rem",
    color: "#dc2626",
    background: "#fef2f2",
    padding: "0.625rem 0.75rem",
    borderRadius: "0.5rem",
    margin: 0,
  } as React.CSSProperties,
  button: {
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#18181b",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.25rem",
  } as React.CSSProperties,
} as const;
