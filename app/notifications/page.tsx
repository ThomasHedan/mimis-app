"use client";

import { useEffect, useState } from "react";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifs(Array.isArray(data) ? data : []);
        setLoading(false);
        // Marquer tout comme lu
        if (Array.isArray(data) && data.some((n: Notification) => !n.read)) {
          fetch("/api/notifications", { method: "PATCH" });
        }
      });
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Notifications</h1>
        {unreadCount > 0 && (
          <button
            className="btn btn-ghost"
            onClick={markAllRead}
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : notifs.length === 0 ? (
        <p className="empty-state">Aucune notification pour le moment</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notifs.map((n) => {
            const date = new Date(n.created_at);
            const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            const timeLabel = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: "1rem",
                  borderLeft: n.read ? "3px solid var(--border)" : "3px solid var(--fg)",
                  opacity: n.read ? 0.7 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {!n.read && (
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--fg)", display: "inline-block", flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{n.title}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)", flexShrink: 0, marginLeft: "0.5rem" }}>
                    {timeLabel} · {dateLabel}
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "pre-line", lineHeight: 1.6, paddingLeft: n.read ? 0 : "0.875rem" }}>
                  {n.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
