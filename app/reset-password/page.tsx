"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Une erreur est survenue. Le lien est peut-être expiré.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <main style={s.main}>
      <div style={s.card}>
        <h1 style={s.title}>Nouveau mot de passe</h1>
        <p style={s.subtitle}>Choisis un mot de passe pour ton compte.</p>

        <form onSubmit={handleSubmit} style={s.form} noValidate>
          <div style={s.field}>
            <label htmlFor="password" style={s.label}>Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={s.input}
              disabled={loading}
            />
          </div>

          <div style={s.field}>
            <label htmlFor="confirm" style={s.label}>Confirmer</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={s.input}
              disabled={loading}
            />
          </div>

          {error && <p style={s.error} role="alert">{error}</p>}

          <button type="submit" style={s.button} disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </div>
    </main>
  );
}

const s = {
  main: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100dvh", padding: "1rem", background: "#fafafa",
  } as React.CSSProperties,
  card: {
    width: "100%", maxWidth: "22rem", background: "#fff",
    borderRadius: "1rem", padding: "2rem 1.75rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  } as React.CSSProperties,
  title: {
    fontSize: "1.5rem", fontWeight: 700, color: "#18181b",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  subtitle: {
    marginTop: "0.25rem", color: "#71717a", fontSize: "0.9rem",
  } as React.CSSProperties,
  form: {
    marginTop: "1.5rem", display: "flex",
    flexDirection: "column" as const, gap: "1rem",
  } as React.CSSProperties,
  field: {
    display: "flex", flexDirection: "column" as const, gap: "0.375rem",
  } as React.CSSProperties,
  label: {
    fontSize: "0.875rem", fontWeight: 500, color: "#3f3f46",
  } as React.CSSProperties,
  input: {
    padding: "0.625rem 0.75rem", borderRadius: "0.5rem",
    border: "1px solid #d4d4d8", fontSize: "16px",
    color: "#18181b", outline: "none", width: "100%",
  } as React.CSSProperties,
  error: {
    fontSize: "0.875rem", color: "#dc2626", background: "#fef2f2",
    padding: "0.625rem 0.75rem", borderRadius: "0.5rem", margin: 0,
  } as React.CSSProperties,
  button: {
    padding: "0.75rem", borderRadius: "0.5rem", border: "none",
    background: "#18181b", color: "#fff", fontSize: "1rem",
    fontWeight: 600, cursor: "pointer", marginTop: "0.25rem",
  } as React.CSSProperties,
} as const;
