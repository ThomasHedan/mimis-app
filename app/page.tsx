"use client";

import { useEffect, useState } from "react";
import type { Event, Habit, Chore } from "@/lib/types";

export default function Dashboard() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [habits, setHabits]   = useState<Habit[]>([]);
  const [chores, setChores]   = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/habits").then((r) => r.json()),
      fetch("/api/chores").then((r) => r.json()),
    ]).then(([ev, ha, ch]) => {
      setEvents(Array.isArray(ev) ? ev : []);
      setHabits(Array.isArray(ha) ? ha : []);
      setChores(Array.isArray(ch) ? ch : []);
      setLoading(false);
    });
  }, []);

  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const todayEvents = events.filter((e) => e.start_at.startsWith(todayStr));
  const nextEvents  = events.filter((e) => !e.start_at.startsWith(todayStr)).slice(0, 3);

  // Tâches urgentes : en retard ou dues aujourd'hui, non complétées
  const urgentChores = chores.filter((c) => {
    if (c.done || !c.due_date) return false;
    return c.due_date <= todayStr;
  });

  const loggedHabits = habits.filter((h) => h.logged_today).length;

  async function toggleHabit(id: string) {
    setHabits((p) => p.map((h) => h.id === id ? { ...h, logged_today: !h.logged_today } : h));
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
  }

  async function toggleChore(id: string) {
    setChores((p) => p.map((c) => c.id === id ? { ...c, done: !c.done } : c));
    await fetch(`/api/chores/${id}`, { method: "PATCH" });
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
      <p style={{ color: "var(--muted)" }}>Chargement…</p>
    </div>
  );

  const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="page">
      {/* ── Header ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--fg)", textTransform: "capitalize" }}>
          {dateLabel}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          {habits.length > 0 && (
            <span className={`badge ${loggedHabits === habits.length ? "green" : ""}`}>
              {loggedHabits}/{habits.length} habitudes
            </span>
          )}
          {urgentChores.length > 0 && (
            <span className="badge red">{urgentChores.length} tâche{urgentChores.length > 1 ? "s" : ""} urgente{urgentChores.length > 1 ? "s" : ""}</span>
          )}
          {urgentChores.length === 0 && chores.filter(c => !c.done).length === 0 && chores.length > 0 && (
            <span className="badge green">Tout est fait !</span>
          )}
        </div>
      </div>

      {/* ── Agenda du jour ── */}
      <div className="card">
        <p className="section-title">Agenda du jour</p>
        {todayEvents.length === 0 && nextEvents.length === 0 ? (
          <p className="empty-state">Rien de prévu</p>
        ) : (
          <>
            {todayEvents.map((e) => (
              <div key={e.id} style={eRow}>
                <span style={eTime}>
                  {e.all_day ? "Journée" : new Date(e.start_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={eTitle}>{e.title}</span>
              </div>
            ))}
            {todayEvents.length === 0 && <p className="empty-state" style={{ paddingTop: 0, paddingBottom: "0.5rem", fontSize: "0.8rem" }}>Rien aujourd'hui</p>}
            {nextEvents.length > 0 && (
              <>
                <p className="section-title" style={{ paddingTop: "0.5rem" }}>À venir</p>
                {nextEvents.map((e) => (
                  <div key={e.id} style={{ ...eRow, opacity: 0.6 }}>
                    <span style={eTime}>
                      {new Date(e.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span style={eTitle}>{e.title}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Habitudes ── */}
      <div className="card">
        <p className="section-title">
          Habitudes
          {habits.length > 0 && <span style={{ color: "var(--fg)", marginLeft: "0.4rem" }}>{loggedHabits}/{habits.length}</span>}
        </p>
        {habits.length === 0 ? (
          <p className="empty-state"><a href="/habits" style={{ color: "var(--fg)" }}>Créer une habitude</a></p>
        ) : (
          habits.map((h) => (
            <button key={h.id} className="check-row" onClick={() => toggleHabit(h.id)}>
              <span className={`check-box ${h.logged_today ? "done" : ""}`}>{h.logged_today && "✓"}</span>
              <span className={`check-label ${h.logged_today ? "done" : ""}`}>{h.name}</span>
            </button>
          ))
        )}
        {habits.length > 0 && (
          <div style={{ padding: "0.5rem 1rem 0.75rem" }}>
            <div style={{ height: "4px", background: "var(--subtle)", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--fg)", borderRadius: "9999px", width: `${habits.length > 0 ? (loggedHabits / habits.length) * 100 : 0}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tâches urgentes ── */}
      <div className="card">
        <p className="section-title">
          Tâches urgentes
          {urgentChores.length > 0 && <span style={{ color: "var(--red)", marginLeft: "0.4rem" }}>{urgentChores.length}</span>}
        </p>
        {urgentChores.length === 0 ? (
          <p className="empty-state">
            Aucune tâche urgente — <a href="/chores" style={{ color: "var(--fg)" }}>voir toutes les tâches</a>
          </p>
        ) : (
          urgentChores.map((c) => {
            const isOverdue = c.due_date! < todayStr;
            return (
              <button key={c.id} className="check-row" onClick={() => toggleChore(c.id)}>
                <span className={`check-box ${c.done ? "done" : ""}`}>{c.done && "✓"}</span>
                <div style={{ flex: 1 }}>
                  <span className={`check-label ${c.done ? "done" : isOverdue ? "urgent" : ""}`}>{c.title}</span>
                  {c.due_date && (
                    <span style={{ display: "block", fontSize: "0.72rem", color: isOverdue ? "var(--red)" : "var(--muted)", marginTop: "0.1rem" }}>
                      {isOverdue ? "En retard · " : ""}
                      {new Date(c.due_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const eRow:   React.CSSProperties = { display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)" };
const eTime:  React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)", minWidth: "4rem", flexShrink: 0 };
const eTitle: React.CSSProperties = { fontSize: "0.9rem", fontWeight: 500 };
