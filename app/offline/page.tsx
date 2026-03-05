// Page affichée par le Service Worker quand l'app est hors-ligne
// et que la page demandée n'est pas en cache
export default function Offline() {
  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "1rem" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#18181b" }}>
          Hors-ligne
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#71717a" }}>
          Vérifie ta connexion et réessaie.
        </p>
      </div>
    </main>
  );
}
