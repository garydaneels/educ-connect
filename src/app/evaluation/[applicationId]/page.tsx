"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface Evaluation {
  id: string;
  authorRole: string;
  ratingGlobal: number;
  ratingIntegration?: number | null;
  ratingTasks?: number | null;
  ratingSupervision?: number | null;
  ratingAutonomy?: number | null;
  comment?: string | null;
  createdAt: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className={`text-xl transition-colors ${onChange ? "cursor-pointer" : "cursor-default"} ${n <= value ? "text-orange-400" : "text-stone-200"}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function EvalCard({ eval: e, role }: { eval: Evaluation; role: string }) {
  const isStudent = e.authorRole === "STUDENT";
  return (
    <div className={`rounded-2xl border p-5 ${isStudent ? "bg-sky-50 border-sky-100" : "bg-orange-50 border-orange-100"}`}>
      <p className="text-xs font-medium mb-3 text-stone-500">
        {isStudent ? "👤 Évaluation de l'étudiant" : "🏥 Évaluation de l'institution"}
        {e.authorRole === role && " (la vôtre)"}
      </p>
      <div className="space-y-2">
        <StarRating value={e.ratingGlobal} label="Note globale" />
        {e.ratingIntegration != null && <StarRating value={e.ratingIntegration} label="Intégration dans l'équipe" />}
        {e.ratingTasks != null && <StarRating value={e.ratingTasks} label="Qualité des missions" />}
        {e.ratingSupervision != null && <StarRating value={e.ratingSupervision} label="Encadrement reçu" />}
        {e.ratingAutonomy != null && <StarRating value={e.ratingAutonomy} label="Autonomie" />}
        {e.comment && (
          <p className="mt-3 text-sm text-stone-700 bg-white/60 rounded-xl p-3 leading-relaxed">
            "{e.comment}"
          </p>
        )}
      </div>
    </div>
  );
}

export default function EvaluationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;
  const user = session?.user as { id?: string; role?: string } | undefined;
  const role = user?.role ?? "";

  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ratingGlobal, setRatingGlobal] = useState(0);
  const [ratingIntegration, setRatingIntegration] = useState(0);
  const [ratingTasks, setRatingTasks] = useState(0);
  const [ratingExtra, setRatingExtra] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!applicationId) return;
    fetch(`/api/evaluations/${applicationId}`)
      .then(r => r.json())
      .then(data => {
        setEvaluations(Array.isArray(data) ? data : []);
        const mine = data.find((e: Evaluation) => e.authorRole === role);
        if (mine) {
          setRatingGlobal(mine.ratingGlobal);
          setRatingIntegration(mine.ratingIntegration ?? 0);
          setRatingTasks(mine.ratingTasks ?? 0);
          setRatingExtra(role === "STUDENT" ? (mine.ratingSupervision ?? 0) : (mine.ratingAutonomy ?? 0));
          setComment(mine.comment ?? "");
          setSaved(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [applicationId, role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ratingGlobal === 0) { setError("Veuillez donner au moins une note globale."); return; }
    setSaving(true);
    setError("");
    const body: Record<string, number | string> = { ratingGlobal, comment };
    if (ratingIntegration > 0) body.ratingIntegration = ratingIntegration;
    if (ratingTasks > 0) body.ratingTasks = ratingTasks;
    if (ratingExtra > 0) {
      if (role === "STUDENT") body.ratingSupervision = ratingExtra;
      else body.ratingAutonomy = ratingExtra;
    }
    const res = await fetch(`/api/evaluations/${applicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setEvaluations(prev => {
        const idx = prev.findIndex(e => e.authorRole === role);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
      setSaved(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement.");
    }
    setSaving(false);
  }

  const myEval = evaluations.find(e => e.authorRole === role);
  const otherEval = evaluations.find(e => e.authorRole !== role);
  const backHref = role === "INSTITUTION" ? "/institution/stagiaires" : "/student/applications";

  if (status === "loading" || loading) return (
    <>
      <Navbar />
      <div className="flex items-center justify-center h-64 text-stone-400">Chargement…</div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
          <Link href={backHref} className="hover:text-orange-500 transition-colors">← Retour</Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-medium text-stone-900 mb-1">Évaluation de fin de stage</h1>
          <p className="text-stone-500 text-sm">
            {role === "STUDENT"
              ? "Partagez votre expérience dans cette institution."
              : "Évaluez le stagiaire qui a effectué son stage chez vous."}
          </p>
        </div>

        <div className="space-y-6">
          {/* Formulaire */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-base font-medium text-stone-900 mb-5">
              {saved ? "Votre évaluation" : "Remplir mon évaluation"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <StarRating
                value={ratingGlobal}
                onChange={saved ? undefined : setRatingGlobal}
                label="Note globale *"
              />
              <StarRating
                value={ratingIntegration}
                onChange={saved ? undefined : setRatingIntegration}
                label="Intégration dans l'équipe"
              />
              <StarRating
                value={ratingTasks}
                onChange={saved ? undefined : setRatingTasks}
                label="Qualité des missions"
              />
              <StarRating
                value={ratingExtra}
                onChange={saved ? undefined : setRatingExtra}
                label={role === "STUDENT" ? "Qualité de l'encadrement" : "Autonomie de l'étudiant"}
              />

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">Commentaire <span className="text-stone-400">(optionnel)</span></label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  disabled={saved}
                  placeholder="Décrivez votre expérience…"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none text-stone-900 disabled:bg-stone-50 disabled:text-stone-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {saved ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                  ✅ Évaluation enregistrée
                  <button type="button" onClick={() => setSaved(false)} className="ml-auto text-stone-400 hover:text-stone-600 text-xs underline">
                    Modifier
                  </button>
                </div>
              ) : (
                <button type="submit" disabled={saving || ratingGlobal === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm transition-colors">
                  {saving ? "Enregistrement…" : "Envoyer mon évaluation"}
                </button>
              )}
            </form>
          </div>

          {/* Évaluation de l'autre partie */}
          {otherEval ? (
            <div>
              <h2 className="text-base font-medium text-stone-900 mb-3">
                {role === "STUDENT" ? "Ce que l'institution a dit de vous" : "Ce que l'étudiant a dit de vous"}
              </h2>
              <EvalCard eval={otherEval} role={role} />
            </div>
          ) : myEval ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5 text-center text-sm text-stone-500">
              <p>L'autre partie n'a pas encore déposé son évaluation.</p>
              <p className="text-xs mt-1">Elle sera visible ici dès qu'elle sera soumise.</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
