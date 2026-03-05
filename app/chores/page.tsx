"use client";

import { useEffect, useState } from "react";
import type { Chore } from "@/lib/types";

export default function ChoresPage() {
  const [chores, setChores]   = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle]     = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding]   = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => { fetchChores(); }, []);

  async function fetchChores() {
    const r = await fetch("/api/chores");
    const data = await r.json();
    setChores(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, due_date: dueDate || null }),
    });
    setTitle("");
    setDueDate("");
    await fetchChores();
    setAdding(false);
  }

  async function toggleChore(id: string) {
    setChores((p) => p.map((c) => c.id === id ? { ...c, done: !c.done } : c));
    await fetch(`/api/chores/${id}`, { method: "PATCH" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    setChores((p) => p.filter((c) => c.id !== id));
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const pending  = chores.filter((c) => !c.done);
  const done     = chores.filter((c) => c.done);

  function dueLabel(c: Chore) {
    if (!c.due_date) return null;
    const isOverdue = c.due_date < todayStr;
    const isToday   = c.due_date === todayStr;
    const date      = new Date(c.due_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (isOverdue) return { text: `En retard · ${date}`, color: "var(--red)" };
    if (isToday)   return { text: `Aujourd'hui · ${date}`, color: "#d97706" };
    return { text: date, color: "var(--muted)" };
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Tâches</h1>
        {chores.length > 0 && (
          <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
            {pending.length} à faire · {done.length} faites
          </span>
        )}
      </div>

      {/* ── Formulaire ── */}
      <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            placeholder="Nouvelle tâche…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit" disabled={adding}>{adding ? "…" : "Ajouter"}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--muted)", whiteSpace: "nowrap" }}>Date limite</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </form>

      {/* ── Tâches à faire ── */}
      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : pending.length === 0 && done.length === 0 ? (
        <p className="empty-state">Aucune tâche — ajoute-en une !</p>
      ) : (
        <>
          {pending.length === 0 ? (
            <p style={{ textAlign: "center", padding: "1rem", color: "var(--green)", fontWeight: 600, fontSize: "0.95rem" }}>
              Tout est fait !
            </p>
          ) : (
            <div className="card">
              {pending.map((c) => {
                const due = dueLabel(c);
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center" }}>
                    <button className="check-row" style={{ flex: 1 }} onClick={() => toggleChore(c.id)}>
                      <span className="check-box">{c.done && "✓"}</span>
                      <div style={{ flex: 1 }}>
                        <span className={`check-label${due?.color === "var(--red)" ? " urgent" : ""}`}>{c.title}</span>
                        {due && (
                          <span style={{ display: "block", fontSize: "0.72rem", color: due.color, marginTop: "0.1rem" }}>
                            {due.text}
                          </span>
                        )}
                      </div>
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={deleteBtn} aria-label="Supprimer">×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tâches faites ── */}
          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowDone((v) => !v)}
                style={{ width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer", padding: "0.75rem 0", textAlign: "center" as const }}
              >
                {showDone ? "Masquer" : "Voir"} les tâches faites ({done.length})
              </button>
              {showDone && (
                <div className="card">
                  {done.map((c) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center" }}>
                      <button className="check-row" style={{ flex: 1 }} onClick={() => toggleChore(c.id)}>
                        <span className="check-box done">✓</span>
                        <span className="check-label done">{c.title}</span>
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={deleteBtn} aria-label="Supprimer">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const deleteBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1.25rem", cursor: "pointer", padding: "0.875rem 1rem", lineHeight: 1, flexShrink: 0 };
