"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Event, Habit, Chore } from "@/lib/types";

const COLOR_HEX: Record<string, string> = {
  blue: "#3b82f6", green: "#16a34a", orange: "#d97706",
  red: "#dc2626",  purple: "#7c3aed", pink: "#db2777",
};


function localDateStr(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const CHORE_LIMIT = 5;

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
  const todayStr = localDateStr(today);

  // Événements : aujourd'hui vs à venir
  const todayEvents = events.filter((e) => localDateStr(new Date(e.start_at)) === todayStr);
  const nextEvents  = events.filter((e) => localDateStr(new Date(e.start_at)) > todayStr).slice(0, 3);

  // Habitudes
  const loggedHabits = habits.filter((h) => h.logged_today).length;
  const pct = habits.length > 0 ? Math.round((loggedHabits / habits.length) * 100) : 0;

  // Tâches en attente triées par date limite (sans date à la fin)
  const pendingChores = chores
    .filter((c) => !c.done)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  const overdueCount  = pendingChores.filter((c) => c.due_date && c.due_date < todayStr).length;
  const visibleChores = pendingChores.slice(0, CHORE_LIMIT);
  const hiddenCount   = pendingChores.length - CHORE_LIMIT;

  async function toggleHabit(id: string) {
    setHabits((p) => p.map((h) => h.id === id ? { ...h, logged_today: !h.logged_today } : h));
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
  }

  async function toggleChore(id: string) {
    setChores((p) => p.map((c) => c.id === id ? { ...c, done: !c.done } : c));
    await fetch(`/api/chores/${id}`, { method: "PATCH" });
  }

  function dueTag(due_date: string | null): { text: string; color: string; bg: string } | null {
    if (!due_date) return null;
    if (due_date < todayStr) return { text: "En retard", color: "var(--red)", bg: "#fef2f2" };
    if (due_date === todayStr) return { text: "Aujourd'hui", color: "#d97706", bg: "#fff7ed" };
    const diff = Math.ceil((new Date(due_date + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);
    const label = new Date(due_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (diff <= 7) return { text: label, color: "var(--fg)", bg: "var(--subtle)" };
    return { text: label, color: "var(--muted)", bg: "var(--subtle)" };
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
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, textTransform: "capitalize", lineHeight: 1.2 }}>
          {dateLabel}
        </h1>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {habits.length > 0 && (
            <span className={`badge ${loggedHabits === habits.length ? "green" : ""}`}>
              {loggedHabits}/{habits.length} habitudes
            </span>
          )}
          {overdueCount > 0 && (
            <span className="badge red">{overdueCount} en retard</span>
          )}
          {overdueCount === 0 && pendingChores.length === 0 && chores.length > 0 && (
            <span className="badge green">Tout est fait !</span>
          )}
        </div>
      </div>

      {/* ── Agenda ── */}
      <div className="card">
        <div style={secHeader}>
          <span style={secTitle}>Agenda</span>
          <Link href="/calendar" style={secLink}>Voir tout →</Link>
        </div>

        {todayEvents.length === 0 && nextEvents.length === 0 ? (
          <p className="empty-state" style={{ paddingTop: "0.25rem" }}>Rien de prévu</p>
        ) : (
          <>
            {todayEvents.length === 0 ? (
              <p style={{ padding: "0.25rem 1rem 0.4rem", fontSize: "0.8rem", color: "var(--muted)" }}>Rien aujourd'hui</p>
            ) : (
              todayEvents.map((e) => {
                const accent = COLOR_HEX[e.color ?? ""];
                return (
                  <div key={e.id} style={{ ...eRow, borderLeft: accent ? `3px solid ${accent}` : "3px solid transparent" }}>
                    <span style={eTime}>
                      {e.all_day ? "Journée" : new Date(e.start_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div>
                      <div style={eTitle}>{e.title}</div>
                      {e.location && <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.1rem" }}>📍 {e.location}</div>}
                    </div>
                  </div>
                );
              })
            )}

            {nextEvents.length > 0 && (
              <>
                <div style={subLabel}>À venir</div>
                {nextEvents.map((e) => {
                  const accent = COLOR_HEX[e.color ?? ""];
                  return (
                    <div key={e.id} style={{ ...eRow, opacity: 0.65, borderLeft: accent ? `3px solid ${accent}` : "3px solid transparent" }}>
                      <span style={eTime}>
                        {new Date(e.start_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <div style={eTitle}>{e.title}</div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Habitudes ── */}
      <div className="card">
        <div style={secHeader}>
          <span style={secTitle}>Habitudes</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {habits.length > 0 && (
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: loggedHabits === habits.length ? "var(--green)" : "var(--fg)" }}>
                {pct}%
              </span>
            )}
            <Link href="/habits" style={secLink}>Voir tout →</Link>
          </div>
        </div>

        {habits.length === 0 ? (
          <p className="empty-state" style={{ paddingTop: "0.25rem" }}>
            <Link href="/habits" style={{ color: "var(--fg)" }}>Créer une habitude</Link>
          </p>
        ) : (
          <>
            {habits.map((h) => {
              const accent = COLOR_HEX[h.color ?? ""];
              return (
                <button
                  key={h.id}
                  className="check-row"
                  onClick={() => toggleHabit(h.id)}
                  style={{ borderLeft: accent ? `3px solid ${accent}` : "3px solid transparent" }}
                >
                  <span className={`check-box ${h.logged_today ? "done" : ""}`}>{h.logged_today && "✓"}</span>
                  <span className={`check-label ${h.logged_today ? "done" : ""}`}>{h.name}</span>
                </button>
              );
            })}
            <div style={{ padding: "0.5rem 1rem 0.75rem" }}>
              <div style={{ height: "4px", background: "var(--subtle)", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: loggedHabits === habits.length ? "var(--green)" : "var(--fg)",
                  width: `${pct}%`,
                  transition: "width 0.3s",
                  borderRadius: "9999px",
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Tâches ── */}
      <div className="card">
        <div style={secHeader}>
          <span style={secTitle}>Tâches</span>
          <Link href="/chores" style={secLink}>Voir tout →</Link>
        </div>

        {pendingChores.length === 0 ? (
          <p className="empty-state" style={{ paddingTop: "0.25rem" }}>
            {chores.length > 0
              ? "Tout est fait !"
              : <Link href="/chores" style={{ color: "var(--fg)" }}>Ajouter une tâche</Link>
            }
          </p>
        ) : (
          <>
            {visibleChores.map((c) => {
              const tag = dueTag(c.due_date);
              return (
                <button
                  key={c.id}
                  className="check-row"
                  onClick={() => toggleChore(c.id)}
                  style={{ borderLeft: "3px solid transparent" }}
                >
                  <span className={`check-box ${c.done ? "done" : ""}`}>{c.done && "✓"}</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className={`check-label${c.done ? " done" : ""}`}>{c.title}</span>
                    {tag && (
                      <span style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "9999px",
                        background: tag.bg,
                        color: tag.color,
                        flexShrink: 0,
                      }}>
                        {tag.text}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {hiddenCount > 0 && (
              <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                <Link href="/chores" style={{ fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" }}>
                  + {hiddenCount} tâche{hiddenCount > 1 ? "s" : ""} de plus
                </Link>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

const secHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem 0.4rem" };
const secTitle:  React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" };
const secLink:   React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)", textDecoration: "none" };
const subLabel:  React.CSSProperties = { padding: "0.4rem 1rem 0.15rem", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" };
const eRow:      React.CSSProperties = { display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", paddingLeft: "0.75rem" };
const eTime:     React.CSSProperties = { fontSize: "0.75rem", color: "var(--muted)", minWidth: "4.5rem", flexShrink: 0, paddingTop: "0.15rem" };
const eTitle:    React.CSSProperties = { fontSize: "0.9rem", fontWeight: 500 };
