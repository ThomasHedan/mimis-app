"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/logout";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.refresh();
    router.push("/login");
  }

  return (
    <button onClick={handleLogout} style={s.button}>
      Se déconnecter
    </button>
  );
}

const s = {
  button: {
    marginTop: "1.5rem",
    width: "100%",
    padding: "0.625rem",
    borderRadius: "0.5rem",
    border: "1px solid #e4e4e7",
    background: "transparent",
    color: "#71717a",
    fontSize: "0.875rem",
    cursor: "pointer",
  } as React.CSSProperties,
} as const;
