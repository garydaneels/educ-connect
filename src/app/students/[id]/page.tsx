import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TYPES, STUDY_YEARS } from "@/lib/constants";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface Experience {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
}

interface PreviousStage {
  id: string;
  institutionName: string;
  sector: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
}

function fmt(d: string) {
  if (!d) return "";
  return new Date(d + "-02").toLocaleDateString("fr-BE", { month: "long", year: "numeric" });
}

function period(startDate: string, endDate: string, ongoing: boolean) {
  if (!startDate) return "";
  return `${fmt(startDate)} — ${ongoing ? "En cours" : endDate ? fmt(endDate) : "?"}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user?.name ? `${user.name} – Educ-Connect` : "Profil étudiant – Educ-Connect" };
}

export default async function StudentPublicProfilePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const actor = session?.user as { id?: string; role?: string } | undefined;

  if (!actor?.id || (actor.role !== "INSTITUTION" && actor.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-stone-900 font-medium mb-1">Accès restreint</p>
          <p className="text-stone-500 text-sm mb-5">Cette page est réservée aux institutions partenaires.</p>
          <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      studentProfile: {
        select: { presentation: true, cvPath: true, letterPath: true, experiences: true, previousStages: true, stageStartDate: true, stageEndDate: true, stageMaxHours: true, conventionPath: true, studyYear: true, schoolName: true, sectorPreference: true },
      },
    },
  });

  if (!user || !user.studentProfile) notFound();

  const profile = user.studentProfile;
  const experiences: Experience[] = JSON.parse(profile.experiences ?? "[]");
  const previousStages: PreviousStage[] = JSON.parse(profile.previousStages ?? "[]");

  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-BE", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-5 py-10 w-full">

        {/* En-tête */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium text-stone-900">{user.name ?? "Étudiant(e)"}</h1>
              <p className="text-stone-500 text-sm mt-0.5">Membre depuis {memberSince}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.studyYear && (
                  <span className="inline-flex items-center text-xs bg-sky-50 border border-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-medium">
                    🎓 {(STUDY_YEARS as Record<string, string>)[profile.studyYear] ?? profile.studyYear}
                  </span>
                )}
                {profile.schoolName && (
                  <span className="inline-flex items-center text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1 rounded-full">
                    🏫 {profile.schoolName}
                  </span>
                )}
                {profile.sectorPreference && (
                  <span className="inline-flex items-center text-xs bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                    🏷️ {(PUBLIC_TYPES as Record<string, string>)[profile.sectorPreference] ?? profile.sectorPreference}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {profile.cvPath && (
                  <a href={profile.cvPath} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl font-medium hover:bg-orange-100 transition-colors">
                    📋 Télécharger le CV
                  </a>
                )}
                {profile.letterPath && (
                  <a href={profile.letterPath} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-xl font-medium hover:bg-sky-100 transition-colors">
                    ✉️ Lettre de motivation
                  </a>
                )}
                {!profile.cvPath && !profile.letterPath && (
                  <span className="text-xs text-stone-400 italic">Aucun document déposé</span>
                )}
              </div>
            </div>
            <Link href="/institution/applications"
              className="shrink-0 text-sm text-stone-500 hover:text-stone-900 border border-stone-200 bg-white hover:bg-stone-50 px-4 h-11 flex items-center rounded-xl transition-colors font-medium">
              ← Candidatures
            </Link>
          </div>
        </div>

        {(profile.stageStartDate || profile.stageEndDate || profile.stageMaxHours || profile.conventionPath) && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
            <h2 className="text-base font-medium text-stone-900 mb-4">📅 Informations de stage</h2>
            <div className="flex flex-wrap gap-6">
              {profile.stageStartDate && (
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Date de début</p>
                  <p className="text-sm font-medium text-stone-900">{new Date(profile.stageStartDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              {profile.stageEndDate && (
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Date de fin</p>
                  <p className="text-sm font-medium text-stone-900">{new Date(profile.stageEndDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              {profile.stageMaxHours && (
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Heures maximum</p>
                  <p className="text-sm font-medium text-stone-900">{profile.stageMaxHours}h</p>
                </div>
              )}
              {profile.conventionPath && (
                <a href={profile.conventionPath} target="_blank" rel="noopener noreferrer"
                  className="self-end inline-flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl font-medium hover:bg-orange-100 transition-colors">
                  📋 Voir la convention de stage →
                </a>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Présentation */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-base font-medium text-stone-900 mb-3">👤 Présentation</h2>
            {profile.presentation ? (
              <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-wrap">{profile.presentation}</p>
            ) : (
              <p className="text-stone-400 text-sm italic">Aucune présentation rédigée.</p>
            )}
          </div>

          {/* Expériences */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-base font-medium text-stone-900 mb-4">💼 Expériences professionnelles</h2>
            {experiences.length === 0 ? (
              <p className="text-stone-400 text-sm italic">Aucune expérience renseignée.</p>
            ) : (
              <div className="space-y-4">
                {experiences.map(exp => (
                  <div key={exp.id} className="relative pl-4 border-l-2 border-orange-200">
                    <p className="text-sm font-medium text-stone-900">{exp.title}</p>
                    <p className="text-sm text-stone-600">{exp.organization}</p>
                    {exp.startDate && <p className="text-xs text-stone-400 mt-0.5">{period(exp.startDate, exp.endDate, exp.ongoing)}</p>}
                    {exp.description && <p className="text-xs text-stone-500 mt-1 leading-relaxed">{exp.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stages précédents */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <h2 className="text-base font-medium text-stone-900 mb-4">🎓 Stages précédents</h2>
            {previousStages.length === 0 ? (
              <p className="text-stone-400 text-sm italic">Aucun stage précédent renseigné.</p>
            ) : (
              <div className="space-y-4">
                {previousStages.map(s => (
                  <div key={s.id} className="relative pl-4 border-l-2 border-sky-200">
                    <p className="text-sm font-medium text-stone-900">{s.institutionName}</p>
                    {s.sector && (
                      <span className="inline-block text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full mt-0.5">
                        {(PUBLIC_TYPES as Record<string, string>)[s.sector] ?? s.sector}
                      </span>
                    )}
                    {s.startDate && <p className="text-xs text-stone-400 mt-0.5">{period(s.startDate, s.endDate, s.ongoing)}</p>}
                    {s.description && <p className="text-xs text-stone-500 mt-1 leading-relaxed">{s.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
