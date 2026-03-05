"use client";

import { useEffect, useState } from "react";
import type { Habit } from "@/lib/types";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchHabits(); }, []);

  async function fetchHabits() {
    const r = await fetch("/api/habits");
    const data = await r.json();
    setHabits(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    await fetchHabits();
    setAdding(false);
  }

  async function toggleHabit(id: string) {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, logged_today: !h.logged_today } : h))
    );
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  const todayStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const loggedCount = habits.filter((h) => h.logged_today).length;

  return (
    <main style={s.main}>
      <h1 style={s.pageTitle}>Habitudes</h1>

      {/* ── Résumé du jour ── */}
      {habits.length > 0 && (
        <div style={s.summary}>
          <p style={s.summaryDate}>{todayStr}</p>
          <p style={s.summaryCount}>
            {loggedCount === habits.length
              ? "Toutes les habitudes complétées !"
              : `${loggedCount} / ${habits.length} complétées`}
          </p>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${habits.length > 0 ? (loggedCount / habits.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* ── Formulaire ── */}
      <form onSubmit={handleAdd} style={s.form}>
        <input
          placeholder="Nouvelle habitude (ex: Méditation, Sport…)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={s.input}
          required
        />
        <button type="submit" style={s.btn} disabled={adding}>
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {/* ── Liste ── */}
      {loading ? (
        <p style={s.empty}>Chargement…</p>
      ) : habits.length === 0 ? (
        <p style={s.empty}>Aucune habitude — ajoute-en une !</p>
      ) : (
        habits.map((h) => (
          <div key={h.id} style={s.card}>
            <button onClick={() => toggleHabit(h.id)} style={s.checkBtn}>
              <span style={h.logged_today ? { ...s.box, ...s.boxDone } : s.box}>
                {h.logged_today && "✓"}
              </span>
              <span style={h.logged_today ? { ...s.label, ...s.labelDone } : s.label}>
                {h.name}
              </span>
            </button>
            <button onClick={() => handleDelete(h.id)} style={s.deleteBtn} aria-label="Supprimer">
              ×
            </button>
          </div>
        ))
      )}
      <div style={{ height: "6rem" }} />
    </main>
  );
}

const s = {
  main: { background: "#fafafa", minHeight: "100dvh", fontFamily: "system-ui, sans-serif", padding: "0 1rem" } as React.CSSProperties,
  pageTitle: { fontSize: "1.25rem", fontWeight: 700, color: "#18181b", padding: "1.25rem 0 0.75rem", margin: 0 } as React.CSSProperties,
  summary: { background: "#fff", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  summaryDate: { fontSize: "0.75rem", color: "#71717a", margin: "0 0 0.2rem", textTransform: "capitalize" as const } as React.CSSProperties,
  summaryCount: { fontSize: "0.95rem", fontWeight: 600, color: "#18181b", margin: "0 0 0.75rem" } as React.CSSProperties,
  progressBar: { height: "0.4rem", background: "#f4f4f5", borderRadius: "9999px", overflow: "hidden" } as React.CSSProperties,
  progressFill: { height: "100%", background: "#18181b", borderRadius: "9999px", transition: "width 0.3s ease" } as React.CSSProperties,
  form: { background: "#fff", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", display: "flex", gap: "0.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  input: { flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d4d4d8", fontSize: "16px", color: "#18181b" } as React.CSSProperties,
  btn: { padding: "0.625rem 1rem", borderRadius: "0.5rem", background: "#18181b", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", whiteSpace: "nowrap" as const } as React.CSSProperties,
  empty: { color: "#a1a1aa", fontSize: "0.875rem", textAlign: "center" as const, padding: "2rem 0" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: "0.75rem", padding: "0.125rem 0.75rem 0.125rem 0", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  checkBtn: { flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 0 0.875rem 1rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const } as React.CSSProperties,
  box: { width: "1.25rem", height: "1.25rem", border: "2px solid #d4d4d8", borderRadius: "0.3rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.7rem", color: "#fff" } as React.CSSProperties,
  boxDone: { background: "#18181b", border: "2px solid #18181b" } as React.CSSProperties,
  label: { fontSize: "0.95rem", color: "#18181b" } as React.CSSProperties,
  labelDone: { textDecoration: "line-through", color: "#a1a1aa" } as React.CSSProperties,
  deleteBtn: { background: "none", border: "none", color: "#a1a1aa", fontSize: "1.25rem", cursor: "pointer", padding: "0.875rem 0.75rem", lineHeight: 1 } as React.CSSProperties,
} as const;
