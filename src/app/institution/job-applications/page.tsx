"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

interface JobApplication {
  id: string;
  jobOfferId: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  cvPath?: string | null;
  letterPath?: string | null;
  status: string;
  createdAt: string;
  jobOffer: {
    id: string;
    title: string;
  };
}

export default function JobApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as { role?: string } | undefined;

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && user?.role !== "INSTITUTION") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/institution/job-applications")
        .then(r => r.json())
        .then(setApplications)
        .catch(() => setApplications([]))
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-5 py-10 text-center text-stone-600">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">📮 Candidatures reçues</h1>

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-stone-600 mb-2">Aucune candidature pour le moment</p>
            <p className="text-sm text-stone-400">Les candidatures apparaîtront ici dès que des étudiants ou chercheurs d'emploi postuleront</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-2xl border border-stone-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-stone-900">{app.name}</h2>
                    <p className="text-sm text-stone-600">{app.email}</p>
                    {app.phone && <p className="text-sm text-stone-600">📱 {app.phone}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    app.status === "PENDING"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                  }`}>
                    {app.status === "PENDING" ? "En attente" : "Acceptée"}
                  </span>
                </div>

                <div className="mb-4 pb-4 border-b border-stone-100">
                  <p className="text-sm text-stone-700 mb-2">
                    <span className="font-medium">Offre:</span> <a href={`/institution/jobs#${app.jobOfferId}`} className="text-blue-600 hover:underline">{app.jobOffer.title}</a>
                  </p>
                  <p className="text-xs text-stone-400">
                    Candidature du {new Date(app.createdAt).toLocaleDateString("fr-BE")} à {new Date(app.createdAt).toLocaleTimeString("fr-BE")}
                  </p>
                </div>

                {app.message && (
                  <div className="mb-4 bg-stone-50 rounded-lg p-4 text-sm text-stone-700">
                    <p className="font-medium text-stone-900 mb-1">Message:</p>
                    <p className="line-clamp-3">{app.message}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {app.cvPath && (
                    <a href={app.cvPath} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      📄 CV
                    </a>
                  )}
                  {app.letterPath && (
                    <a href={app.letterPath} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                      📝 Lettre
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
