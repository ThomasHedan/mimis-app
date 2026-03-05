"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HIDE_ON = ["/login", "/reset-password", "/auth/", "/offline"];

const links = [
  { href: "/",              label: "Accueil",   icon: "⊞", exact: true  },
  { href: "/calendar",      label: "Agenda",    icon: "◷", exact: false },
  { href: "/habits",        label: "Habitudes", icon: "✓", exact: false },
  { href: "/chores",        label: "Tâches",    icon: "⊡", exact: false },
  { href: "/budget",        label: "Budget",    icon: "€", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;
    fetch("/api/notifications?count=true")
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === "number") setUnreadCount(d.count); })
      .catch(() => {});
  }, [pathname, hidden]);

  if (hidden) return null;

  const isActive = (link: typeof links[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  const isNotifsActive = pathname.startsWith("/notifications");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  // Icône notifs avec badge
  function NotifIcon() {
    return (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
        ⊙
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-8px",
            background: "var(--red)", color: "#fff",
            borderRadius: "9999px", fontSize: "0.5rem", fontWeight: 700,
            minWidth: "0.9rem", height: "0.9rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 0.15rem", lineHeight: 1,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      {/* ── Mobile : barre du bas ── */}
      <nav className="nav-mobile">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l) ? "active" : ""}>
            <span style={{ fontSize: "1rem" }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        <Link href="/notifications" className={isNotifsActive ? "active" : ""}>
          <NotifIcon />
          Notifs
        </Link>
      </nav>

      {/* ── Desktop : sidebar gauche ── */}
      <nav className="nav-desktop">
        <span className="nav-logo">MimisApp</span>

        {links.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l) ? "active" : ""}>
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}

        <Link href="/notifications" className={isNotifsActive ? "active" : ""}>
          <NotifIcon />
          Notifications
          {unreadCount > 0 && (
            <span className="badge red" style={{ fontSize: "0.6rem", marginLeft: "auto" }}>{unreadCount}</span>
          )}
        </Link>

        <div className="nav-bottom">
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
              width: "100%", background: "none", border: "none",
              fontSize: "0.875rem", color: "var(--muted)", cursor: "pointer",
              fontFamily: "var(--font)",
            }}
          >
            <span style={{ fontSize: "1rem" }}>→</span>
            Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}
