"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDE_ON = ["/login", "/reset-password", "/auth/", "/offline"];

const links = [
  { href: "/", label: "Accueil", exact: true },
  { href: "/calendar", label: "Agenda", exact: false },
  { href: "/habits", label: "Habitudes", exact: false },
  { href: "/chores", label: "Tâches", exact: false },
];

export default function NavBar() {
  const pathname = usePathname();

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav style={s.nav}>
      {links.map((link) => {
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={isActive ? { ...s.link, ...s.active } : s.link}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

const s = {
  nav: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    background: "#fff",
    borderTop: "1px solid #e4e4e7",
    // paddingBottom tient compte de la safe area iPhone (encoche bas)
    paddingBottom: "env(safe-area-inset-bottom, 0.5rem)",
    zIndex: 100,
  } as React.CSSProperties,
  link: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.75rem 0.5rem",
    fontSize: "0.7rem",
    fontWeight: 500,
    color: "#71717a",
    textDecoration: "none",
    fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  active: {
    color: "#18181b",
    fontWeight: 700,
  } as React.CSSProperties,
} as const;
