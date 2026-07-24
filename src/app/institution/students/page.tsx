"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Pagination } from "@/components/Pagination";
import { PUBLIC_TYPES, STUDY_YEARS } from "@/lib/constants";

interface StudentResult {
  userId: string;
  studyYear: string | null;
  schoolName: string | null;
  sectorPreference: string | null;
  stageStartDate: string | null;
  stageEndDate: string | null;
  stageMaxHours: number | null;
  user: { id: string; name: string | null };
}

const STUDY_YEAR_GROUPS = [
  { label: "Secondaire", keys: ["SEC_4", "SEC_5", "SEC_6"] },
  { label: "Haute École", keys: ["HE_1", "HE_2", "HE_3"] },
  { label: "Master", keys: ["MASTER_1", "MASTER_2"] },
];

const PAGE_SIZE = 12;

export default function InstitutionStudentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [students, setStudents] = useState<StudentResult[]>([]);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [loadingInterests, setLoadingInterests] = useState<Set<string>>(new Set());
  const [myPublicTypes, setMyPublicTypes] = useState<string[]>([]);

  const [filterSector, setFilterSector] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/institutions/mine", { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch("/api/institution/interests").then(r => r.ok ? r.json() : []),
    ]).then(([mine, ints]) => {
      if (mine?.publicTypes) {
        const types: string[] = JSON.parse(mine.publicTypes);
        setMyPublicTypes(types);
        if (types.length > 0) setFilterSector(types[0]);
      }
      setInterested(new Set(ints));
    });
  }, [status]);

  const fetchStudents = useCallback((pageNum = 1) => {
    setLoading(true);
    setPage(pageNum);
    const params = new URLSearchParams();
    if (filterSector) params.set("sector", filterSector);
    if (filterYear) params.set("studyYear", filterYear);
    params.set("take", String(PAGE_SIZE));
    params.set("skip", String((pageNum - 1) * PAGE_SIZE));
    fetch(`/api/institution/students?${params}`)
      .then(r => r.ok ? r.json() : { students: [], total: 0 })
      .then(data => {
        setStudents(Array.isArray(data) ? data : (data.students ?? []));
        setTotal(Array.isArray(data) ? 0 : (data.total ?? 0));
        setLoading(false);
      });
  }, [filterSector, filterYear]);

  useEffect(() => {
    if (status === "authenticated") fetchStudents(1);
  }, [status, fetchStudents]);

  async function toggleInterest(studentId: string) {
    setLoadingInterests(prev => new Set(prev).add(studentId));
    const res = await fetch("/api/institution/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    if (res.ok) {
      const data = await res.json();
      setInterested(prev => {
        const next = new Set(prev);
        if (data.interested) next.add(studentId);
        else next.delete(studentId);
        return next;
      });
    }
    setLoadingInterests(prev => { const next = new Set(prev); next.delete(studentId); return next; });
  }

  if (status === "loading") return null;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-medium text-stone-900">🎓 Recherche d'étudiants</h1>
          <p className="text-stone-500 text-sm mt-1">Trouvez des étudiants en recherche de stage selon leur année et secteur préféré.</p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Secteur préféré</label>
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="">Tous les secteurs</option>
              {myPublicTypes.length > 0 && (
                <optgroup label="Vos secteurs">
                  {myPublicTypes.map(k => (
                    <option key={k} value={k}>{(PUBLIC_TYPES as Record<string, string>)[k] ?? k}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Tous les secteurs">
                {Object.entries(PUBLIC_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Année d'étude</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <option value="">Toutes les années</option>
              {STUDY_YEAR_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.keys.map(k => (
                    <option key={k} value={k}>{STUDY_YEARS[k]}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setFilterSector(""); setFilterYear(""); }}
            className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* Résultats */}
        {loading ? (
          <div className="text-center py-20 text-stone-400 text-sm">Chargement…</div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm text-center py-16">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-stone-500 text-sm">Aucun étudiant ne correspond à ces critères.</p>
            <p className="text-stone-400 text-xs mt-1">Les étudiants doivent renseigner leur année d'étude dans leur profil pour apparaître ici.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(s => {
                const isInterested = interested.has(s.userId);
                const isLoading = loadingInterests.has(s.userId);
                const initials = s.user.name ? s.user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
                return (
                  <div key={s.userId} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 text-sm truncate">{s.user.name ?? "Étudiant(e)"}</p>
                        {s.schoolName && <p className="text-xs text-stone-500 truncate">{s.schoolName}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {s.studyYear && (
                        <span className="inline-flex items-center text-xs bg-sky-50 border border-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-medium">
                          🎓 {STUDY_YEARS[s.studyYear] ?? s.studyYear}
                        </span>
                      )}
                      {s.sectorPreference && (
                        <span className="inline-flex items-center text-xs bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                          🏷️ {(PUBLIC_TYPES as Record<string, string>)[s.sectorPreference] ?? s.sectorPreference}
                        </span>
                      )}
                    </div>

                    {(s.stageStartDate || s.stageEndDate || s.stageMaxHours) && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 space-y-1">
                        {(s.stageStartDate || s.stageEndDate) && (
                          <div className="flex gap-3 flex-wrap">
                            {s.stageStartDate && (
                              <div>
                                <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Début</p>
                                <p className="text-xs font-medium text-orange-900">{new Date(s.stageStartDate).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                            )}
                            {s.stageEndDate && (
                              <div>
                                <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Fin</p>
                                <p className="text-xs font-medium text-orange-900">{new Date(s.stageEndDate).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                            )}
                            {s.stageMaxHours && (
                              <div>
                                <p className="text-[10px] text-orange-500 font-medium uppercase tracking-wide">Heures max</p>
                                <p className="text-xs font-medium text-orange-900">{s.stageMaxHours}h</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto pt-1">
                      <Link
                        href={`/students/${s.userId}`}
                        className="flex-1 text-center text-xs font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 px-3 py-2 rounded-xl transition-colors"
                      >
                        Voir le profil
                      </Link>
                      <button
                        onClick={() => toggleInterest(s.userId)}
                        disabled={isLoading}
                        className={`flex-1 text-xs font-medium px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                          isInterested
                            ? "bg-sky-100 border border-sky-200 text-sky-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            : "bg-sky-600 hover:bg-sky-700 text-white"
                        }`}
                      >
                        {isLoading ? "…" : isInterested ? "✓ Intéressé" : "Marquer intérêt"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-stone-400 mt-6">
              {total} étudiant{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
              {totalPages > 1 && ` · page ${page} sur ${totalPages}`}
            </p>

            <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchStudents} />
          </>
        )}
      </main>
    </>
  );
}
