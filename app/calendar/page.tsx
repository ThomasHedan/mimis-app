"use client";

import { useCallback, useEffect, useState } from "react";
import type { Event } from "@/lib/types";
import Modal from "@/components/Modal";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

const COLOR_OPTIONS = [
  { value: "",        hex: "var(--border)", label: "Aucune" },
  { value: "blue",    hex: "#3b82f6",       label: "Bleu" },
  { value: "green",   hex: "#16a34a",       label: "Vert" },
  { value: "orange",  hex: "#d97706",       label: "Orange" },
  { value: "red",     hex: "#dc2626",       label: "Rouge" },
  { value: "purple",  hex: "#7c3aed",       label: "Violet" },
  { value: "pink",    hex: "#db2777",       label: "Rose" },
];

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", green: "#16a34a", orange: "#d97706",
  red: "#dc2626",  purple: "#7c3aed", pink: "#db2777",
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); }

const EMPTY_FORM = { title: "", description: "", location: "", color: "", start_at: "", end_at: "", all_day: false };

export default function CalendarPage() {
  const [viewDate, setViewDate]       = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [events, setEvents]           = useState<Event[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<{ open: boolean; editing: Event | null }>({ open: false, editing: null });
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const from = startOfMonth(viewDate).toISOString();
    const to   = endOfMonth(viewDate).toISOString();
    const r    = await fetch(`/api/events?from=${from}&to=${to}`);
    const data = await r.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [viewDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ open: true, editing: null });
  }

  function openEdit(ev: Event) {
    setForm({
      title:       ev.title,
      description: ev.description ?? "",
      location:    ev.location ?? "",
      color:       ev.color ?? "",
      start_at:    toDatetimeLocal(ev.start_at),
      end_at:      ev.end_at ? toDatetimeLocal(ev.end_at) : "",
      all_day:     ev.all_day,
    });
    setModal({ open: true, editing: ev });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.start_at) return;
    setSaving(true);
    const body = {
      title:       form.title.trim(),
      description: form.description || null,
      location:    form.location || null,
      color:       form.color || null,
      start_at:    form.start_at,
      end_at:      form.end_at || null,
      all_day:     form.all_day,
    };
    if (modal.editing) {
      await fetch(`/api/events/${modal.editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    closeModal();
    await fetchEvents();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((p) => p.filter((e) => e.id !== id));
  }

  // ── Grid ──
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const eventsByDay: Record<number, string[]> = {};
  for (const ev of events) {
    const d = new Date(ev.start_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev.color ?? "");
    }
  }

  const displayedEvents = selectedDay
    ? events.filter((e) => {
        const d = new Date(e.start_at);
        return d.getDate() === selectedDay && d.getMonth() === month && d.getFullYear() === year;
      })
    : events;

  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Agenda</h1>
        <button className="btn" onClick={openCreate} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          + Événement
        </button>
      </div>

      {/* ── Calendrier ── */}
      <div className="card" style={{ padding: "1rem" }}>
        <div className="cal-header">
          <button onClick={() => { setViewDate(new Date(year, month - 1)); setSelectedDay(null); }} style={navBtn}>←</button>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", textTransform: "capitalize" }}>{monthLabel}</span>
          <button onClick={() => { setViewDate(new Date(year, month + 1)); setSelectedDay(null); }} style={navBtn}>→</button>
        </div>

        <div className="cal-grid" style={{ marginBottom: "0.25rem" }}>
          {DAY_LABELS.map((d, i) => <div key={i} className="cal-day-label">{d}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map((day, i) => {
            const isToday    = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const isSelected = day === selectedDay;
            const dayColors  = day !== null ? (eventsByDay[day] ?? []) : [];
            return (
              <div
                key={i}
                onClick={() => { if (!day) return; setSelectedDay(isSelected ? null : day); }}
                className={`cal-cell${!day ? " empty" : ""}${isToday && !isSelected ? " today" : ""}${isSelected ? " selected" : ""}`}
              >
                {day}
                {dayColors.length > 0 && (
                  <span style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                    {dayColors.slice(0, 3).map((c, ci) => (
                      <span key={ci} className="cal-dot" style={{ background: isSelected ? "#fff" : (COLOR_HEX[c] ?? "var(--fg)") }} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.75rem", textAlign: "center" }}>
            {new Date(year, month, selectedDay).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            {" · "}
            <button onClick={() => setSelectedDay(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline" }}>
              tout afficher
            </button>
          </p>
        )}
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : displayedEvents.length === 0 ? (
        <p className="empty-state">{selectedDay ? "Aucun événement ce jour" : "Aucun événement ce mois"}</p>
      ) : (
        displayedEvents.map((ev) => {
          const accent = COLOR_HEX[ev.color ?? ""] ?? "var(--border)";
          return (
            <div
              key={ev.id}
              className="card"
              style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", borderLeft: `4px solid ${accent}` }}
            >
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {ev.all_day
                    ? new Date(ev.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + " · Journée"
                    : new Date(ev.start_at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  }
                  {ev.end_at && !ev.all_day && " → " + new Date(ev.end_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{ev.title}</span>
                {ev.location && (
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>📍 {ev.location}</span>
                )}
                {ev.description && (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{ev.description}</span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flexShrink: 0 }}>
                <button onClick={() => openEdit(ev)} style={iconBtn} aria-label="Modifier">✏️</button>
                <button onClick={() => handleDelete(ev.id)} style={iconBtn} aria-label="Supprimer">×</button>
              </div>
            </div>
          );
        })
      )}

      {/* ── Modal création / édition ── */}
      <Modal open={modal.open} onClose={closeModal} title={modal.editing ? "Modifier l'événement" : "Nouvel événement"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Titre *</label>
            <input placeholder="Dîner, RDV médecin…" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label style={labelStyle}>Lieu</label>
            <input placeholder="Adresse, lieu…" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea placeholder="Notes supplémentaires…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label style={labelStyle}>Début *</label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))} required />
            </div>
            <div>
              <label style={labelStyle}>Fin</label>
              <input type="datetime-local" value={form.end_at} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.all_day} onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))} />
            Journée entière
          </label>
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

const navBtn:   React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.875rem" };
const iconBtn:  React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1rem", cursor: "pointer", padding: "0.25rem 0.375rem", lineHeight: 1, borderRadius: "0.25rem" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" };
