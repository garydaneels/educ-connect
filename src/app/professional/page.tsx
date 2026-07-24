"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

interface Profile {
  presentation: string | null;
  experiences: string;
  qualifications: string;
  sectorPreference: string | null;
  contractType: string | null;
}

export default function ProfessionalDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string; name?: string } | undefined;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "PROFESSIONAL") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/professional/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, [status]);

  const experiences = profile ? JSON.parse(profile.experiences || "[]") : [];
  const qualifications = profile ? JSON.parse(profile.qualifications || "[]") : [];

  if (loading) return <Navbar />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* En-tête */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Mon profil</h1>
              <p className="text-stone-600 mt-1">Chercheur d'emploi</p>
            </div>
            <Link href="/professional/profile" className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              ✏️ Éditer
            </Link>
          </div>

          {/* Présentation */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">📝 Présentation</h2>
            {profile?.presentation ? (
              <p className="text-stone-900 leading-relaxed">{profile.presentation}</p>
            ) : (
              <p className="text-stone-500 italic">Aucune présentation ajoutée. <Link href="/professional/profile" className="text-sky-600 hover:underline">Ajouter une présentation</Link></p>
            )}
          </div>

          {/* Expériences */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">💼 Expériences professionnelles</h2>
            {experiences.length > 0 ? (
              <div className="space-y-4">
                {experiences.map((exp: any) => (
                  <div key={exp.id} className="border-l-4 border-sky-600 pl-4 py-2">
                    <h3 className="font-semibold text-stone-900">{exp.title}</h3>
                    <p className="text-sm text-stone-700">{exp.company}</p>
                    <p className="text-xs text-stone-600 mt-1">
                      {exp.startDate} — {exp.ongoing ? "Actuellement" : exp.endDate}
                    </p>
                    {exp.description && (
                      <p className="text-sm text-stone-900 mt-2">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 italic">Aucune expérience ajoutée. <Link href="/professional/profile" className="text-sky-600 hover:underline">Ajouter une expérience</Link></p>
            )}
          </div>

          {/* Qualifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">🎓 Qualifications & Certifications</h2>
            {qualifications.length > 0 ? (
              <div className="space-y-4">
                {qualifications.map((qual: any) => (
                  <div key={qual.id} className="border-l-4 border-green-600 pl-4 py-2">
                    <h3 className="font-semibold text-stone-900">{qual.title}</h3>
                    <p className="text-sm text-stone-700">{qual.issuer}</p>
                    <p className="text-xs text-stone-600 mt-1">{qual.year}</p>
                    {qual.description && (
                      <p className="text-sm text-stone-900 mt-2">{qual.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 italic">Aucune qualification ajoutée. <Link href="/professional/profile" className="text-sky-600 hover:underline">Ajouter une qualification</Link></p>
            )}
          </div>

          {/* CV */}
          {profile?.cvPath && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">📄 Documents</h2>
              <a href={profile.cvPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 px-4 py-2.5 rounded-lg transition-colors font-medium">
                📄 Télécharger mon CV
              </a>
            </div>
          )}

          {/* Préférences */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">🎯 Préférences</h2>
            <div className="grid grid-cols-1 gap-3">
              {profile?.contractType ? (
                <div>
                  <p className="text-xs text-stone-600 font-medium">Type de contrat recherché</p>
                  <p className="text-stone-900 font-medium mt-1">{profile.contractType}</p>
                </div>
              ) : (
                <p className="text-sm text-stone-600">Aucune préférence définie</p>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/professional/jobs" className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center">
              💼 Voir les offres d'emploi
            </Link>
            <Link href="/professional/profile" className="border-2 border-sky-600 text-sky-600 hover:bg-sky-50 px-6 py-3 rounded-lg font-medium transition-colors text-center">
              ✏️ Éditer mon profil
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
