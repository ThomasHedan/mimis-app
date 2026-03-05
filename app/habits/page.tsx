"use client";

import { useEffect, useState } from "react";
import type { Habit } from "@/lib/types";
import Modal from "@/components/Modal";

const COLOR_OPTIONS = [
  { value: "",       hex: "var(--border)", label: "Aucune" },
  { value: "blue",   hex: "#3b82f6",       label: "Bleu" },
  { value: "green",  hex: "#16a34a",       label: "Vert" },
  { value: "orange", hex: "#d97706",       label: "Orange" },
  { value: "red",    hex: "#dc2626",       label: "Rouge" },
  { value: "purple", hex: "#7c3aed",       label: "Violet" },
  { value: "pink",   hex: "#db2777",       label: "Rose" },
];

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", green: "#16a34a", orange: "#d97706",
  red: "#dc2626",  purple: "#7c3aed", pink: "#db2777",
};

const EMPTY_FORM = { name: "", description: "", color: "" };

export default function HabitsPage() {
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ open: boolean; editing: Habit | null }>({ open: false, editing: null });
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  useEffect(() => { fetchHabits(); }, []);

  async function fetchHabits() {
    const r = await fetch("/api/habits");
    const data = await r.json();
    setHabits(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  }

  function openEdit(h: Habit) {
    setForm({ name: h.name, description: h.description ?? "", color: h.color ?? "" });
    setModal({ open: true, editing: h });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      name:        form.name.trim(),
      description: form.description || null,
      color:       form.color || null,
    };
    if (modal.editing) {
      await fetch(`/api/habits/${modal.editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    closeModal();
    await fetchHabits();
    setSaving(false);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Habitudes</h1>
        <button className="btn" onClick={openCreate} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          + Habitude
        </button>
      </div>

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

      {/* ── Liste ── */}
      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : habits.length === 0 ? (
        <p className="empty-state">Aucune habitude — ajoute-en une !</p>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {habits.map((h) => {
            const accentHex = COLOR_HEX[h.color ?? ""];
            return (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: accentHex ? `4px solid ${accentHex}` : undefined,
                }}
              >
                <button className="check-row" style={{ flex: 1, borderBottom: "none" }} onClick={() => toggleHabit(h.id)}>
                  <span className={`check-box ${h.logged_today ? "done" : ""}`}>{h.logged_today && "✓"}</span>
                  <div style={{ flex: 1 }}>
                    <span className={`check-label ${h.logged_today ? "done" : ""}`}>{h.name}</span>
                    {h.description && (
                      <span style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.1rem" }}>
                        {h.description}
                      </span>
                    )}
                  </div>
                </button>
                <button onClick={() => openEdit(h)} style={iconBtn} aria-label="Modifier">✏️</button>
                <button onClick={() => handleDelete(h.id)} style={{ ...iconBtn, fontSize: "1.2rem" }} aria-label="Supprimer">×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal open={modal.open} onClose={closeModal} title={modal.editing ? "Modifier l'habitude" : "Nouvelle habitude"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input placeholder="Sport, méditation, lecture…" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea placeholder="Contexte ou rappel…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Couleur</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  style={{
                    width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                    background: c.hex,
                    border: form.color === c.value ? "3px solid var(--fg)" : "2px solid var(--border)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.25rem" }}>
            <button className="btn" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? "…" : modal.editing ? "Enregistrer" : "Ajouter"}
            </button>
            {modal.editing && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { const id = modal.editing!.id; closeModal(); handleDelete(id); }}
              >
                Supprimer
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

const iconBtn:    React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1rem", cursor: "pointer", padding: "0.625rem 0.5rem", lineHeight: 1, flexShrink: 0 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" };
