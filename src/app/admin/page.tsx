"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Subscription {
  id: string;
  plan: string;
  status: string;
  startDate?: string;
  endDate?: string;
  price?: number;
  institution: { name: string; commune: string };
  [key: string]: unknown;
}

interface InstitutionSub {
  id: string;
  status: string;
  plan: string;
  jobsAddonPacks?: number;
  jobOffersAddonPacks?: number;
  endDate?: string;
}

interface InstitutionAdmin {
  id: string;
  name: string;
  commune: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  boosted?: boolean;
  boostEndDate?: string;
  subscription: InstitutionSub | null;
  completeness: {
    score: number;
    total: number;
    percent: number;
    missing: string[];
  };
  stats: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    rejected: number;
    slots: number;
  };
}

/* ── Configs ────────────────────────────────────────────────────────────── */
const subStatus: Record<string, { label: string; color: string; dot: string }> = {
  PENDING_PAYMENT: { label: "En attente de paiement", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  ACTIVE:          { label: "Actif",                  color: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-400" },
  EXPIRED:         { label: "Expiré",                 color: "bg-stone-100 text-stone-500 border-stone-200", dot: "bg-stone-300" },
};

const planLabel: Record<string, string> = {
  ANNUAL:    "Annuel (12 mois — 199,99€)",
  SCHOOL:    "Scolaire (sept → juin — 166,66€)",
};

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [tab, setTab] = useState<"institutions" | "subscriptions" | "addon-requests">("institutions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionAdmin[]>([]);
  const [addonRequests, setAddonRequests] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [subFilter, setSubFilter] = useState("PENDING_PAYMENT");
  const [instFilter, setInstFilter] = useState("ALL");
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [endDateInputs, setEndDateInputs] = useState<Record<string, string>>({});
  const [instEndDates, setInstEndDates] = useState<Record<string, string>>({});
  const [instActivating, setInstActivating] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Modale création institution
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoginEmail, setCreateLoginEmail] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCommune, setCreateCommune] = useState("");
  const [createContactEmail, setCreateContactEmail] = useState("");

  // Modale activation abonnement
  const [activateModal, setActivateModal] = useState<InstitutionAdmin | null>(null);
  const [activatePlan, setActivatePlan] = useState("ANNUAL");
  const [activateJobsAddonPacks, setActivateJobsAddonPacks] = useState(0);
  const [activateJobOffersAddonPacks, setActivateJobOffersAddonPacks] = useState(0);
  const [activateEndDate, setActivateEndDate] = useState("");
  const [activatePrice, setActivatePrice] = useState("");
  const [activateLoading, setActivateLoading] = useState(false);
  const [sendNotifEmail, setSendNotifEmail] = useState(true);

  // Étudiants + slots

  // Suppression institution
  const [deleteConfirm, setDeleteConfirm] = useState<InstitutionAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activateError, setActivateError] = useState("");

  // Modale édition institution
  const [editInst, setEditInst] = useState<InstitutionAdmin | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCommune, setEditCommune] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editNewCode, setEditNewCode] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "ADMIN" && user?.role !== "PROFESSIONAL") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated" || (user?.role !== "ADMIN" && user?.role !== "PROFESSIONAL")) return;
    Promise.all([
      fetch("/api/admin/subscriptions").then(r => r.json()),
      fetch("/api/admin/institutions").then(r => r.json()),
      fetch("/api/admin/addon-requests").then(r => r.json()),
    ]).then(([subs, insts, addons]) => {
      setSubscriptions(Array.isArray(subs) ? subs : []);
      setInstitutions(Array.isArray(insts) ? insts : []);
      setAddonRequests(Array.isArray(addons) ? addons : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, user]);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  async function syncExpired() {
    setSyncing(true);
    const res = await fetch("/api/cron/expire-subscriptions", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    setLastSync(new Date().toLocaleTimeString("fr-BE"));
    if (data.expired > 0) {
      const [subs, insts] = await Promise.all([
        fetch("/api/admin/subscriptions").then(r => r.json()),
        fetch("/api/admin/institutions").then(r => r.json()),
      ]);
      setSubscriptions(subs);
      setInstitutions(insts);
      notify(`⏱️ ${data.expired} abonnement(s) expiré(s) automatiquement`);
    } else {
      notify("✓ Synchronisation OK — aucun abonnement à expirer");
    }
  }

  async function activateSub(sub: Subscription) {
    const price = parseFloat(priceInputs[sub.id] || "0") || 0;
    const now = new Date();
    let startDate: Date, endDate: Date;
    if (endDateInputs[sub.id]) {
      startDate = now;
      endDate = new Date(endDateInputs[sub.id]);
    } else if (sub.plan === "SCHOOL") {
      const sept = new Date(now.getFullYear(), 8, 1);
      startDate = now >= sept ? sept : new Date(now.getFullYear() - 1, 8, 1);
      endDate = new Date(startDate.getFullYear() + 1, 5, 30);
    } else {
      startDate = now;
      endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sub.id, status: "ACTIVE", price, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
    });
    setSubscriptions(prev => prev.map(s => s.id === sub.id
      ? { ...s, status: "ACTIVE", price, startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      : s
    ));
    const updated = await fetch("/api/admin/institutions").then(r => r.json());
    setInstitutions(updated);
    notify(`✅ ${sub.institution.name} activée — visible jusqu'au ${fmt(endDate.toISOString())}`);
  }

  async function expireSub(id: string, name: string) {
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "EXPIRED" }),
    });
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: "EXPIRED" } : s));
    const updated = await fetch("/api/admin/institutions").then(r => r.json());
    setInstitutions(updated);
    notify(`${name} désactivée`);
  }

  async function reloadInstitutions() {
    const insts = await fetch("/api/admin/institutions").then(r => r.json());
    setInstitutions(Array.isArray(insts) ? insts : []);
  }

  async function quickActivate(inst: InstitutionAdmin) {
    setInstActivating(p => ({ ...p, [inst.id]: true }));
    const now = new Date();
    const endDate = instEndDates[inst.id]
      ? new Date(instEndDates[inst.id])
      : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (inst.subscription?.id) {
      await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inst.subscription.id, status: "ACTIVE", startDate: now.toISOString(), endDate: endDate.toISOString(), sendEmail: true }),
      });
    } else {
      await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: inst.id, plan: "ANNUAL", status: "ACTIVE", startDate: now.toISOString(), endDate: endDate.toISOString(), sendEmail: true }),
      });
    }
    await reloadInstitutions();
    setInstActivating(p => ({ ...p, [inst.id]: false }));
    notify(`✅ ${inst.name} activée — visible jusqu'au ${fmt(endDate.toISOString())}`);
  }

  async function quickExpire(inst: InstitutionAdmin) {
    if (!inst.subscription?.id) return;
    setInstActivating(p => ({ ...p, [inst.id]: true }));
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inst.subscription.id, status: "EXPIRED" }),
    });
    await reloadInstitutions();
    setInstActivating(p => ({ ...p, [inst.id]: false }));
    notify(`${inst.name} désactivée`);
  }

  function openActivate(inst: InstitutionAdmin) {
    setActivateModal(inst);
    setActivatePlan(inst.subscription?.plan || "ANNUAL");
    setActivateJobsAddonPacks(inst.subscription?.jobsAddonPacks ?? 0);
    setActivateJobOffersAddonPacks(inst.subscription?.jobOffersAddonPacks ?? 0);
    setActivateEndDate("");
    setActivatePrice("");
    setActivateError("");
    setSendNotifEmail(true);
  }

  function computeEndDate(plan: string, customDate: string): Date {
    if (customDate) return new Date(customDate);
    const now = new Date();
    if (plan === "SCHOOL") {
      const sept = new Date(now.getFullYear(), 8, 1);
      const start = now >= sept ? sept : new Date(now.getFullYear() - 1, 8, 1);
      return new Date(start.getFullYear() + 1, 5, 30);
    }
    const end = new Date(now);
    if (plan === "ANNUAL")         end.setFullYear(end.getFullYear() + 1);
    else if (plan === "SEMESTER")  end.setMonth(end.getMonth() + 6);
    else if (plan === "QUARTERLY") end.setMonth(end.getMonth() + 3);
    else                           end.setMonth(end.getMonth() + 1); // MONTHLY
    return end;
  }

  async function handleActivate() {
    if (!activateModal) return;
    setActivateLoading(true);
    const now = new Date();
    const endDate = computeEndDate(activatePlan, activateEndDate);
    const priceVal = activatePrice.trim() ? parseFloat(activatePrice) : null;
    const instName = activateModal.name;

    try {
      let res: Response;
      if (activateModal.subscription?.id) {
        res = await fetch("/api/admin/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activateModal.subscription.id,
            status: "ACTIVE",
            plan: activatePlan,
            jobsAddonPacks: activateJobsAddonPacks,
            jobOffersAddonPacks: activateJobOffersAddonPacks,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            sendEmail: sendNotifEmail,
            ...(priceVal !== null && !isNaN(priceVal) ? { price: priceVal } : {}),
          }),
        });
      } else {
        res = await fetch("/api/admin/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: activateModal.id,
            plan: activatePlan,
            jobsAddonPacks: activateJobsAddonPacks,
            jobOffersAddonPacks: activateJobOffersAddonPacks,
            status: "ACTIVE",
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            sendEmail: sendNotifEmail,
            ...(priceVal !== null && !isNaN(priceVal) ? { price: priceVal } : {}),
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur HTTP ${res.status}` }));
        const msg = err.error || `Erreur serveur (${res.status})`;
        setActivateError(msg);
        notify(`❌ ${msg}`);
        setActivateLoading(false);
        return;
      }

      await reloadInstitutions();
      setActivateModal(null);
      setActivateError("");
      notify(`✅ ${instName} — abonnement ${planLabel[activatePlan]} activé jusqu'au ${fmt(endDate.toISOString())}`);
    } catch (e) {
      const msg = `Erreur réseau : ${e instanceof Error ? e.message : "inconnue"}`;
      setActivateError(msg);
      notify(`❌ ${msg}`);
    } finally {
      setActivateLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admin/institutions/${deleteConfirm.id}`, { method: "DELETE" });
    if (res.ok) {
      setInstitutions(prev => prev.filter(i => i.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      notify(`🗑️ ${deleteConfirm.name} supprimée définitivement`);
    } else {
      notify("❌ Erreur lors de la suppression");
    }
    setDeleteLoading(false);
  }

  async function handleCreate() {
    setCreateLoading(true);
    const res = await fetch("/api/admin/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName, loginEmail: createLoginEmail, code: createCode, commune: createCommune, contactEmail: createContactEmail }),
    });
    if (res.ok) {
      await reloadInstitutions();
      setShowCreate(false);
      setCreateName(""); setCreateLoginEmail(""); setCreateCode(""); setCreateCommune(""); setCreateContactEmail("");
      notify("✅ Institution créée avec succès");
    } else {
      const err = await res.json();
      notify(`❌ ${err.error}`);
    }
    setCreateLoading(false);
  }

  function openEdit(inst: InstitutionAdmin) {
    setEditInst(inst);
    setEditName(inst.name);
    setEditCommune(inst.commune);
    setEditAddress(inst.address || "");
    setEditPhone(inst.phone || "");
    setEditContactEmail(inst.email || "");
    setEditWebsite(inst.website || "");
    setEditNewCode("");
  }

  async function handleEdit() {
    if (!editInst) return;
    setEditLoading(true);
    const res = await fetch(`/api/admin/institutions/${editInst.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName, commune: editCommune, address: editAddress,
        phone: editPhone, email: editContactEmail, website: editWebsite,
        ...(editNewCode ? { newCode: editNewCode } : {}),
      }),
    });
    if (res.ok) {
      await reloadInstitutions();
      setEditInst(null);
      notify("✅ Institution mise à jour");
    } else {
      const err = await res.json();
      notify(`❌ ${err.error}`);
    }
    setEditLoading(false);
  }

  async function approveAddonRequest(requestId: string, institutionName: string) {
    setApprovalLoading(p => ({ ...p, [requestId]: true }));
    const res = await fetch("/api/admin/addon-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status: "APPROVED" }),
    });
    if (res.ok) {
      setAddonRequests(prev => prev.filter(r => r.id !== requestId));
      notify(`✅ Packs ajoutés à ${institutionName}`);
    } else {
      notify("❌ Erreur lors de l'approbation");
    }
    setApprovalLoading(p => ({ ...p, [requestId]: false }));
  }

  async function rejectAddonRequest(requestId: string) {
    setApprovalLoading(p => ({ ...p, [requestId]: true }));
    const res = await fetch("/api/admin/addon-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status: "REJECTED" }),
    });
    if (res.ok) {
      setAddonRequests(prev => prev.filter(r => r.id !== requestId));
      notify("✅ Demande rejetée");
    } else {
      notify("❌ Erreur lors du rejet");
    }
    setApprovalLoading(p => ({ ...p, [requestId]: false }));
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

  const isExpiringSoon = (d?: string) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 1000 * 60 * 60 * 24 * 14;
  };

  // Institutions filtrées
  const filteredInst = instFilter === "ALL" ? institutions
    : instFilter === "ACTIVE" ? institutions.filter(i => i.subscription?.status === "ACTIVE")
    : instFilter === "NO_SUB" ? institutions.filter(i => !i.subscription || i.subscription.status !== "ACTIVE")
    : instFilter === "INCOMPLETE" ? institutions.filter(i => i.completeness.percent < 80)
    : institutions;

  const instCounts = {
    ALL: institutions.length,
    ACTIVE: institutions.filter(i => i.subscription?.status === "ACTIVE").length,
    NO_SUB: institutions.filter(i => !i.subscription || i.subscription.status !== "ACTIVE").length,
    INCOMPLETE: institutions.filter(i => i.completeness.percent < 80).length,
  };

  const filteredSubs = subFilter === "ALL" ? subscriptions : subscriptions.filter(s => s.status === subFilter);
  const subCounts = {
    PENDING_PAYMENT: subscriptions.filter(s => s.status === "PENDING_PAYMENT").length,
    ACTIVE: subscriptions.filter(s => s.status === "ACTIVE").length,
    EXPIRED: subscriptions.filter(s => s.status === "EXPIRED").length,
  };

  if (status === "loading" || loading) return null;

  return (
    <>
      <Navbar />

      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {subCounts.PENDING_PAYMENT > 0 && (
        <div className="fixed bottom-5 right-5 z-[150]">
          <button
            onClick={() => setTab("subscriptions")}
            className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {subCounts.PENDING_PAYMENT} abonnement{subCounts.PENDING_PAYMENT > 1 ? "s" : ""} en attente d'activation
            <span className="text-xs opacity-80">→</span>
          </button>
        </div>
      )}

      {/* Mobile nav */}
      <div className="md:hidden flex overflow-x-auto gap-1 p-2 bg-white border-b border-stone-100 sticky top-0 z-10">
        <button onClick={() => setTab("institutions")} className={`shrink-0 text-xs px-3 py-2 rounded-lg font-medium ${tab === "institutions" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>🏛️ Institutions</button>
        <button onClick={() => setTab("subscriptions")} className={`shrink-0 text-xs px-3 py-2 rounded-lg font-medium ${tab === "subscriptions" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>⭐ Abonnements</button>
        <button onClick={() => setTab("addon-requests")} className={`shrink-0 text-xs px-3 py-2 rounded-lg font-medium relative ${tab === "addon-requests" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
          📦 Packs
          {addonRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{addonRequests.length}</span>
          )}
        </button>
        <Link href="/admin/finances" className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium text-stone-600 hover:bg-stone-100">📊 Finances</Link>
        <Link href="/admin/config" className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium text-stone-600 hover:bg-stone-100">⚙️ Config</Link>
      </div>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-shrink-0 p-5 flex-col gap-4 border-r border-white/60 bg-white/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 flex items-center justify-center text-white text-xl mb-3">⚙️</div>
            <h2 className="font-medium text-stone-900">Administration</h2>
            <p className="text-xs text-stone-500 mt-0.5">Educ-Connect</p>
          </div>

          {/* Nav */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-2 space-y-1">
            <button onClick={() => setTab("institutions")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${tab === "institutions" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
              <span>🏛️</span> Institutions
              <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-md ${tab === "institutions" ? "bg-white/20" : "bg-stone-100"}`}>{institutions.length}</span>
            </button>
            <button onClick={() => setTab("subscriptions")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${tab === "subscriptions" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
              <span>⭐</span> Abonnements
              {subCounts.PENDING_PAYMENT > 0 && (
                <span className="ml-auto text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-md">{subCounts.PENDING_PAYMENT}</span>
              )}
            </button>
            <button onClick={() => setTab("addon-requests")}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 relative ${tab === "addon-requests" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
              <span>📦</span> Packs supplémentaires
              {addonRequests.length > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-md">{addonRequests.length}</span>
              )}
            </button>
            <Link href="/admin/finances"
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 text-stone-600 hover:bg-stone-50">
              <span>📊</span> Finances
            </Link>
            <Link href="/admin/config"
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 text-stone-600 hover:bg-stone-50">
              <span>⚙️</span> Configuration
            </Link>
          </div>

          {/* Automatisation */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Automatisation</p>
            <div className="flex items-start gap-2 text-xs text-stone-500">
              <span className="text-green-400 mt-0.5">●</span>
              <span>Activation manuelle après réception du virement</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-stone-500">
              <span className="text-sky-400 mt-0.5">●</span>
              <span>Expiration auto à la date de fin</span>
            </div>
            <button onClick={syncExpired} disabled={syncing}
              className="w-full mt-2 flex items-center justify-center gap-2 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-xl transition-colors disabled:opacity-50">
              {syncing ? <><span className="animate-spin inline-block">⏳</span> Vérification…</> : "↻ Vérifier les expirations"}
            </button>
            {lastSync && <p className="text-xs text-stone-400 text-center">Dernière synchro : {lastSync}</p>}
          </div>

          {/* Stats globales */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Vue globale</p>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Institutions</span><span className="font-medium">{institutions.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Actives</span><span className="font-medium text-green-600">{instCounts.ACTIVE}</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Abonnements en attente</span><span className="font-medium text-amber-600">{subCounts.PENDING_PAYMENT}</span></div>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {/* ── Onglet Institutions ─────────────────────────────────────── */}
          {tab === "institutions" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-2xl font-medium text-stone-900">Institutions</h1>
                  <p className="text-stone-500 text-sm mt-0.5">Vue d'ensemble des institutions, complétude des profils et statistiques de candidatures.</p>
                </div>
                <button onClick={() => setShowCreate(true)}
                  className="flex-shrink-0 flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                  ➕ Créer une institution
                </button>
              </div>

              {/* Filtres */}
              <div className="flex flex-wrap gap-2 mb-5">
                {([
                  { key: "ALL",        label: "Toutes" },
                  { key: "ACTIVE",     label: "Abonnement actif" },
                  { key: "NO_SUB",     label: "Sans abonnement actif" },
                  { key: "INCOMPLETE", label: "Profil incomplet" },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setInstFilter(f.key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${instFilter === f.key ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {f.label}
                    <span className="ml-1.5 opacity-60 text-xs">{instCounts[f.key]}</span>
                  </button>
                ))}
              </div>

              {filteredInst.length === 0 ? (
                <div className="text-center py-16 text-stone-300">
                  <div className="text-5xl mb-3">🏛️</div>
                  <p>Aucune institution dans cette catégorie.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInst.map(inst => {
                    const sub = inst.subscription;
                    const pct = inst.completeness.percent;
                    const barColor = pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
                    const expiring = sub?.status === "ACTIVE" && isExpiringSoon(sub.endDate);

                    return (
                      <div key={inst.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${expiring ? "border-amber-300" : "border-stone-100"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h2 className="text-lg font-medium text-stone-900">{inst.name}</h2>
                              {sub?.status === "ACTIVE"
                                ? <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>Visible</span>
                                : <span className="flex items-center gap-1 text-xs bg-stone-100 text-stone-500 border border-stone-200 px-2.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block"></span>{sub ? "Expiré" : "Sans abonnement"}</span>
                              }
                              {expiring && <span className="text-xs text-amber-600 font-medium">⚠️ Expire bientôt</span>}
                              {inst.boosted && inst.boostEndDate && new Date(inst.boostEndDate) > new Date() && (
                                <span className="flex items-center gap-1 text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full">🚀 Boosté</span>
                              )}
                            </div>
                            <p className="text-sm text-stone-500">📍 {inst.commune}{inst.email ? ` · ${inst.email}` : ""}</p>
                            {sub?.endDate && sub.status === "ACTIVE" && (
                              <p className="text-xs text-stone-400 mt-0.5">Abonnement jusqu'au {fmt(sub.endDate)}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 ml-4 flex items-center gap-2 flex-wrap">
                            <button onClick={() => openEdit(inst)}
                              className="flex items-center gap-1.5 text-xs bg-stone-100 border border-stone-200 text-stone-700 px-3 py-2 rounded-xl hover:bg-stone-200 transition-colors font-medium">
                              ✏️ Modifier
                            </button>
                            <Link href={`/institutions/${inst.id}`} target="_blank"
                              className="flex items-center gap-1.5 text-xs bg-sky-50 border border-sky-200 text-sky-700 px-3 py-2 rounded-xl hover:bg-sky-100 transition-colors font-medium">
                              Voir →
                            </Link>
                            <button onClick={() => setDeleteConfirm(inst)}
                              className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors font-medium">
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Complétude du profil */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-stone-500">Complétude du profil</span>
                            <span className={`text-xs font-medium ${pct === 100 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-500"}`}>
                              {pct}% ({inst.completeness.score}/{inst.completeness.total})
                            </span>
                          </div>
                          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          {inst.completeness.missing.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {inst.completeness.missing.map(f => (
                                <span key={f} className="text-xs bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-md">
                                  ✗ {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Stats candidatures */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3 border-t border-stone-50 mb-4">
                          {[
                            { label: "Candidatures",   value: inst.stats.total,     color: "text-stone-700" },
                            { label: "En attente",     value: inst.stats.pending,   color: "text-amber-600" },
                            { label: "RDV fixé",       value: inst.stats.accepted,  color: "text-green-600" },
                            { label: "Stages trouvés", value: inst.stats.completed, color: "text-sky-600" },
                            { label: "Refusées",       value: inst.stats.rejected,  color: "text-red-500" },
                            { label: "Places dispo",   value: inst.stats.slots,     color: "text-stone-500" },
                          ].map(s => (
                            <div key={s.label} className="text-center bg-stone-50 rounded-xl py-2 px-1">
                              <p className={`text-xl font-medium ${s.color}`}>{s.value}</p>
                              <p className="text-xs text-stone-400 mt-0.5 leading-tight">{s.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Contrôle abonnement */}
                        <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                          {sub?.status === "ACTIVE" ? (
                            <>
                              <div className="flex-1 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-stone-500">{planLabel[sub.plan] ?? sub.plan}</span>
                                {(sub.jobsAddonPacks ?? 0) > 0 && <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">💼 {sub.jobsAddonPacks} pack(s)</span>}
                                {(sub.jobOffersAddonPacks ?? 0) > 0 && <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">📋 {sub.jobOffersAddonPacks} pack(s)</span>}
                                {sub.endDate && <span className="text-xs text-stone-400">jusqu'au {fmt(sub.endDate)}</span>}
                              </div>
                              <button onClick={() => openActivate(inst)}
                                className="text-xs border border-stone-200 text-stone-600 bg-stone-50 hover:bg-stone-100 px-3 py-2 rounded-xl transition-colors font-medium">
                                ✏️ Modifier
                              </button>
                              <button onClick={() => quickExpire(inst)} disabled={instActivating[inst.id]}
                                className="text-xs border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-40 font-medium">
                                {instActivating[inst.id] ? "…" : "⏸ Désactiver"}
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-stone-400 flex-1">
                                {sub ? "Abonnement expiré" : "Aucun abonnement actif"}
                              </span>
                              <button onClick={() => openActivate(inst)}
                                className="text-xs border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition-colors font-medium">
                                ▶ Activer un abonnement
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Onglet Abonnements ──────────────────────────────────────── */}
          {tab === "subscriptions" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-medium text-stone-900">Abonnements</h1>
                <p className="text-stone-500 text-sm mt-0.5">Activez les abonnements après réception du paiement.</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                {(["PENDING_PAYMENT", "ACTIVE", "EXPIRED", "ALL"] as const).map(f => (
                  <button key={f} onClick={() => setSubFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${subFilter === f ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {f === "ALL" ? "Tous" : subStatus[f]?.label}
                    <span className="ml-1.5 opacity-60 text-xs">
                      {f === "ALL" ? subscriptions.length : subCounts[f as keyof typeof subCounts]}
                    </span>
                  </button>
                ))}
              </div>

              {filteredSubs.length === 0 ? (
                <div className="text-center py-16 text-stone-300">
                  <div className="text-5xl mb-3">📭</div>
                  <p>Aucun abonnement dans cette catégorie.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubs.map(sub => {
                    const st = subStatus[sub.status];
                    const expiring = sub.status === "ACTIVE" && isExpiringSoon((sub as unknown as Record<string, string>).endDate);
                    // Trouver l'institution correspondante pour le lien
                    const instMatch = institutions.find(i => i.name === sub.institution.name && i.commune === sub.institution.commune);

                    return (
                      <div key={sub.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${expiring ? "border-amber-300" : "border-stone-100"}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-medium text-stone-900">{sub.institution.name}</h2>
                              {instMatch && (
                                <Link href={`/institutions/${instMatch.id}`} target="_blank"
                                  className="text-xs text-sky-600 hover:underline">
                                  Voir la fiche →
                                </Link>
                              )}
                            </div>
                            <p className="text-sm text-stone-500 mt-0.5">📍 {sub.institution.commune}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium ${st?.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st?.dot}`}></span>
                              {st?.label}
                            </div>
                            {expiring && <span className="text-xs text-amber-600 font-medium">⚠️ Expire bientôt</span>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-5 text-sm text-stone-500 mb-4">
                          <span>📋 {planLabel[sub.plan] || sub.plan}</span>
                          {sub.price != null && sub.price > 0 && <span>💶 {sub.price} € payés</span>}
                          {(sub as unknown as Record<string, string>).startDate && (sub as unknown as Record<string, string>).endDate && (
                            <span>📅 {fmt((sub as unknown as Record<string, string>).startDate)} → {fmt((sub as unknown as Record<string, string>).endDate)}</span>
                          )}
                        </div>

                        {(sub.status === "PENDING_PAYMENT" || sub.status === "EXPIRED") && (
                          <div className="flex flex-wrap gap-3 items-end pt-4 border-t border-stone-50">
                            <div>
                              <label className="block text-xs font-medium text-stone-500 mb-1.5">Montant reçu (€)</label>
                              <input type="number" min={0}
                                value={priceInputs[sub.id] ?? ""}
                                onChange={e => setPriceInputs(p => ({ ...p, [sub.id]: e.target.value }))}
                                placeholder="ex: 149"
                                className="w-28 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-stone-500 mb-1.5">Date de fin (optionnel)</label>
                              <input type="date"
                                value={endDateInputs[sub.id] ?? ""}
                                onChange={e => setEndDateInputs(p => ({ ...p, [sub.id]: e.target.value }))}
                                className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                              />
                            </div>
                            <button onClick={() => activateSub(sub)}
                              className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                              ✓ Activer → visible
                            </button>
                          </div>
                        )}

                        {sub.status === "ACTIVE" && (
                          <div className="pt-3 border-t border-stone-50 flex justify-end">
                            <button onClick={() => expireSub(sub.id, sub.institution.name)}
                              className="text-xs border border-stone-200 text-stone-500 px-4 py-1.5 rounded-xl hover:bg-stone-50 transition-colors">
                              Désactiver manuellement
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Demandes de packs supplémentaires ──────────────────────────── */}
          {tab === "addon-requests" && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-medium text-stone-900">📦 Demandes de packs supplémentaires</h2>
                <span className="text-sm px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">{addonRequests.length}</span>
              </div>

              {addonRequests.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="text-stone-600 text-sm">Aucune demande de packs supplémentaires.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addonRequests.map(req => (
                    <div key={req.id} className="bg-white border border-stone-200 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-2">
                            <h3 className="font-medium text-stone-900">{req.subscription?.institution?.name || "Institution"}</h3>
                            <p className="text-xs text-stone-500">{req.subscription?.institution?.user?.email}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {req.jobsAddonPacks > 0 && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                                <p className="text-xs text-emerald-700 font-medium">💼 Jobs étudiants</p>
                                <p className="text-sm font-bold text-emerald-800 mt-0.5">{req.jobsAddonPacks} pack{req.jobsAddonPacks > 1 ? 's' : ''}</p>
                                <p className="text-xs text-emerald-600 mt-1">{req.jobsAddonPacks * 5} slots (50€/pack)</p>
                              </div>
                            )}
                            {req.jobOffersAddonPacks > 0 && (
                              <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5">
                                <p className="text-xs text-sky-700 font-medium">🎯 Offres d'emploi</p>
                                <p className="text-sm font-bold text-sky-800 mt-0.5">{req.jobOffersAddonPacks} pack{req.jobOffersAddonPacks > 1 ? 's' : ''}</p>
                                <p className="text-xs text-sky-600 mt-1">{req.jobOffersAddonPacks} slot{req.jobOffersAddonPacks > 1 ? 's' : ''} (150€/pack)</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 bg-stone-50 rounded-lg p-2.5 text-xs">
                            <p className="text-stone-600"><span className="font-mono text-stone-700">{req.paymentReference}</span></p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => approveAddonRequest(req.id, req.subscription?.institution?.name || "Institution")}
                            disabled={approvalLoading[req.id]}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                            {approvalLoading[req.id] ? "..." : "✓ Approuver"}
                          </button>
                          <button onClick={() => rejectAddonRequest(req.id)}
                            disabled={approvalLoading[req.id]}
                            className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                            {approvalLoading[req.id] ? "..." : "✕ Rejeter"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ── Modal : Créer une institution ─────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-stone-900">Créer une institution</h2>
              <button onClick={() => setShowCreate(false)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Nom de l'institution *</label>
                  <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Centre CPAS de Namur"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Commune *</label>
                  <input value={createCommune} onChange={e => setCreateCommune(e.target.value)} placeholder="Namur"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Email de contact</label>
                  <input type="email" value={createContactEmail} onChange={e => setCreateContactEmail(e.target.value)} placeholder="info@institution.be"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
              </div>
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Accès à l'espace institution</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Email de connexion *</label>
                    <input type="email" value={createLoginEmail} onChange={e => setCreateLoginEmail(e.target.value)} placeholder="admin@institution.be"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5">Code d'accès *</label>
                    <input type="text" value={createCode} onChange={e => setCreateCode(e.target.value)} placeholder="min. 6 caractères"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleCreate} disabled={createLoading || !createName || !createLoginEmail || !createCode || !createCommune}
                className="flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors">
                {createLoading ? "Création…" : "Créer l'institution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Activation abonnement ────────────────────────────────── */}
      {activateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-medium text-stone-900">Activer un abonnement</h2>
                <p className="text-sm text-stone-500 mt-0.5">{activateModal.name}</p>
              </div>
              <button onClick={() => setActivateModal(null)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
            </div>

            <div className="space-y-5">
              {/* Choix du plan */}
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-2">Formule</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: "ANNUAL",    label: "Annuel",      sub: "12 mois — 199,99€" },
                    { key: "SCHOOL",    label: "Scolaire",    sub: "Sept → Juin — 166,66€" },
                  ].map(p => (
                    <button key={p.key} onClick={() => setActivatePlan(p.key)}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        activatePlan === p.key
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 hover:border-stone-300 text-stone-700"
                      }`}>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className={`text-xs mt-0.5 ${activatePlan === p.key ? "text-stone-300" : "text-stone-400"}`}>{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jobs Étudiants */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <div>
                  <p className="text-sm font-medium text-stone-900">💼 Jobs étudiants</p>
                  <p className="text-xs text-stone-600">50€/pack (5 slots)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActivateJobsAddonPacks(Math.max(0, activateJobsAddonPacks - 1))}
                    className="w-8 h-8 bg-emerald-300 hover:bg-emerald-400 text-stone-900 font-bold rounded-lg flex items-center justify-center">−</button>
                  <span className="w-8 text-center font-bold text-lg text-stone-900">{activateJobsAddonPacks}</span>
                  <button onClick={() => setActivateJobsAddonPacks(activateJobsAddonPacks + 1)}
                    className="w-8 h-8 bg-emerald-300 hover:bg-emerald-400 text-stone-900 font-bold rounded-lg flex items-center justify-center">+</button>
                </div>
              </div>

              {/* Offres d'emploi */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-sky-200 bg-sky-50">
                <div>
                  <p className="text-sm font-medium text-stone-900">🎯 Offres d'emploi</p>
                  <p className="text-xs text-stone-600">150€/pack (1 slot)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActivateJobOffersAddonPacks(Math.max(0, activateJobOffersAddonPacks - 1))}
                    className="w-8 h-8 bg-sky-300 hover:bg-sky-400 text-stone-900 font-bold rounded-lg flex items-center justify-center">−</button>
                  <span className="w-8 text-center font-bold text-lg text-stone-900">{activateJobOffersAddonPacks}</span>
                  <button onClick={() => setActivateJobOffersAddonPacks(activateJobOffersAddonPacks + 1)}
                    className="w-8 h-8 bg-sky-300 hover:bg-sky-400 text-stone-900 font-bold rounded-lg flex items-center justify-center">+</button>
                </div>
              </div>

              {/* Date de fin + prix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Date de fin (optionnel)</label>
                  <input type="date" value={activateEndDate} onChange={e => setActivateEndDate(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
                  <p className="text-xs text-stone-400 mt-1">Vide = durée auto</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Montant reçu (€)</label>
                  <input type="number" min={0} value={activatePrice} onChange={e => setActivatePrice(e.target.value)}
                    placeholder="Facultatif"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
              </div>
            </div>

            {/* Notification email */}
            <button
              onClick={() => setSendNotifEmail(v => !v)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all mt-5 ${
                sendNotifEmail ? "border-sky-400 bg-sky-50" : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                sendNotifEmail ? "bg-sky-500 border-sky-500" : "border-stone-300"
              }`}>
                {sendNotifEmail && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">📧 Envoyer l'email de confirmation</p>
                <p className="text-xs text-stone-500">Notifie l'institution que son abonnement est actif</p>
              </div>
            </button>

            {activateError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                ❌ {activateError}
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setActivateModal(null); setActivateError(""); }}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleActivate} disabled={activateLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
                {activateLoading ? "Activation…" : "✅ Activer l'abonnement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Confirmer suppression institution ──────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🗑️</div>
              <h2 className="text-lg font-medium text-stone-900">Supprimer cette institution ?</h2>
              <p className="text-sm text-stone-500 mt-1">
                <strong className="text-stone-800">{deleteConfirm.name}</strong> sera supprimée définitivement avec tous ses abonnements, places de stage, candidatures et offres jobs.
              </p>
              <p className="text-xs text-red-500 mt-2 font-medium">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
                {deleteLoading ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal : Modifier une institution ──────────────────────────────── */}
      {editInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-medium text-stone-900">Modifier {editInst.name}</h2>
              <button onClick={() => setEditInst(null)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Nom de l'institution</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Commune</label>
                  <input value={editCommune} onChange={e => setEditCommune(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Email de contact</label>
                  <input type="email" value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                  <p className="text-xs text-stone-400 mt-1">Un email de bienvenue sera envoyé si l'adresse change.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Adresse</label>
                  <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Rue de la Paix 1, 5000 Namur"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Téléphone</label>
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+32 2 000 00 00"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">Site web</label>
                  <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="www.institution.be"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
                </div>
              </div>
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">Réinitialiser le code d'accès</p>
                <input type="text" value={editNewCode} onChange={e => setEditNewCode(e.target.value)} placeholder="Laisser vide pour ne pas changer"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditInst(null)}
                className="flex-1 border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleEdit} disabled={editLoading}
                className="flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors">
                {editLoading ? "Enregistrement…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
