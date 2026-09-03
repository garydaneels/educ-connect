"use client";
// Fix Prisma field update
import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  jobsAddonPacks: number;
  jobOffersAddonPacks: number;
  startDate?: string;
  endDate?: string;
  price?: number;
  paymentReference?: string;
  exemptFromVAT?: boolean;
}

interface Institution {
  id: string;
  name: string;
  subscription?: Subscription | null;
}

const PLANS = [
  {
    key: "ANNUAL",
    icon: "🗓️",
    label: "Annuel",
    period: "12 mois",
    price: 180,
    priceUnit: "/ an",
    desc: "12 mois consécutifs dès l'activation",
    highlight: true,
    color: "orange",
  },
  {
    key: "SCHOOL",
    icon: "🏫",
    label: "Scolaire",
    period: "Sept → Juin",
    price: 150,
    priceUnit: "/ an scolaire",
    desc: "Calqué sur l'année académique belge (prorata 10 mois)",
    highlight: false,
    color: "emerald",
  },
];

const JOBS_ADDON_PRICE = { price: 50, label: "+50 €" };
const JOB_OFFERS_ADDON_PRICE = { price: 150, label: "+150 €" };

const PLAN_LABELS: Record<string, string> = {
  MONTHLY:   "Mensuel",
  QUARTERLY: "Trimestriel",
  SEMESTER:  "Semestriel",
  ANNUAL:    "Annuel",
  SCHOOL:    "Scolaire",
};

const PERKS = [
  "Visible dans la recherche des étudiants",
  "Places de stage illimitées",
  "Chat avec les étudiants",
  "Proposer des RDV aux candidats",
  "Statistiques de vues",
  "Support prioritaire",
];

function MembershipContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = session?.user as { role?: string } | undefined;
  const isAddonsMode = searchParams.get("tab") === "addons";

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [jobsAddonPacks, setJobsAddonPacks] = useState(0);
  const [jobOffersAddonPacks, setJobOffersAddonPacks] = useState(0);
  const [exemptFromVAT, setExemptFromVAT] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/institutions/mine", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setInstitution(data); setLoading(false); });
  }, [status]);

  async function handleSubmit() {
    if (!selectedPlan || !institution) return;
    setSubmitting(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: selectedPlan,
        jobsAddonPacks,
        jobOffersAddonPacks,
        exemptFromVAT,
      }),
    });
    if (res.ok) {
      const sub = await res.json();
      setInstitution(prev => prev ? { ...prev, subscription: sub } : null);
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch("/api/institutions/subscription", { method: "DELETE" });
    if (res.ok) {
      setInstitution(prev => prev ? {
        ...prev,
        subscription: prev.subscription ? { ...prev.subscription, status: "EXPIRED" } : null,
      } : null);
      setShowCancelConfirm(false);
    }
    setCancelling(false);
  }

  async function handleAddPacks() {
    if (!subscription || !institution) return;
    setSubmitting(true);
    const res = await fetch("/api/subscriptions/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId: subscription.id,
        jobsAddonPacks,
        jobOffersAddonPacks,
        exemptFromVAT,
      }),
    });
    if (res.ok) {
      // La demande a été créée, on réinitialise juste le formulaire
      setJobsAddonPacks(0);
      setJobOffersAddonPacks(0);
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

  const subscription = institution?.subscription;
  const selectedPlanData = PLANS.find(p => p.key === selectedPlan);
  const jobsAddonCost = jobsAddonPacks * JOBS_ADDON_PRICE.price;
  const jobOffersCost = jobOffersAddonPacks * JOB_OFFERS_ADDON_PRICE.price;
  const subtotal = selectedPlanData ? selectedPlanData.price + jobsAddonCost + jobOffersCost : 0;
  const vat = exemptFromVAT ? 0 : Math.round(subtotal * 0.21 * 100) / 100;
  const totalPrice = subtotal + vat;
  const refVirement = subscription?.paymentReference || "EDUC-XXXXXXXX";

  if (status === "loading" || loading) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">

      <div className="mb-8">
        <h1 className="text-2xl font-medium text-stone-900 mb-1">Mon abonnement</h1>
        <p className="text-stone-500 text-sm">Gérez votre abonnement Educ-Connect et votre visibilité auprès des étudiants.</p>
        {subscription?.status === "ACTIVE" && isAddonsMode && (
          <button onClick={() => router.push("/institution/membership")}
            className="mt-3 text-sm text-stone-600 hover:text-stone-900 underline">
            ← Retour à l'abonnement
          </button>
        )}
      </div>

      {/* ── ABONNEMENT ACTIF ──────────────────────────────────────────── */}
      {subscription?.status === "ACTIVE" && (
        <div className="space-y-5 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-green-700">✅ Abonnement actif</p>
                <p className="text-xl font-medium text-stone-900 mt-1">{PLAN_LABELS[subscription.plan] ?? subscription.plan}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {subscription.jobsAddonPacks > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                      💼 Jobs étudiants ({subscription.jobsAddonPacks} pack{subscription.jobsAddonPacks > 1 ? 's' : ''})
                    </span>
                  )}
                  {subscription.jobOffersAddonPacks > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full font-medium">
                      🎯 Offres d'emploi ({subscription.jobOffersAddonPacks} pack{subscription.jobOffersAddonPacks > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                {subscription.startDate && subscription.endDate && (
                  <p className="text-sm text-stone-500 mt-2">{fmt(subscription.startDate)} → <strong>{fmt(subscription.endDate)}</strong></p>
                )}
              </div>
              <span className="text-4xl">✅</span>
            </div>
            <div className="bg-green-100 rounded-xl px-4 py-2.5 text-sm text-green-700">
              Votre institution est visible dans les recherches des étudiants jusqu'au{" "}
              <strong>{subscription.endDate ? fmt(subscription.endDate) : "—"}</strong>.
            </div>
          </div>

          {/* Supplément Jobs étudiants */}
          {subscription.jobsAddonPacks === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">💼</span>
                <div className="flex-1">
                  <p className="font-medium text-stone-900 mb-0.5">Ajouter le supplément Jobs étudiants</p>
                  <p className="text-sm text-stone-500 mb-1">
                    Publiez des offres de jobs étudiants dans le secteur social de Belgique francophone.
                    <> Prix : <strong>{JOBS_ADDON_PRICE.label}</strong>.</>
                  </p>
                  <div className="mt-4 bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
                    {[
                      { label: "Bénéficiaire", value: "Educ-Connect ASBL" },
                      { label: "IBAN",          value: "BE00 0000 0000 0000" },
                      { label: "BIC",           value: "GEBABEBB" },
                      { label: "Montant",       value: `${JOBS_ADDON_PRICE.price},00 €` },
                      { label: "Communication", value: `${refVirement}-JOBS`, highlight: true },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center py-1.5 px-3 rounded-lg ${(row as { highlight?: boolean }).highlight ? "bg-amber-50 border border-amber-200" : "bg-white border border-stone-100"}`}>
                        <span className="text-stone-500">{row.label}</span>
                        <span className={`font-medium text-xs ${(row as { highlight?: boolean }).highlight ? "text-amber-800 font-mono" : "text-stone-900"}`}>{row.value}</span>
                      </div>
                    ))}
                    <p className="text-xs text-stone-500 pt-1">Envoyez confirmation à <a href="mailto:contact@educonnect.be" className="text-sky-600 underline">contact@educonnect.be</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Résiliation */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h3 className="font-medium text-stone-900 mb-1">Résilier l'abonnement</h3>
            <p className="text-sm text-stone-500 mb-4">
              La résiliation est immédiate et sans remboursement. Votre institution ne sera plus visible dans les recherches dès la confirmation.
            </p>
            {showCancelConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800 mb-1">⚠️ Confirmer la résiliation ?</p>
                <p className="text-xs text-red-600 mb-4">
                  Votre abonnement <strong>{PLAN_LABELS[subscription.plan]}</strong> sera immédiatement désactivé.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 min-w-[120px] border border-stone-200 text-stone-600 rounded-xl py-2 text-sm hover:bg-white transition-colors">Annuler</button>
                  <button onClick={handleCancel} disabled={cancelling}
                    className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium transition-colors">
                    {cancelling ? "Résiliation…" : "Confirmer la résiliation"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCancelConfirm(true)}
                className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
                Résilier mon abonnement
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── EN ATTENTE ────────────────────────────────────────────────── */}
      {subscription?.status === "PENDING_PAYMENT" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <p className="text-sm font-medium text-amber-700 mb-1">⏳ Paiement en attente de confirmation</p>
          <p className="text-stone-600 text-sm">
            Votre demande d'abonnement <strong>{PLAN_LABELS[subscription.plan] ?? subscription.plan}</strong> a bien été enregistrée.
            Dès que votre virement sera confirmé par notre équipe, votre institution sera rendue visible automatiquement.
          </p>
          <div className="mt-4 bg-white border border-amber-100 rounded-xl p-4 space-y-2 text-sm">
            {[
              { label: "Bénéficiaire", value: "Educ-Connect ASBL" },
              { label: "IBAN",         value: "BE00 0000 0000 0000" },
              { label: "BIC",          value: "GEBABEBB" },
              { label: "Communication", value: refVirement, highlight: true },
            ].map(row => (
              <div key={row.label} className={`flex justify-between items-center py-1.5 px-3 rounded-lg ${(row as { highlight?: boolean }).highlight ? "bg-amber-50 border border-amber-200" : "bg-stone-50"}`}>
                <span className="text-stone-500">{row.label}</span>
                <span className={`font-medium text-xs ${(row as { highlight?: boolean }).highlight ? "text-amber-800 font-mono tracking-wide" : "text-stone-900"}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-3">
            Envoyez confirmation à <a href="mailto:contact@educonnect.be" className="text-sky-600 underline">contact@educonnect.be</a> avec la référence <strong>{refVirement}</strong>.
          </p>
        </div>
      )}

      {/* ── EXPIRÉ ────────────────────────────────────────────────────── */}
      {subscription?.status === "EXPIRED" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-sm text-red-700">
          Votre abonnement a expiré le {subscription.endDate ? fmt(subscription.endDate) : "—"}. Renouvelez ci-dessous pour rester visible.
        </div>
      )}

      {/* ── ACHETER DES PACKS SUPPLÉMENTAIRES ────────────────────────── */}
      {subscription?.status === "ACTIVE" && isAddonsMode && (
        <>
            <div className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-2xl p-8 mb-8">
              <div className="mb-8">
                <h2 className="text-2xl font-medium text-stone-900 mb-2">Ajouter des packs supplémentaires</h2>
                <p className="text-stone-500">Augmentez votre quota de jobs étudiants et offres d'emploi.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {/* Jobs étudiants addon */}
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-2xl mb-1">💼</p>
                      <p className="font-semibold text-stone-900 text-lg">Jobs étudiants</p>
                      <p className="text-sm text-emerald-700 font-medium mt-1">5 slots par pack</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-4 flex-1">Ajoutez des slots pour publier plus de jobs étudiants.</p>
                  <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setJobsAddonPacks(Math.max(0, jobsAddonPacks - 1))}
                        className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center font-bold text-lg">−</button>
                      <span className="w-10 text-center font-bold text-stone-900 text-lg">{jobsAddonPacks}</span>
                      <button onClick={() => setJobsAddonPacks(jobsAddonPacks + 1)}
                        className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center font-bold text-lg">+</button>
                    </div>
                    <p className="font-semibold text-emerald-700 text-lg">{jobsAddonPacks * 50}€</p>
                  </div>
                </div>

                {/* Offres d'emploi addon */}
                <div className="bg-white border-2 border-sky-200 rounded-2xl p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-2xl mb-1">🎯</p>
                      <p className="font-semibold text-stone-900 text-lg">Offres d'emploi</p>
                      <p className="text-sm text-sky-700 font-medium mt-1">1 slot par pack</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-4 flex-1">Ajoutez des slots pour publier plus d'offres d'emploi.</p>
                  <div className="flex items-center justify-between pt-4 border-t border-sky-100">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setJobOffersAddonPacks(Math.max(0, jobOffersAddonPacks - 1))}
                        className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors flex items-center justify-center font-bold text-lg">−</button>
                      <span className="w-10 text-center font-bold text-stone-900 text-lg">{jobOffersAddonPacks}</span>
                      <button onClick={() => setJobOffersAddonPacks(jobOffersAddonPacks + 1)}
                        className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors flex items-center justify-center font-bold text-lg">+</button>
                    </div>
                    <p className="font-semibold text-sky-700 text-lg">{jobOffersAddonPacks * 150}€</p>
                  </div>
                </div>
              </div>

              {/* Récapitulatif et paiement */}
              {(jobsAddonPacks > 0 || jobOffersAddonPacks > 0) && (
                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <h3 className="font-medium text-stone-900 mb-4">Détails du paiement</h3>

                  <div className="space-y-2 mb-5">
                    {jobsAddonPacks > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">💼 Jobs étudiants ({jobsAddonPacks} pack{jobsAddonPacks > 1 ? 's' : ''})</span>
                        <span className="font-medium text-stone-900">{jobsAddonPacks * 50} €</span>
                      </div>
                    )}
                    {jobOffersAddonPacks > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone-500">🎯 Offres d'emploi ({jobOffersAddonPacks} pack{jobOffersAddonPacks > 1 ? 's' : ''})</span>
                        <span className="font-medium text-stone-900">{jobOffersAddonPacks * 150} €</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-stone-400">
                      <span>TVA ({exemptFromVAT ? "0% — Exonéré" : "21%"})</span>
                      <span>{Math.round(((jobsAddonPacks * 50) + (jobOffersAddonPacks * 150)) * (exemptFromVAT ? 0 : 0.21) * 100) / 100} €</span>
                    </div>
                    <div className="flex justify-between font-medium text-stone-900 pt-2 border-t border-stone-100">
                      <span>Total</span>
                      <span className="text-lg">{Math.round((((jobsAddonPacks * 50) + (jobOffersAddonPacks * 150)) * (exemptFromVAT ? 1 : 1.21)) * 100) / 100} €</span>
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 text-sm mb-5">
                    {[
                      { label: "Bénéficiaire", value: "Educ-Connect ASBL" },
                      { label: "IBAN",          value: "BE00 0000 0000 0000" },
                      { label: "BIC / SWIFT",   value: "GEBABEBB" },
                      { label: "Montant",       value: `${Math.round((((jobsAddonPacks * 50) + (jobOffersAddonPacks * 150)) * (exemptFromVAT ? 1 : 1.21)) * 100) / 100},00 €` },
                      { label: "Communication", value: `${subscription?.paymentReference || "EDUC-XXXXXXXX"}-ADDON`, highlight: true },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center py-2.5 px-3 rounded-lg ${(row as { highlight?: boolean }).highlight ? "bg-amber-50 border border-amber-200" : "bg-white border border-stone-100"}`}>
                        <span className="text-stone-500">{row.label}</span>
                        <span className={`font-medium text-xs ${(row as { highlight?: boolean }).highlight ? "text-amber-800 font-mono tracking-wide" : "text-stone-900"}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleAddPacks} disabled={submitting}
                    className={`w-full text-white py-3.5 rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2 ${submitted ? "bg-green-600 hover:bg-green-700" : "bg-stone-900 hover:bg-stone-800 disabled:opacity-50"}`}>
                    {submitted ? "✅ La demande a été faite. La facturation sera effectuée après vérification dans les 48 heures" : submitting ? "Enregistrement…" : "J'ai fait le virement et envoyé la confirmation par email"}
                  </button>
                </div>
              )}

              {(jobsAddonPacks === 0 && jobOffersAddonPacks === 0) && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 text-center">
                  <p className="text-stone-500 text-sm">Sélectionnez au moins un pack pour continuer.</p>
                </div>
              )}
            </div>
        </>
      )}

      {/* ── FORMULAIRE SOUSCRIPTION ───────────────────────────────────── */}
      {(!subscription || subscription.status === "EXPIRED") && !isAddonsMode && (
        <>
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
              <p className="text-sm font-medium text-green-700 mb-2">✅ Demande enregistrée</p>
              <p className="text-sm text-green-600">Votre abonnement sera activé dès que votre virement sera confirmé par notre équipe (généralement sous 2 jours ouvrables).</p>
            </div>
          )}

          {!submitted && (
            <>
              {/* Étape 1 : Formule */}
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-white text-sm font-medium flex items-center justify-center flex-shrink-0">1</div>
                  <h2 className="font-medium text-stone-900">Choisissez votre formule</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {PLANS.map(plan => {
                    const colorConfig = {
                      ANNUAL: { gradient: "from-sky-50 to-white", border: "border-sky-300", accent: "text-sky-700", accentBg: "bg-sky-100", buttonBg: "bg-sky-600", buttonHover: "hover:bg-sky-700", badgeBg: "bg-sky-500" },
                      SCHOOL: { gradient: "from-emerald-50 to-white", border: "border-emerald-300", accent: "text-emerald-700", accentBg: "bg-emerald-100", buttonBg: "bg-emerald-600", buttonHover: "hover:bg-emerald-700", badgeBg: "bg-emerald-500" },
                    } as const;
                    const config = colorConfig[plan.key as keyof typeof colorConfig] || colorConfig.ANNUAL;
                    const active = selectedPlan === plan.key;
                    return (
                      <button key={plan.key} onClick={() => { setSelectedPlan(plan.key); setJobsAddonPacks(0); }}
                        className={`text-left rounded-2xl border-2 p-6 transition-all bg-gradient-to-br ${config.gradient} ${config.border} flex flex-col shadow-sm hover:shadow-md`}>
                        {plan.highlight && (
                          <div className={`mb-3 inline-block text-xs font-bold ${config.badgeBg} text-white px-2.5 py-1 rounded-full whitespace-nowrap w-fit`}>
                            ⭐ Recommandé
                          </div>
                        )}
                        <div className="mb-4">
                          <p className="text-4xl mb-2">{plan.icon}</p>
                          <p className="font-bold text-xl text-stone-900">{plan.label}</p>
                        </div>
                        {plan.key === "SCHOOL" && (
                          <p className="text-xs font-medium mb-3 text-emerald-600">🏫 Année académique</p>
                        )}
                        <p className="text-sm mb-4 flex-1 text-stone-600">{plan.desc}</p>
                        <div className="border-t border-stone-200 pt-4 mb-4">
                          <p className={`text-3xl font-bold mb-1 ${config.accent}`}>{plan.price}€</p>
                          <p className="text-xs text-stone-500">{plan.priceUnit}</p>
                        </div>
                        <div className={`rounded-lg py-2 px-3 text-sm font-medium text-center transition-all ${active ? `${config.buttonBg} text-white font-semibold` : `${config.accentBg} ${config.accent}`}`}>
                          {active ? "✓ Sélectionné" : "Choisir"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Étape 2 : Option Jobs étudiants */}
              <section className={`mb-8 transition-all duration-200 ${!selectedPlan ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full text-white text-sm font-medium flex items-center justify-center flex-shrink-0 ${selectedPlan ? "bg-stone-900" : "bg-stone-300"}`}>2</div>
                  <h2 className="font-medium text-stone-900">Options supplémentaires</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 rounded-2xl p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-2xl mb-1">💼</p>
                        <p className="font-semibold text-stone-900 text-lg">Jobs étudiants</p>
                        <p className="text-sm text-emerald-700 font-medium mt-1">5 slots par pack</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 mb-4 flex-1">Publiez des offres de jobs étudiants dans le secteur social de Belgique francophone.</p>
                    <div className="flex items-center justify-between pt-4 border-t border-emerald-100">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setJobsAddonPacks(Math.max(0, jobsAddonPacks - 1))}
                          className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center font-bold text-lg">−</button>
                        <span className="w-10 text-center font-bold text-stone-900 text-lg">{jobsAddonPacks}</span>
                        <button onClick={() => setJobsAddonPacks(jobsAddonPacks + 1)}
                          className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center justify-center font-bold text-lg">+</button>
                      </div>
                      <p className="font-semibold text-emerald-700 text-lg">{jobsAddonPacks * 50}€</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-sky-50 to-white border-2 border-sky-200 rounded-2xl p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-2xl mb-1">🎯</p>
                        <p className="font-semibold text-stone-900 text-lg">Offres d'emploi</p>
                        <p className="text-sm text-sky-700 font-medium mt-1">1 slot par pack</p>
                      </div>
                    </div>
                    <p className="text-sm text-stone-600 mb-4 flex-1">Publiez des offres d'emploi (CDI, CDD, missions) pour recruter des professionnels.</p>
                    <div className="flex items-center justify-between pt-4 border-t border-sky-100">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setJobOffersAddonPacks(Math.max(0, jobOffersAddonPacks - 1))}
                          className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors flex items-center justify-center font-bold text-lg">−</button>
                        <span className="w-10 text-center font-bold text-stone-900 text-lg">{jobOffersAddonPacks}</span>
                        <button onClick={() => setJobOffersAddonPacks(jobOffersAddonPacks + 1)}
                          className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors flex items-center justify-center font-bold text-lg">+</button>
                      </div>
                      <p className="font-semibold text-sky-700 text-lg">{jobOffersAddonPacks * 150}€</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Étape 3 : Situation fiscale */}
              <section className={`mb-8 transition-all duration-200 ${!selectedPlan ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full text-white text-sm font-medium flex items-center justify-center flex-shrink-0 ${selectedPlan ? "bg-stone-900" : "bg-stone-300"}`}>3</div>
                  <h2 className="font-medium text-stone-900">Situation fiscale</h2>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exemptFromVAT}
                      onChange={e => setExemptFromVAT(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-stone-300 cursor-pointer flex-shrink-0"
                    />
                    <p className="font-medium text-stone-900">Mon institution n'est pas assujettie à la TVA</p>
                  </label>
                </div>
              </section>

              {/* Étape 4 : Virement bancaire */}
              <section className={`mb-8 transition-all duration-200 ${!selectedPlan ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-7 h-7 rounded-full text-white text-sm font-medium flex items-center justify-center flex-shrink-0 ${selectedPlan ? "bg-stone-900" : "bg-stone-300"}`}>4</div>
                  <h2 className="font-medium text-stone-900">Paiement par virement bancaire</h2>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-6">
                  <p className="text-sm text-stone-500 mb-5">
                    Effectuez votre virement avec les informations ci-dessous. Votre abonnement sera activé dans les 2 jours ouvrables après réception.
                  </p>
                  <div className="space-y-2 mb-5">
                    {[
                      { label: "Bénéficiaire", value: "Educ-Connect ASBL" },
                      { label: "IBAN",          value: "BE00 0000 0000 0000" },
                      { label: "BIC / SWIFT",   value: "GEBABEBB" },
                      { label: "Montant",       value: selectedPlanData ? `${totalPrice},00 €` : "—" },
                      { label: "Communication", value: refVirement, highlight: true },
                    ].map(row => (
                      <div key={row.label} className={`flex justify-between items-center py-2.5 px-4 rounded-xl text-sm ${(row as { highlight?: boolean }).highlight ? "bg-amber-50 border border-amber-200" : "bg-stone-50"}`}>
                        <span className="text-stone-500">{row.label}</span>
                        <span className={`font-medium ${(row as { highlight?: boolean }).highlight ? "text-amber-800 font-mono tracking-wide" : "text-stone-900"}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-700 mb-5">
                    ⚠️ <strong>Important :</strong> mentionnez bien la communication <strong>{refVirement}</strong> dans votre virement.
                  </div>
                  <p className="text-sm text-stone-500 mb-5">
                    Après votre virement, envoyez une confirmation à{" "}
                    <a href="mailto:contact@educonnect.be" className="text-sky-600 underline">contact@educonnect.be</a>{" "}
                    avec votre référence <strong>{refVirement}</strong>.
                  </p>

                  {/* Récapitulatif + bouton */}
                  {selectedPlan && (
                    <div className="border-t border-stone-100 pt-5">
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-500">{selectedPlanData?.label} ({selectedPlanData?.period})</span>
                          <span className="font-medium text-stone-900">{selectedPlanData?.price} €</span>
                        </div>
                        {jobsAddonPacks > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-500">💼 Jobs étudiants ({jobsAddonPacks} pack{jobsAddonPacks > 1 ? 's' : ''})</span>
                            <span className="font-medium text-stone-900">{jobsAddonCost} €</span>
                          </div>
                        )}
                        {jobOffersAddonPacks > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-500">🎯 Offres d'emploi ({jobOffersAddonPacks} pack{jobOffersAddonPacks > 1 ? 's' : ''})</span>
                            <span className="font-medium text-stone-900">{jobOffersCost} €</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-stone-400">
                          <span>TVA ({exemptFromVAT ? "0% — Exonéré" : "21%"})</span><span>{vat} €</span>
                        </div>
                        <div className="flex justify-between font-medium text-stone-900 pt-2 border-t border-stone-100">
                          <span>Total</span>
                          <span className="text-lg">{totalPrice} €</span>
                        </div>
                      </div>
                      <button onClick={handleSubmit} disabled={submitting}
                        className={`w-full text-white py-3.5 rounded-xl font-medium transition-colors text-sm flex items-center justify-center gap-2 ${submitted ? "bg-green-600 hover:bg-green-700" : "bg-stone-900 hover:bg-stone-800 disabled:opacity-50"}`}>
                        {submitted ? "✅ La vérification est faite, la facture et votre compte seront prêt dans les 48 heures" : submitting ? "Enregistrement…" : "J'ai fait le virement et envoyé la confirmation par email"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

        </>
      )}
    </main>
  );
}

export default function MembershipPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={null}>
        <MembershipContent />
      </Suspense>
    </>
  );
}
