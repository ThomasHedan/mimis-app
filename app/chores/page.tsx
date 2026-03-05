"use client";

import { useEffect, useMemo, useState } from "react";
import type { Chore, Profile } from "@/lib/types";
import Modal from "@/components/Modal";

const PRIORITY_LABEL: Record<string, string> = { high: "Urgent", medium: "Normal", low: "Bas" };
const PRIORITY_BADGE: Record<string, string> = { high: "red", medium: "", low: "" };

const EMPTY_FORM = { title: "", due_date: "", assigned_to: "", priority: "medium", notes: "" };

export default function ChoresPage() {
  const [chores, setChores]     = useState<Chore[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{ open: boolean; editing: Chore | null }>({ open: false, editing: null });
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetchChores();
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(Array.isArray(d) ? d : []));
  }, []);

  async function fetchChores() {
    const r = await fetch("/api/chores");
    const data = await r.json();
    setChores(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p.display_name])),
    [profiles]
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  }

  function openEdit(c: Chore) {
    setForm({
      title:       c.title,
      due_date:    c.due_date ?? "",
      assigned_to: c.assigned_to ?? "",
      priority:    c.priority ?? "medium",
      notes:       c.notes ?? "",
    });
    setModal({ open: true, editing: c });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const body = {
      title:       form.title.trim(),
      due_date:    form.due_date || null,
      assigned_to: form.assigned_to || null,
      priority:    form.priority,
      notes:       form.notes || null,
    };
    if (modal.editing) {
      await fetch(`/api/chores/${modal.editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/chores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    closeModal();
    await fetchChores();
    setSaving(false);
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

  function ChoreRow({ c, showActions = true }: { c: Chore; showActions?: boolean }) {
    const due        = dueLabel(c);
    const assignee   = c.assigned_to ? profileMap[c.assigned_to] : null;
    const isUrgent   = due?.color === "var(--red)";

    return (
      <div style={{ display: "flex", alignItems: "flex-start", borderBottom: "1px solid var(--border)", padding: "0.75rem 1rem" }}>
        {/* Checkbox */}
        <button
          onClick={() => toggleChore(c.id)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0.75rem 0 0", flexShrink: 0 }}
          aria-label="Cocher"
        >
          <span className={`check-box ${c.done ? "done" : ""}`}>{c.done && "✓"}</span>
        </button>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => toggleChore(c.id)}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", cursor: "pointer" }}>
            <span className={`check-label${c.done ? " done" : ""}${isUrgent && !c.done ? " urgent" : ""}`}>{c.title}</span>
            {!c.done && c.priority === "high" && (
              <span className="badge red" style={{ fontSize: "0.62rem" }}>Urgent</span>
            )}
            {!c.done && c.priority === "low" && (
              <span className="badge" style={{ fontSize: "0.62rem" }}>Bas</span>
            )}
          </div>
          {(due || assignee) && !c.done && (
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
              {due && <span style={{ fontSize: "0.72rem", color: due.color }}>{due.text}</span>}
              {assignee && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>👤 {assignee}</span>}
            </div>
          )}
          {c.notes && !c.done && (
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem", lineHeight: 1.4 }}>{c.notes}</p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div style={{ display: "flex", gap: "0.1rem", flexShrink: 0, marginLeft: "0.25rem" }}>
            <button onClick={() => openEdit(c)} style={iconBtn} aria-label="Modifier">✏️</button>
            <button onClick={() => handleDelete(c.id)} style={{ ...iconBtn, fontSize: "1.2rem" }} aria-label="Supprimer">×</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Tâches</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {chores.length > 0 && (
            <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
              {pending.length} à faire · {done.length} faites
            </span>
          )}
          <button className="btn" onClick={openCreate} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            + Tâche
          </button>
        </div>
      </div>

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
            <div className="card" style={{ overflow: "hidden" }}>
              {pending.map((c) => <ChoreRow key={c.id} c={c} />)}
            </div>
          )}

          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowDone((v) => !v)}
                style={{ width: "100%", background: "none", border: "none", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer", padding: "0.75rem 0", textAlign: "center" as const }}
              >
                {showDone ? "Masquer" : "Voir"} les tâches faites ({done.length})
              </button>
              {showDone && (
                <div className="card" style={{ overflow: "hidden" }}>
                  {done.map((c) => <ChoreRow key={c.id} c={c} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modal ── */}
      <Modal open={modal.open} onClose={closeModal} title={modal.editing ? "Modifier la tâche" : "Nouvelle tâche"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input placeholder="Faire la vaisselle, appeler…" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label style={labelStyle}>Priorité</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="low">Bas</option>
                <option value="medium">Normal</option>
                <option value="high">Urgent</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date limite</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>

          {profiles.length > 0 && (
            <div>
              <label style={labelStyle}>Assignée à</label>
              <select value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">— Personne —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea placeholder="Détails supplémentaires…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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

const iconBtn:    React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1rem", cursor: "pointer", padding: "0.375rem", lineHeight: 1, borderRadius: "0.25rem" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" };
