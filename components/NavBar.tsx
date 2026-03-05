"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const HIDE_ON = ["/login", "/reset-password", "/auth/", "/offline"];

const links = [
  { href: "/",         label: "Accueil",   icon: "⊞", exact: true  },
  { href: "/calendar", label: "Agenda",    icon: "◷", exact: false },
  { href: "/habits",   label: "Habitudes", icon: "✓", exact: false },
  { href: "/chores",   label: "Tâches",    icon: "⊡", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (link: typeof links[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
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
