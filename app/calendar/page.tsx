"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/types";

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("fr-FR", opts);

const isToday = (dateStr: string) =>
  dateStr.startsWith(new Date().toISOString().split("T")[0]);

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", start_at: "", end_at: "", all_day: false });
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    const r = await fetch("/api/events");
    const data = await r.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

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
    await fetchEvents();
    setAdding(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  // Groupe les événements par date
  const groups: Record<string, Event[]> = {};
  for (const ev of events) {
    const day = ev.start_at.split("T")[0];
    if (!groups[day]) groups[day] = [];
    groups[day].push(ev);
  }

  return (
    <main style={s.main}>
      <h1 style={s.pageTitle}>Agenda</h1>

      {/* ── Formulaire ── */}
      <form onSubmit={handleAdd} style={s.form}>
        <input
          placeholder="Titre de l'événement"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          style={s.input}
          required
        />
        <div style={s.row}>
          <input
            type="datetime-local"
            value={form.start_at}
            onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
            style={{ ...s.input, flex: 1 }}
            required
          />
          <input
            type="datetime-local"
            value={form.end_at}
            onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
            style={{ ...s.input, flex: 1 }}
            placeholder="Fin (optionnel)"
          />
        </div>
        <label style={s.checkLabel}>
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={(e) => setForm((f) => ({ ...f, all_day: e.target.checked }))}
          />
          Journée entière
        </label>
        <button type="submit" style={s.btn} disabled={adding}>
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      {/* ── Liste ── */}
      {loading ? (
        <p style={s.empty}>Chargement…</p>
      ) : Object.keys(groups).length === 0 ? (
        <p style={s.empty}>Aucun événement à venir</p>
      ) : (
        Object.entries(groups).map(([day, evs]) => (
          <div key={day} style={s.group}>
            <p style={s.dayLabel}>
              {isToday(day) ? "Aujourd'hui" : fmt(day + "T00:00:00", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {evs.map((ev) => (
              <div key={ev.id} style={s.card}>
                <div style={s.cardMain}>
                  <span style={s.cardTime}>
                    {ev.all_day ? "Toute la journée" : fmt(ev.start_at, { hour: "2-digit", minute: "2-digit" })}
                    {ev.end_at && !ev.all_day && " → " + fmt(ev.end_at, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span style={s.cardTitle}>{ev.title}</span>
                  {ev.description && <span style={s.cardDesc}>{ev.description}</span>}
                </div>
                <button onClick={() => handleDelete(ev.id)} style={s.deleteBtn} aria-label="Supprimer">
                  ×
                </button>
              </div>
            ))}
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
  form: { background: "#fff", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  input: { padding: "0.625rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #d4d4d8", fontSize: "16px", color: "#18181b", width: "100%", boxSizing: "border-box" as const } as React.CSSProperties,
  row: { display: "flex", gap: "0.5rem" } as React.CSSProperties,
  checkLabel: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#3f3f46" } as React.CSSProperties,
  btn: { padding: "0.7rem", borderRadius: "0.5rem", background: "#18181b", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" } as React.CSSProperties,
  empty: { color: "#a1a1aa", fontSize: "0.875rem", textAlign: "center" as const, padding: "2rem 0" } as React.CSSProperties,
  group: { marginBottom: "1rem" } as React.CSSProperties,
  dayLabel: { fontSize: "0.75rem", fontWeight: 700, color: "#71717a", textTransform: "capitalize" as const, letterSpacing: "0.05em", marginBottom: "0.4rem" } as React.CSSProperties,
  card: { background: "#fff", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  cardMain: { display: "flex", flexDirection: "column" as const, gap: "0.15rem", flex: 1 } as React.CSSProperties,
  cardTime: { fontSize: "0.75rem", color: "#71717a" } as React.CSSProperties,
  cardTitle: { fontSize: "0.95rem", fontWeight: 600, color: "#18181b" } as React.CSSProperties,
  cardDesc: { fontSize: "0.8rem", color: "#71717a" } as React.CSSProperties,
  deleteBtn: { background: "none", border: "none", color: "#a1a1aa", fontSize: "1.25rem", cursor: "pointer", padding: "0 0 0 0.5rem", lineHeight: 1 } as React.CSSProperties,
} as const;
