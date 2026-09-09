"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { logout } from "@/lib/logout";

const HIDE_ON = ["/login", "/offline"];

const links = [
  { href: "/",         label: "Accueil",   icon: "⊞", exact: true  },
  { href: "/calendar", label: "Agenda",    icon: "◷", exact: false },
  { href: "/habits",   label: "Habitudes", icon: "✓", exact: false },
  { href: "/chores",   label: "Tâches",    icon: "⊡", exact: false },
  { href: "/budget",   label: "Budget",    icon: "€", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);

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
    setConfirmLogout(false);
    await logout();
    router.refresh();
    router.push("/login");
  }

  function BellIcon() {
    return (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        ⊙
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-7px",
            background: "var(--red)", color: "#fff",
            borderRadius: "9999px", fontSize: "0.5rem", fontWeight: 700,
            minWidth: "0.85rem", height: "0.85rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 0.1rem", lineHeight: 1,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      {/* ── Mobile : barre du haut ── */}
      <div className="nav-top">
        <span className="nav-logo">MimisApp</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1.1rem" }}>
          <Link
            href="/notifications"
            style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              color: isNotifsActive ? "var(--fg)" : "var(--muted)",
              textDecoration: "none", fontSize: "0.75rem", fontWeight: 500,
            }}
          >
            <BellIcon />
            {unreadCount > 0 && <span style={{ fontSize: "0.7rem" }}>Notifs</span>}
          </Link>
          <button
            onClick={() => setConfirmLogout(true)}
            aria-label="Se déconnecter"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none", padding: 0,
              // 44 px : cible tactile minimale confortable au doigt. La barre
              // ne fait que 2,75 rem de haut, on déborde donc en marge
              // négative plutôt que de l'agrandir.
              minWidth: "44px", height: "44px", margin: "0 -0.5rem 0 0",
              color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer",
              fontFamily: "var(--font)", lineHeight: 1,
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* ── Mobile : barre du bas ── */}
      <nav className="nav-mobile">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l) ? "active" : ""}>
            <span style={{ fontSize: "1rem" }}>{l.icon}</span>
            {l.label}
          </Link>
        ))}
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
          <BellIcon />
          Notifications
          {unreadCount > 0 && (
            <span className="badge red" style={{ fontSize: "0.6rem", marginLeft: "auto" }}>{unreadCount}</span>
          )}
        </Link>

        <div className="nav-bottom">
          <button
            onClick={() => setConfirmLogout(true)}
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

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Se déconnecter ?"
      >
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          Il faudra ressaisir l&apos;email et le mot de passe pour revenir.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn" onClick={handleLogout} style={{ flex: 1 }}>
            Oui, me déconnecter
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setConfirmLogout(false)}
            style={{ flex: 1 }}
          >
            Annuler
          </button>
        </div>
      </Modal>
    </>
  );
}
