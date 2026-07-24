"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

type Category = "SECTOR" | "HEBERGEMENT" | "ORGANISME" | "CITY" | "COMMUNE";

interface ConfigItem {
  id: string;
  category: string;
  key: string;
  label: string;
  emoji?: string | null;
  parentKey?: string | null;
  position: number;
}

const TABS: { id: Category; label: string; icon: string; desc: string }[] = [
  { id: "SECTOR",      label: "Secteurs d'activité", icon: "🏢", desc: "Types d'institutions (école, hôpital, foyer…)" },
  { id: "HEBERGEMENT", label: "Types de public",     icon: "👥", desc: "Publics accompagnés par les institutions" },
  { id: "ORGANISME",   label: "Organismes",           icon: "🏛️", desc: "Réseaux et organismes de tutelle" },
  { id: "CITY",        label: "Villes",               icon: "🏙️", desc: "Villes disponibles dans la recherche" },
  { id: "COMMUNE",     label: "Communes",             icon: "📍", desc: "Communes rattachées à chaque ville" },
];

const SYMBOLES = [
  { emoji: "🏫", label: "École" },
  { emoji: "🎓", label: "Enseignement spécialisé" },
  { emoji: "🏥", label: "Hôpital" },
  { emoji: "🧠", label: "Psychiatrie" },
  { emoji: "💬", label: "Santé mentale" },
  { emoji: "🏠", label: "Maison / Foyer" },
  { emoji: "🏡", label: "Maison de jeunes" },
  { emoji: "👶", label: "Petite enfance" },
  { emoji: "🧒", label: "Enfants / Jeunes" },
  { emoji: "🤝", label: "Aide / Accompagnement" },
  { emoji: "👥", label: "Communauté" },
  { emoji: "🔒", label: "Fermé / Sécurisé" },
  { emoji: "🔐", label: "IPPJ fermé" },
  { emoji: "🚪", label: "Ouvert" },
  { emoji: "🏘️", label: "Logement / Hébergement" },
  { emoji: "🛏️", label: "Internat" },
  { emoji: "📚", label: "Éducation / Devoirs" },
  { emoji: "🌿", label: "Soin / Repos" },
  { emoji: "⛺", label: "Sans-abrisme" },
  { emoji: "🍼", label: "Crèche" },
  { emoji: "🚐", label: "Mobile / Équipe terrain" },
  { emoji: "⛹️", label: "Périscolaire" },
  { emoji: "🚨", label: "Urgence" },
  { emoji: "♿", label: "Handicap" },
  { emoji: "🌸", label: "Accueil spécialisé" },
  { emoji: "🏛️", label: "Action sociale / CPAS" },
  { emoji: "☀️", label: "Centre de jour" },
  { emoji: "🏙️", label: "Ville" },
  { emoji: "📍", label: "Lieu / Commune" },
  { emoji: "⭐", label: "Mis en avant" },
  { emoji: "🌍", label: "International" },
  { emoji: "💼", label: "Emploi / Travail" },
  { emoji: "🏗️", label: "Construction / Insertion" },
  { emoji: "🎨", label: "Culture / Arts" },
  { emoji: "⚖️", label: "Justice" },
  { emoji: "🩺", label: "Santé" },
  { emoji: "🧬", label: "Sciences médicales" },
  { emoji: "🛡️", label: "Protection" },
  { emoji: "🌱", label: "Environnement" },
  { emoji: "🏄", label: "Sport / Loisirs" },
];

function SymbolePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  const isKnown = SYMBOLES.some(s => s.emoji === value);

  useEffect(() => {
    if (value && !isKnown) setCustom(true);
  }, [value, isKnown]);

  return (
    <div className="flex gap-2 items-center">
      {!custom ? (
        <select
          value={value}
          onChange={e => {
            if (e.target.value === "__custom__") { setCustom(true); onChange(""); }
            else onChange(e.target.value);
          }}
          className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900 w-52"
        >
          <option value="">— Aucun symbole —</option>
          {SYMBOLES.map(s => (
            <option key={s.emoji} value={s.emoji}>{s.emoji}  {s.label}</option>
          ))}
          <option value="__custom__">✏️  Saisir manuellement…</option>
        </select>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Colle un emoji ici"
            className="border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-40 text-stone-900"
          />
          <button type="button" onClick={() => { setCustom(false); onChange(""); }}
            className="text-xs text-stone-500 hover:text-stone-800 underline">
            Retour à la liste
          </button>
        </div>
      )}
      {value && !custom && <span className="text-2xl">{value}</span>}
    </div>
  );
}

