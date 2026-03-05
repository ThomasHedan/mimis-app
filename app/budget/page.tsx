"use client";

import { useEffect, useMemo, useState } from "react";
import type { BudgetCategory, BudgetEntry } from "@/lib/types";
import Modal from "@/components/Modal";

const COLOR_HEX: Record<string, string> = {
  blue:   "#3b82f6",
  green:  "#16a34a",
  orange: "#d97706",
  red:    "#dc2626",
  purple: "#7c3aed",
  pink:   "#db2777",
  teal:   "#0d9488",
  yellow: "#ca8a04",
};

const COLOR_OPTIONS = [
  { value: "blue",   hex: "#3b82f6" },
  { value: "green",  hex: "#16a34a" },
  { value: "orange", hex: "#d97706" },
  { value: "red",    hex: "#dc2626" },
  { value: "purple", hex: "#7c3aed" },
  { value: "pink",   hex: "#db2777" },
  { value: "teal",   hex: "#0d9488" },
  { value: "yellow", hex: "#ca8a04" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR",
    maximumFractionDigits: 2, minimumFractionDigits: 0,
  }).format(n);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Donut chart via conic-gradient ───────────────────────────
function DonutChart({ segments, pct }: {
  segments: { color: string; value: number }[];
  pct: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let gradient: string;
  if (total === 0) {
    gradient = "#f4f4f5";
  } else {
    let cum = 0;
    gradient = "conic-gradient(" + segments.map((seg) => {
      const start = (cum / total) * 360;
      cum += seg.value;
      const end = (cum / total) * 360;
      return `${seg.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    }).join(", ") + ")";
  }

  return (
    <div style={{ position: "relative", width: "130px", height: "130px", flexShrink: 0 }}>
      <div style={{ width: "130px", height: "130px", borderRadius: "50%", background: gradient }} />
      <div style={{
        position: "absolute", top: "22%", left: "22%", width: "56%", height: "56%",
        borderRadius: "50%", background: "var(--surface)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: "0.55rem", color: "var(--muted)", fontWeight: 600, marginTop: "0.1rem" }}>utilisé</span>
      </div>
    </div>
  );
}

const EMPTY_ENTRY = { category_id: "", amount: "", note: "", date: "" };
const EMPTY_CAT   = { name: "", color: "blue", monthly_limit: "", icon: "" };

export default function BudgetPage() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [entries, setEntries]       = useState<BudgetEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [viewDate, setViewDate]     = useState(new Date());

  // Entry modal
  const [entryModal, setEntryModal]   = useState(false);
  const [entryForm, setEntryForm]     = useState(EMPTY_ENTRY);
  const [savingEntry, setSavingEntry] = useState(false);

  // Categories modal
  const [catModal, setCatModal]           = useState(false);
  const [catForm, setCatForm]             = useState(EMPTY_CAT);
  const [editingCatId, setEditingCatId]   = useState<string | null>(null);
  const [savingCat, setSavingCat]         = useState(false);

  const month = monthKey(viewDate);

  useEffect(() => { fetchAll(); }, [month]);

  async function fetchAll() {
    setLoading(true);
    const [cats, ents] = await Promise.all([
      fetch("/api/budget/categories").then((r) => r.json()),
      fetch(`/api/budget/entries?month=${month}`).then((r) => r.json()),
    ]);
    setCategories(Array.isArray(cats) ? cats : []);
    setEntries(Array.isArray(ents) ? ents : []);
    setLoading(false);
  }

  // ── Computed ──────────────────────────────────────────────
  const spentByCategory = useMemo(() =>
    entries.reduce((acc, e) => {
      acc[e.category_id] = (acc[e.category_id] ?? 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>)
  , [entries]);

  const totalBudget = useMemo(() => categories.reduce((s, c) => s + Number(c.monthly_limit), 0), [categories]);
  const totalSpent  = useMemo(() => Object.values(spentByCategory).reduce((s, v) => s + v, 0), [spentByCategory]);
  const remaining   = totalBudget - totalSpent;
  const pct         = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const donutSegments = useMemo(() => {
    const segs: { color: string; value: number }[] = [];
    for (const cat of categories) {
      const spent = spentByCategory[cat.id] ?? 0;
      if (spent > 0) segs.push({ color: COLOR_HEX[cat.color] ?? "#71717a", value: spent });
    }
    if (remaining > 0) segs.push({ color: "#f4f4f5", value: remaining });
    return segs;
  }, [categories, spentByCategory, remaining]);

  const categoryMap = useMemo(() =>
    Object.fromEntries(categories.map((c) => [c.id, c]))
  , [categories]);

  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
  , [entries]);

  // ── Entry actions ──────────────────────────────────────────
  function openEntryModal() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    setEntryForm({ ...EMPTY_ENTRY, date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` });
    setEntryModal(true);
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryForm.category_id || !entryForm.amount) return;
    setSavingEntry(true);
    await fetch("/api/budget/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: entryForm.category_id,
        amount: Number(entryForm.amount),
        note: entryForm.note || null,
        date: entryForm.date,
      }),
    });
    setEntryModal(false);
    await fetchAll();
    setSavingEntry(false);
  }

  async function handleDeleteEntry(id: string) {
    await fetch(`/api/budget/entries/${id}`, { method: "DELETE" });
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  // ── Category actions ───────────────────────────────────────
  function openAddCategory() { setEditingCatId(null); setCatForm(EMPTY_CAT); }

  function openEditCategory(cat: BudgetCategory) {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, color: cat.color, monthly_limit: String(cat.monthly_limit), icon: cat.icon ?? "" });
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setSavingCat(true);
    const body = {
      name: catForm.name.trim(),
      color: catForm.color,
      monthly_limit: Number(catForm.monthly_limit) || 0,
      icon: catForm.icon.trim() || null,
    };
    if (editingCatId) {
      await fetch(`/api/budget/categories/${editingCatId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/budget/categories", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }
    setEditingCatId(null);
    setCatForm(EMPTY_CAT);
    setSavingCat(false);
    await fetchAll();
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/budget/categories/${id}`, { method: "DELETE" });
    setCategories((p) => p.filter((c) => c.id !== id));
    setEntries((p) => p.filter((e) => e.category_id !== id));
    if (editingCatId === id) { setEditingCatId(null); setCatForm(EMPTY_CAT); }
  }

  // ── Render ─────────────────────────────────────────────────
  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="page">

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Budget</h1>
        <button
          className="btn btn-ghost"
          onClick={() => { openAddCategory(); setCatModal(true); }}
          style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
        >
          ⚙ Catégories
        </button>
      </div>

      {/* ── Navigation mois ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <button onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navBtn}>←</button>
        <span style={{ fontWeight: 600, fontSize: "0.95rem", textTransform: "capitalize" }}>{monthLabel}</span>
        <button onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navBtn}>→</button>
      </div>

      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : categories.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            Commence par créer tes catégories de budget.
          </p>
          <button className="btn" onClick={() => { openAddCategory(); setCatModal(true); }}>
            + Créer une catégorie
          </button>
        </div>
      ) : (
        <>
          {/* ── Résumé + Donut ── */}
          <div className="card" style={{ padding: "1.25rem 1rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
              <DonutChart segments={donutSegments} pct={pct} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={summaryRow}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Dépensé</span>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{fmt(totalSpent)}</span>
                </div>
                <div style={summaryRow}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Budget</span>
                  <span style={{ fontSize: "0.9rem" }}>{fmt(totalBudget)}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem", ...summaryRow }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Reste</span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: remaining >= 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt(remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Légende couleurs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
              {categories.filter((c) => (spentByCategory[c.id] ?? 0) > 0).map((cat) => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLOR_HEX[cat.color] ?? "var(--fg)", flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{cat.icon ? `${cat.icon} ` : ""}{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Par catégorie ── */}
          <div className="card" style={{ marginBottom: "0.75rem", overflow: "hidden" }}>
            <div style={secHeader}>
              <span style={secTitle}>Par catégorie</span>
            </div>
            {categories.map((cat) => {
              const spent      = spentByCategory[cat.id] ?? 0;
              const limit      = Number(cat.monthly_limit);
              const catPct     = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : null;
              const overBudget = limit > 0 && spent > limit;
              const barColor   = overBudget ? "var(--red)" : (COLOR_HEX[cat.color] ?? "var(--fg)");

              return (
                <div key={cat.id} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: limit > 0 ? "0.4rem" : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLOR_HEX[cat.color] ?? "var(--fg)", flexShrink: 0, display: "inline-block" }} />
                      {cat.icon && <span style={{ fontSize: "0.95rem" }}>{cat.icon}</span>}
                      <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{cat.name}</span>
                      {overBudget && <span className="badge red" style={{ fontSize: "0.6rem" }}>Dépassé</span>}
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{fmt(spent)}</span>
                      {limit > 0 && <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}> / {fmt(limit)}</span>}
                    </div>
                  </div>
                  {limit > 0 && (
                    <div style={{ height: "4px", background: "var(--subtle)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${catPct}%`, background: barColor, borderRadius: "9999px", transition: "width 0.3s" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Dépenses ── */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={secHeader}>
              <span style={secTitle}>Dépenses du mois</span>
              <button className="btn" onClick={openEntryModal} style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}>
                + Ajouter
              </button>
            </div>
            {sortedEntries.length === 0 ? (
              <p className="empty-state" style={{ paddingTop: "0.25rem" }}>Aucune dépense ce mois</p>
            ) : (
              sortedEntries.map((entry) => {
                const cat      = categoryMap[entry.category_id];
                const dotColor = cat ? (COLOR_HEX[cat.color] ?? "var(--fg)") : "var(--muted)";
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.625rem 1rem", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0, minWidth: "3.5rem" }}>
                      {new Date(entry.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "0.875rem" }}>{entry.note || cat?.name || "—"}</span>
                      {entry.note && cat && (
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: "0.4rem" }}>{cat.name}</span>
                      )}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", flexShrink: 0 }}>-{fmt(Number(entry.amount))}</span>
                    <button onClick={() => handleDeleteEntry(entry.id)} style={deleteBtn} aria-label="Supprimer">×</button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Modal : Nouvelle dépense ── */}
      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Nouvelle dépense">
        <form onSubmit={handleAddEntry} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Catégorie *</label>
            <select value={entryForm.category_id} onChange={(e) => setEntryForm((f) => ({ ...f, category_id: e.target.value }))} required>
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label style={labelStyle}>Montant *</label>
              <input type="number" step="0.01" min="0.01" placeholder="0.00" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <input placeholder="Restaurant, courses, abonnement…" value={entryForm.note} onChange={(e) => setEntryForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <button className="btn" type="submit" disabled={savingEntry} style={{ marginTop: "0.25rem" }}>
            {savingEntry ? "…" : "Ajouter"}
          </button>
        </form>
      </Modal>

      {/* ── Modal : Gérer les catégories ── */}
      <Modal
        open={catModal}
        onClose={() => { setCatModal(false); setEditingCatId(null); setCatForm(EMPTY_CAT); }}
        title="Catégories"
      >
        {/* Liste existante */}
        {categories.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.75rem" }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                  background: editingCatId === cat.id ? "var(--subtle)" : "transparent",
                }}
              >
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: COLOR_HEX[cat.color] ?? "var(--fg)", flexShrink: 0, display: "inline-block" }} />
                {cat.icon && <span style={{ fontSize: "0.9rem" }}>{cat.icon}</span>}
                <span style={{ flex: 1, fontSize: "0.875rem" }}>{cat.name}</span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{fmt(Number(cat.monthly_limit))}/mois</span>
                <button onClick={() => openEditCategory(cat)} style={iconBtn}>✏️</button>
                <button onClick={() => handleDeleteCategory(cat.id)} style={{ ...iconBtn, fontSize: "1.1rem" }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire ajout / édition */}
        <div style={{ borderTop: categories.length > 0 ? "1px solid var(--border)" : "none", paddingTop: categories.length > 0 ? "0.75rem" : "0" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>
            {editingCatId ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </p>
          <form onSubmit={handleSaveCategory} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.5rem" }}>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input placeholder="Nourriture, Sorties…" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label style={labelStyle}>Icône</label>
                <input placeholder="🍕" value={catForm.icon} onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Objectif mensuel (€)</label>
              <input type="number" step="1" min="0" placeholder="500" value={catForm.monthly_limit} onChange={(e) => setCatForm((f) => ({ ...f, monthly_limit: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Couleur</label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCatForm((f) => ({ ...f, color: c.value }))}
                    style={{
                      width: "1.4rem", height: "1.4rem", borderRadius: "50%",
                      background: c.hex,
                      border: catForm.color === c.value ? "3px solid var(--fg)" : "2px solid var(--border)",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <button className="btn" type="submit" disabled={savingCat} style={{ flex: 1 }}>
                {savingCat ? "…" : editingCatId ? "Enregistrer" : "Créer"}
              </button>
              {editingCatId && (
                <button type="button" className="btn btn-ghost" onClick={() => { setEditingCatId(null); setCatForm(EMPTY_CAT); }}>
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

const navBtn:    React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.875rem" };
const summaryRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const secHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem 0.5rem" };
const secTitle:  React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em" };
const deleteBtn: React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "1.2rem", cursor: "pointer", padding: "0.2rem 0.3rem", lineHeight: 1, flexShrink: 0 };
const iconBtn:   React.CSSProperties = { background: "none", border: "none", color: "var(--muted)", fontSize: "0.9rem", cursor: "pointer", padding: "0.2rem 0.3rem", lineHeight: 1 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.3rem" };
