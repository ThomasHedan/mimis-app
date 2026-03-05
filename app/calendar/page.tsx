"use client";

import { useCallback, useEffect, useState } from "react";
import type { Event } from "@/lib/types";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

export default function CalendarPage() {
  const [viewDate, setViewDate]     = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [adding, setAdding]         = useState(false);
  const [form, setForm]             = useState({ title: "", description: "", start_at: "", end_at: "", all_day: false });

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.start_at) return;
    setAdding(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", description: "", start_at: "", end_at: "", all_day: false });
    setShowForm(false);
    await fetchEvents();
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((p) => p.filter((e) => e.id !== id));
  }

  // ── Calendrier grid ──
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Lundi
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Jours qui ont des événements
  const eventsByDay: Record<number, number> = {};
  for (const ev of events) {
    const d = new Date(ev.start_at);
    if (d.getMonth() === month && d.getFullYear() === year) {
      eventsByDay[d.getDate()] = (eventsByDay[d.getDate()] ?? 0) + 1;
    }
  }

  // Événements filtrés par jour sélectionné (ou tous)
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
        <button className="btn" onClick={() => setShowForm((v) => !v)} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          {showForm ? "Annuler" : "+ Événement"}
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <input placeholder="Titre *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            <input placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
            <button className="btn" type="submit" disabled={adding}>{adding ? "Ajout…" : "Ajouter"}</button>
          </form>
        </div>
      )}

      {/* ── Calendrier ── */}
      <div className="card" style={{ padding: "1rem" }}>
        {/* Navigation mois */}
        <div className="cal-header">
          <button
            onClick={() => { setViewDate(new Date(year, month - 1)); setSelectedDay(null); }}
            style={navBtn}
          >←</button>
          <span style={{ fontWeight: 600, fontSize: "0.95rem", textTransform: "capitalize" }}>{monthLabel}</span>
          <button
            onClick={() => { setViewDate(new Date(year, month + 1)); setSelectedDay(null); }}
            style={navBtn}
          >→</button>
        </div>

        {/* Jours de la semaine */}
        <div className="cal-grid" style={{ marginBottom: "0.25rem" }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="cal-day-label">{d}</div>
          ))}
        </div>

        {/* Cellules */}
        <div className="cal-grid">
          {cells.map((day, i) => {
            const isToday =
              day !== null &&
              today.getDate() === day &&
              today.getMonth() === month &&
              today.getFullYear() === year;
            const isSelected = day === selectedDay;
            const hasEvents  = day !== null && !!eventsByDay[day];

            return (
              <div
                key={i}
                onClick={() => {
                  if (!day) return;
                  setSelectedDay(isSelected ? null : day);
                }}
                className={`cal-cell${!day ? " empty" : ""}${isToday && !isSelected ? " today" : ""}${isSelected ? " selected" : ""}`}
              >
                {day}
                {hasEvents && <span className="cal-dot" />}
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

      {/* ── Liste événements ── */}
      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : displayedEvents.length === 0 ? (
        <p className="empty-state">
          {selectedDay ? "Aucun événement ce jour" : "Aucun événement ce mois"}
        </p>
      ) : (
        displayedEvents.map((ev) => (
          <div key={ev.id} className="card" style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {ev.all_day
                  ? new Date(ev.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + " · Journée"
                  : new Date(ev.start_at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                }
                {ev.end_at && !ev.all_day && " → " + new Date(ev.end_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>{ev.title}</span>
              {ev.description && <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{ev.description}</span>}
            </div>
            <button onClick={() => handleDelete(ev.id)} style={deleteBtn} aria-label="Supprimer">×</button>
          </div>
        ))
      )}
    </div>
  );
}

const navBtn:    React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.875rem" };
const deleteBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1.25rem", cursor: "pointer", lineHeight: 1, padding: "0 0 0 0.5rem" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" };
