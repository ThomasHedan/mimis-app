// Page d'accueil temporaire — sera remplacée par le dashboard à l'étape 2+
export default function Home() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>MimisApp</h1>
        <p style={styles.subtitle}>Notre espace privé</p>
        <div style={styles.badge}>
          ✓ PWA active
        </div>
      </div>
    </main>
  );
}

const styles = {
  main: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "1rem",
    background: "#fafafa",
  } as React.CSSProperties,

  card: {
    textAlign: "center" as const,
    padding: "2.5rem 2rem",
    borderRadius: "1rem",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    maxWidth: "20rem",
    width: "100%",
  } as React.CSSProperties,

  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#18181b",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    marginTop: "0.5rem",
    color: "#71717a",
    fontSize: "0.95rem",
  } as React.CSSProperties,

  badge: {
    marginTop: "1.5rem",
    display: "inline-block",
    padding: "0.35rem 0.8rem",
    borderRadius: "9999px",
    background: "#f0fdf4",
    color: "#16a34a",
    fontSize: "0.8rem",
    fontWeight: 500,
  } as React.CSSProperties,
} as const;
