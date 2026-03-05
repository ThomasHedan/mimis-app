"use client";

import { useEffect, useState } from "react";
import type { Habit } from "@/lib/types";

export default function HabitsPage() {
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState("");
  const [adding, setAdding]   = useState(false);

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
    setHabits((p) => p.map((h) => h.id === id ? { ...h, logged_today: !h.logged_today } : h));
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    setHabits((p) => p.filter((h) => h.id !== id));
  }

  const logged = habits.filter((h) => h.logged_today).length;
  const pct    = habits.length > 0 ? Math.round((logged / habits.length) * 100) : 0;

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.25rem" }}>Habitudes</h1>

      {/* ── Barre de progression ── */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {logged === habits.length ? "Toutes complétées !" : `${logged} / ${habits.length} aujourd'hui`}
            </span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: logged === habits.length ? "var(--green)" : "var(--fg)" }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: "6px", background: "var(--subtle)", borderRadius: "9999px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: logged === habits.length ? "var(--green)" : "var(--fg)", width: `${pct}%`, transition: "width 0.3s ease", borderRadius: "9999px" }} />
          </div>
        </div>
      )}

      {/* ── Formulaire ── */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          placeholder="Nouvelle habitude…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit" disabled={adding}>{adding ? "…" : "Ajouter"}</button>
      </form>

      {/* ── Liste ── */}
      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : habits.length === 0 ? (
        <p className="empty-state">Aucune habitude — ajoute-en une !</p>
      ) : (
        <div className="card">
          {habits.map((h) => (
            <div key={h.id} style={{ display: "flex", alignItems: "center" }}>
              <button className="check-row" style={{ flex: 1 }} onClick={() => toggleHabit(h.id)}>
                <span className={`check-box ${h.logged_today ? "done" : ""}`}>{h.logged_today && "✓"}</span>
                <span className={`check-label ${h.logged_today ? "done" : ""}`}>{h.name}</span>
              </button>
              <button onClick={() => handleDelete(h.id)} style={deleteBtn} aria-label="Supprimer">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const deleteBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1.25rem", cursor: "pointer", padding: "0.875rem 1rem", lineHeight: 1, flexShrink: 0 };
