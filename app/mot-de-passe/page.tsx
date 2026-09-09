"use client";

import { useState } from "react";
import scryptPkg from "scrypt-js";

// Mêmes paramètres que lib/auth/password.ts — le hash produit ici doit être
// bit pour bit celui que node:crypto produirait côté serveur.
const N = 32768, R = 8, P = 1, KEY_LENGTH = 64;

const { scrypt } = scryptPkg as unknown as {
  scrypt: (
    pw: Uint8Array, salt: Uint8Array,
    N: number, r: number, p: number, keylen: number,
    onProgress?: (progress: number) => void
  ) => Promise<Uint8Array>;
};

type Compte = { id: string; email: string; display_name: string; password: string };

function toBase64(bytes: Uint8Array): string {
  let binaire = "";
  for (const b of bytes) binaire += String.fromCharCode(b);
  return btoa(binaire);
}

async function hacher(motDePasse: string, onProgress: (p: number) => void): Promise<string> {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const cle = await scrypt(
    new TextEncoder().encode(motDePasse), sel, N, R, P, KEY_LENGTH, onProgress
  );
  return `scrypt:${N}:${R}:${P}:${toBase64(sel)}:${toBase64(cle)}`;
}

export default function MotDePassePage() {
  const [source, setSource]   = useState("");
  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [erreur, setErreur]   = useState<string | null>(null);
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [resultat, setResultat] = useState("");
  const [progression, setProgression] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);

  function analyser() {
    setErreur(null); setResultat(""); setComptes(null);
    try {
      const parsed = JSON.parse(source.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error();
      for (const c of parsed) {
        if (!c?.id || !c?.email || !c?.display_name || !c?.password) throw new Error();
      }
      setComptes(parsed as Compte[]);
      setSaisies({});
    } catch {
      setErreur("Ce n'est pas une valeur APP_USERS valide. Copie-la entière depuis Vercel, crochets compris.");
    }
  }

  async function generer() {
    if (!comptes) return;
    setErreur(null); setResultat(""); setCopie(false);

    const aChanger = comptes.filter((c) => saisies[c.id]?.length);
    if (aChanger.length === 0) {
      setErreur("Renseigne au moins un nouveau mot de passe.");
      return;
    }
    const tropCourt = aChanger.find((c) => saisies[c.id].length < 8);
    if (tropCourt) {
      setErreur(`Le mot de passe de ${tropCourt.display_name} fait moins de 8 caractères.`);
      return;
    }

    setProgression(0);
    const sortie: Compte[] = [];
    for (let i = 0; i < comptes.length; i++) {
      const compte = comptes[i];
      const nouveau = saisies[compte.id];
      if (!nouveau) { sortie.push(compte); continue; }
      // Le calcul est volontairement lent (c'est ce qui protège le mot de
      // passe) : sans retour visuel, un téléphone donne l'impression de figer.
      const hash = await hacher(nouveau, (p) =>
        setProgression(Math.round(((i + p) / comptes.length) * 100))
      );
      sortie.push({ ...compte, password: hash });
    }
    setProgression(null);
    setResultat(JSON.stringify(sortie));
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(resultat);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setErreur("Copie impossible — sélectionne le texte à la main.");
    }
  }

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.4rem" }}>
        Changer un mot de passe
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Tout se calcule sur cet appareil : le mot de passe que tu tapes n&apos;est envoyé
        à aucun serveur, seul le hash en ressort. Colle le résultat dans la variable
        <strong> APP_USERS</strong> de Vercel, puis redéploie.
      </p>

      <div className="card" style={{ padding: "1rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
          1 · Valeur actuelle d&apos;APP_USERS
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder='[{"id":"thomas", …}]'
          rows={4}
          style={{
            width: "100%", padding: "0.6rem", borderRadius: "0.5rem",
            border: "1px solid var(--border)", fontSize: "16px",
            fontFamily: "ui-monospace, monospace", resize: "vertical",
          }}
        />
        <button className="btn" onClick={analyser} style={{ marginTop: "0.6rem", width: "100%" }}>
          Lire les comptes
        </button>
      </div>

      {comptes && (
        <div className="card" style={{ padding: "1rem", marginTop: "0.75rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.6rem" }}>
            2 · Nouveaux mots de passe
          </label>
          {comptes.map((c) => (
            <div key={c.id} style={{ marginBottom: "0.75rem" }}>
              <label htmlFor={`mdp-${c.id}`} style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {c.display_name} — laisser vide pour ne pas changer
              </label>
              <input
                id={`mdp-${c.id}`}
                type="password"
                autoComplete="new-password"
                value={saisies[c.id] ?? ""}
                onChange={(e) => setSaisies((s) => ({ ...s, [c.id]: e.target.value }))}
                style={{
                  width: "100%", padding: "0.6rem", borderRadius: "0.5rem",
                  border: "1px solid var(--border)", fontSize: "16px", marginTop: "0.3rem",
                }}
              />
            </div>
          ))}
          <button
            className="btn"
            onClick={generer}
            disabled={progression !== null}
            style={{ width: "100%" }}
          >
            {progression !== null ? `Calcul… ${progression}%` : "Générer"}
          </button>
        </div>
      )}

      {erreur && (
        <p role="alert" style={{
          marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--red)",
          background: "#fef2f2", padding: "0.7rem", borderRadius: "0.5rem",
        }}>
          {erreur}
        </p>
      )}

      {resultat && (
        <div className="card" style={{ padding: "1rem", marginTop: "0.75rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
            3 · Nouvelle valeur d&apos;APP_USERS
          </label>
          <textarea
            readOnly
            value={resultat}
            rows={5}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: "100%", padding: "0.6rem", borderRadius: "0.5rem",
              border: "1px solid var(--border)", fontSize: "16px",
              fontFamily: "ui-monospace, monospace", resize: "vertical",
            }}
          />
          <button className="btn" onClick={copier} style={{ marginTop: "0.6rem", width: "100%" }}>
            {copie ? "Copié ✓" : "Copier"}
          </button>
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>
            Colle cette valeur dans Vercel → Settings → Environment Variables →
            APP_USERS, puis redéploie. Tant que le redéploiement n&apos;est pas
            terminé, l&apos;ancien mot de passe reste actif.
          </p>
        </div>
      )}
    </div>
  );
}
