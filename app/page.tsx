"use client";

import { useEffect, useState } from "react";
import type { Event, Habit, Chore } from "@/lib/types";

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString("fr-FR", opts);

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
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

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayEvents = events.filter((e) => e.start_at.startsWith(todayStr));
  const upcomingEvents = events.filter((e) => !e.start_at.startsWith(todayStr)).slice(0, 3);
  const pendingChores = chores.filter((c) => !c.done);
  const loggedCount = habits.filter((h) => h.logged_today).length;

  async function toggleHabit(id: string) {
    // Mise à jour optimiste pour une UX réactive
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, logged_today: !h.logged_today } : h))
    );
    await fetch(`/api/habits/${id}/log`, { method: "POST" });
  }

  async function toggleChore(id: string) {
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
    await fetch(`/api/chores/${id}`, { method: "PATCH" });
  }

  if (loading) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
        <p style={{ color: "#71717a", fontFamily: "system-ui, sans-serif" }}>Chargement…</p>
      </main>
    );
  }

  return (
    <main style={s.main}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div>
          <p style={s.greeting}>Bonjour</p>
          <p style={s.date}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={s.statsRow}>
          <span style={habits.length > 0 && loggedCount === habits.length ? { ...s.badge, ...s.badgeGreen } : s.badge}>
            {loggedCount}/{habits.length} habitudes
          </span>
          <span style={pendingChores.length === 0 ? { ...s.badge, ...s.badgeGreen } : s.badge}>
            {pendingChores.length} tâches
          </span>
        </div>
      </header>

      {/* ── Événements du jour ── */}
      <section style={s.section}>
        <h2 style={s.title}>Aujourd'hui</h2>
        {todayEvents.length === 0 ? (
          <p style={s.empty}>Rien de prévu</p>
        ) : (
          todayEvents.map((e) => (
            <div key={e.id} style={s.eventRow}>
              <span style={s.eventTime}>
                {e.all_day ? "Journée" : fmt(e.start_at, { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={s.eventTitle}>{e.title}</span>
            </div>
          ))
        )}
        {upcomingEvents.length > 0 && (
          <>
            <p style={{ ...s.empty, marginTop: "0.75rem" }}>À venir</p>
            {upcomingEvents.map((e) => (
              <div key={e.id} style={{ ...s.eventRow, opacity: 0.65 }}>
                <span style={s.eventTime}>
                  {fmt(e.start_at, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span style={s.eventTitle}>{e.title}</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* ── Habitudes ── */}
      <section style={s.section}>
        <h2 style={s.title}>
          Habitudes{habits.length > 0 && <span style={s.count}> {loggedCount}/{habits.length}</span>}
        </h2>
        {habits.length === 0 ? (
          <p style={s.empty}>
            <a href="/habits" style={s.link}>Créer une habitude</a>
          </p>
        ) : (
          habits.map((h) => (
            <button key={h.id} onClick={() => toggleHabit(h.id)} style={s.checkRow}>
              <span style={h.logged_today ? { ...s.box, ...s.boxDone } : s.box}>
                {h.logged_today && "✓"}
              </span>
              <span style={h.logged_today ? { ...s.checkLabel, ...s.checkLabelDone } : s.checkLabel}>
                {h.name}
              </span>
            </button>
          ))
        )}
      </section>

      {/* ── Tâches ── */}
      <section style={{ ...s.section, paddingBottom: "6rem" }}>
        <h2 style={s.title}>
          Tâches{pendingChores.length > 0 && <span style={s.count}> {pendingChores.length}</span>}
        </h2>
        {pendingChores.length === 0 ? (
          <p style={s.empty}>Aucune tâche en attente 🎉 <a href="/chores" style={s.link}>Gérer</a></p>
        ) : (
          pendingChores.map((c) => (
            <button key={c.id} onClick={() => toggleChore(c.id)} style={s.checkRow}>
              <span style={s.box}></span>
              <span style={s.checkLabel}>{c.title}</span>
            </button>
          ))
        )}
      </section>
    </main>
  );
}

const s = {
  main: { background: "#fafafa", minHeight: "100dvh", fontFamily: "system-ui, sans-serif" } as React.CSSProperties,
  header: { padding: "1.25rem 1rem 0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" } as React.CSSProperties,
  greeting: { fontSize: "0.8rem", color: "#71717a", margin: 0 } as React.CSSProperties,
  date: { fontSize: "1.05rem", fontWeight: 600, color: "#18181b", margin: "0.15rem 0 0", textTransform: "capitalize" as const } as React.CSSProperties,
  statsRow: { display: "flex", flexDirection: "column" as const, gap: "0.3rem", alignItems: "flex-end" } as React.CSSProperties,
  badge: { fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "9999px", background: "#f4f4f5", color: "#71717a", fontWeight: 500 } as React.CSSProperties,
  badgeGreen: { background: "#f0fdf4", color: "#16a34a" } as React.CSSProperties,
  section: { margin: "0.5rem 1rem", background: "#fff", borderRadius: "0.75rem", padding: "1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } as React.CSSProperties,
  title: { fontSize: "0.8rem", fontWeight: 700, color: "#71717a", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 0.75rem" } as React.CSSProperties,
  count: { color: "#18181b" } as React.CSSProperties,
  empty: { fontSize: "0.875rem", color: "#a1a1aa", margin: 0 } as React.CSSProperties,
  link: { color: "#18181b", fontWeight: 500 } as React.CSSProperties,
  eventRow: { display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f5" } as React.CSSProperties,
  eventTime: { fontSize: "0.75rem", color: "#71717a", minWidth: "3.5rem", flexShrink: 0 } as React.CSSProperties,
  eventTitle: { fontSize: "0.9rem", color: "#18181b", fontWeight: 500 } as React.CSSProperties,
  checkRow: { width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderBottom: "1px solid #f4f4f5" } as React.CSSProperties,
  box: { width: "1.25rem", height: "1.25rem", border: "2px solid #d4d4d8", borderRadius: "0.3rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.7rem", color: "#fff" } as React.CSSProperties,
  boxDone: { background: "#18181b", border: "2px solid #18181b" } as React.CSSProperties,
  checkLabel: { fontSize: "0.9rem", color: "#18181b" } as React.CSSProperties,
  checkLabelDone: { textDecoration: "line-through", color: "#a1a1aa" } as React.CSSProperties,
} as const;