export default function AdminConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [tab, setTab] = useState<Category>("SECTOR");
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [cities, setCities] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  // Add form
  const [newLabel, setNewLabel]   = useState("");
  const [newKey, setNewKey]       = useState("");
  const [newEmoji, setNewEmoji]   = useState("");
  const [newParent, setNewParent] = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState("");

  // Edit
  const [editId, setEditId]         = useState<string | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [editEmoji, setEditEmoji]   = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && user?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [status, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/config?category=${tab}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "COMMUNE") {
      fetch("/api/admin/config?category=CITY")
        .then(r => r.json())
        .then(d => setCities(Array.isArray(d) ? d : []));
    }
  }, [tab]);

  function resetAddForm() {
    setNewLabel(""); setNewKey(""); setNewEmoji(""); setNewParent(""); setAddError("");
  }

  async function handleSeed() {
    setSeeding(true); setSeedMsg("");
    try {
      const res = await fetch("/api/admin/config/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(data.ok ? `✅ ${data.count} éléments initialisés` : "❌ Erreur lors de l'initialisation");
      if (data.ok) load();
    } catch {
      setSeedMsg("❌ Erreur lors de l'initialisation");
    } finally {
      setSeeding(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    if (!newLabel.trim() || !newKey.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: tab,
        key: newKey.trim(),
        label: newLabel.trim(),
        emoji: newEmoji.trim() || null,
        parentKey: newParent || null,
      }),
    });
    setAdding(false);
    if (res.ok) { resetAddForm(); load(); }
    else {
      const text = await res.text();
      const err = text ? JSON.parse(text) : {};
      setAddError(err.error || "Erreur lors de l'ajout");
    }
  }

  async function handleEditSave() {
    if (!editId) return;
    setEditSaving(true);
    await fetch(`/api/admin/config/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim(), emoji: editEmoji.trim() || null }),
    });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet élément ? Cette action est irréversible.")) return;
    setDeleting(id);
    await fetch(`/api/admin/config/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  const showSymbol = tab === "SECTOR" || tab === "CITY";
  const showParent = tab === "COMMUNE";

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-8 sm:py-10">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between mb-8 gap-4">
          <div>
            <Link href="/admin" className="text-sm text-stone-700 hover:text-orange-600 transition-colors mb-2 block">
              ← Retour à l'administration
            </Link>
            <h1 className="text-2xl font-bold text-stone-900">⚙️ Configuration des listes</h1>
            <p className="text-stone-800 text-sm mt-1">
              Gérez les secteurs, villes, communes et autres données utilisées dans le site
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-white border border-stone-200 hover:bg-orange-50 hover:border-orange-300 text-stone-900 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              {seeding ? "⏳ Initialisation…" : "🔄 Initialiser depuis les valeurs par défaut"}
            </button>
            {seedMsg && (
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${seedMsg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {seedMsg}
              </span>
            )}
            <p className="text-xs text-stone-700 text-right max-w-xs">
              Importe automatiquement tous les secteurs, publics, organismes, villes et communes prédéfinis
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); resetAddForm(); setEditId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-white text-stone-900 hover:bg-orange-50 border border-stone-200"
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-800 mb-6">{TABS.find(t => t.id === tab)?.desc}</p>

        {/* Ajouter */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-stone-100">
            <p className="text-sm font-semibold text-stone-900">Ajouter un élément</p>
          </div>
          <div className="p-5">
            <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-44">
                <label className="block text-sm font-medium text-stone-900 mb-1.5">Libellé *</label>
                <input
                  value={newLabel}
                  onChange={e => {
                    setNewLabel(e.target.value);
                    if (!newKey) {
                      setNewKey(
                        e.target.value.toUpperCase()
                          .replace(/\s+/g, "_")
                          .replace(/[ÉÈÊË]/g, "E").replace(/[ÀÂÄ]/g, "A")
                          .replace(/[ÙÛÜ]/g, "U").replace(/[ÔÖ]/g, "O")
                          .replace(/[ÎÏ]/g, "I").replace(/Ç/g, "C")
                          .replace(/[^A-Z0-9_]/g, "")
                      );
                    }
                  }}
                  placeholder="ex: École maternelle"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                  required
                />
              </div>

              <div className="w-52">
                <label className="block text-sm font-medium text-stone-900 mb-1.5">Clé interne *</label>
                <input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="ECOLE_MATERNELLE"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                  required
                />
              </div>

              {showSymbol && (
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Symbole</label>
                  <SymbolePicker value={newEmoji} onChange={setNewEmoji} />
                </div>
              )}

              {showParent && (
                <div className="w-44">
                  <label className="block text-sm font-medium text-stone-900 mb-1.5">Ville</label>
                  <select
                    value={newParent}
                    onChange={e => setNewParent(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900"
                  >
                    <option value="">— Aucune —</option>
                    {cities.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={adding}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {adding ? "…" : "➕ Ajouter"}
              </button>
            </form>
            {addError && <p className="text-sm text-red-700 font-medium mt-3">{addError}</p>}
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-900">
              Liste actuelle
            </p>
            {!loading && (
              <span className="text-sm text-stone-700 font-medium">
                {items.length} élément{items.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-stone-700 text-sm">Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-stone-800 text-sm mb-2 font-medium">Aucun élément dans cette catégorie.</p>
              <p className="text-stone-700 text-sm">
                Cliquez sur "Initialiser depuis les valeurs par défaut" pour importer les données prédéfinies.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-wrap items-center gap-4 hover:bg-stone-50 transition-colors"
                >
                  <span className="text-stone-500 text-xs w-7 text-right shrink-0 font-medium">{idx + 1}</span>

                  {editId === item.id ? (
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        autoFocus
                        className="flex-1 min-w-40 border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900"
                      />
                      {showSymbol && (
                        <SymbolePicker value={editEmoji} onChange={setEditEmoji} />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditSave}
                          disabled={editSaving}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {editSaving ? "…" : "✓ Sauver"}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-stone-800 text-sm px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl w-9 text-center shrink-0">{item.emoji || ""}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900">{item.label}</p>
                        <p className="text-xs text-stone-600 font-mono">
                          {item.key}
                          {item.parentKey ? <span className="text-stone-500"> · {item.parentKey}</span> : null}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditId(item.id); setEditLabel(item.label); setEditEmoji(item.emoji || ""); }}
                          className="text-sm text-stone-700 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50 font-medium"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-sm text-stone-700 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 font-medium"
                        >
                          {deleting === item.id ? "…" : "🗑️ Supprimer"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
