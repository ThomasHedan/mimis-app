"use client";

import { useEffect, useState } from "react";
import type { Chore } from "@/lib/types";

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
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
      body: JSON.stringify({ title }),
    });
    setTitle("");
    await fetchChores();
    setAdding(false);
  }

  async function toggleChore(id: string) {
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
    await fetch(`/api/chores/${id}`, { method: "PATCH" });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    setChores((prev) => prev.filter((c) => c.id !== id));
  }

  const pending = chores.filter((c) => !c.done);
  const done = chores.filter((c) => c.done);

  return (
    <main style={s.main}>
      <h1 style={s.pageTitle}>Tâches</h1>

      {/* ── Stats ── */}
      {chores.length > 0 && (
        <div style={s.stats}>
          <span style={s.statItem}>{pending.length} à faire</span>
          <span style={s.statDivider}>·</span>
          <span style={s.statItem}>{done.length} faites</span>
        </div>
      )}

      {/* ── Formulaire ── */}
      <form onSubmit={handleAdd} style={s.form}>
        <input
          placeholder="Nouvelle tâche (ex: Faire la vaisselle…)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={s.input}
          required
        />
        <button type="submit" style={s.btn} disabled={adding}>
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {/* ── Tâches en attente ── */}
      {loading ? (
        <p style={s.empty}>Chargement…</p>
      ) : pending.length === 0 && done.length === 0 ? (
        <p style={s.empty}>Aucune tâche — ajoute-en une !</p>
      ) : (
        <>
          {pending.length === 0 ? (
            <p style={s.allDone}>Tout est fait !</p>
          ) : (
            pending.map((c) => (
              <ChoreRow key={c.id} chore={c} onToggle={toggleChore} onDelete={handleDelete} />
            ))
          )}

          {/* ── Tâches faites ── */}
          {done.length > 0 && (
            <>
              <button onClick={() => setShowDone((v) => !v)} style={s.toggleDone}>
                {showDone ? "Masquer" : "Voir"} les tâches faites ({done.length})
              </button>
              {showDone && done.map((c) => (
                <ChoreRow key={c.id} chore={c} onToggle={toggleChore} onDelete={handleDelete} />
              ))}
            </>
          )}
        </>
      )}
      <div style={{ height: "6rem" }} />
    </main>
  );
}

function ChoreRow({
  chore,
  onToggle,
  onDelete,
}: {
  chore: Chore;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={s.card}>
      <button onClick={() => onToggle(chore.id)} style={s.checkBtn}>
        <span style={chore.done ? { ...s.box, ...s.boxDone } : s.box}>
          {chore.done && "✓"}
        </span>
        <span style={chore.done ? { ...s.label, ...s.labelDone } : s.label}>
          {chore.title}
        </span>
      </button>
      <button onClick={() => onDelete(chore.id)} style={s.deleteBtn} aria-label="Supprimer">
        ×
      </button>
    </div>
  );
}

const s = {
  main: { background: "#fafafa", minHeight: "100dvh", fontFamily: "system-ui, sans-serif", padding: "0 1rem" } as React.CSSProperties,
  pageTitle: { fontSize: "1.25rem", fontWeight: 700, color: "#18181b", padding: "1.25rem 0 0.75rem", margin: 0 } as React.CSSProperties,
  stats: { display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" } as React.CSSProperties,
  statItem: { fontSize: "0.875rem", color: "#71717a" } as React.CSSProperties,
  statDivider: { color: "#d4d4d8" } as React.CSSProperties,
  form: { background: "#fff", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", display: "flex", gap: "0.5rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  input: { flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d4d4d8", fontSize: "16px", color: "#18181b" } as React.CSSProperties,
  btn: { padding: "0.625rem 1rem", borderRadius: "0.5rem", background: "#18181b", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", whiteSpace: "nowrap" as const } as React.CSSProperties,
  empty: { color: "#a1a1aa", fontSize: "0.875rem", textAlign: "center" as const, padding: "2rem 0" } as React.CSSProperties,
  allDone: { textAlign: "center" as const, padding: "1.5rem 0", color: "#16a34a", fontWeight: 600, fontSize: "0.95rem" } as React.CSSProperties,
  toggleDone: { width: "100%", background: "none", border: "none", color: "#71717a", fontSize: "0.8rem", cursor: "pointer", padding: "0.75rem 0", textAlign: "center" as const } as React.CSSProperties,
  card: { background: "#fff", borderRadius: "0.75rem", padding: "0.125rem 0.75rem 0.125rem 0", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  checkBtn: { flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 0 0.875rem 1rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const } as React.CSSProperties,
  box: { width: "1.25rem", height: "1.25rem", border: "2px solid #d4d4d8", borderRadius: "0.3rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.7rem", color: "#fff" } as React.CSSProperties,
  boxDone: { background: "#18181b", border: "2px solid #18181b" } as React.CSSProperties,
  label: { fontSize: "0.95rem", color: "#18181b" } as React.CSSProperties,
  labelDone: { textDecoration: "line-through", color: "#a1a1aa" } as React.CSSProperties,
  deleteBtn: { background: "none", border: "none", color: "#a1a1aa", fontSize: "1.25rem", cursor: "pointer", padding: "0.875rem 0.75rem", lineHeight: 1 } as React.CSSProperties,
} as const;
