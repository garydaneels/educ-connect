"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user as { role?: string } | undefined;

  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [stagiairesCount, setStagiairesCount] = useState(0);
  const [hasJobsAddon, setHasJobsAddon] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user?.role) return;
    fetch("/api/stage/active", { credentials: "include" }).then(r => r.json()).then(data => {
      if (user.role === "STUDENT" && data?.id) setActiveStageId(data.id);
      if (user.role === "INSTITUTION" && data?.count > 0) setStagiairesCount(data.count);
    }).catch(() => {});
    if (user.role === "INSTITUTION") {
      fetch("/api/institutions/mine", { credentials: "include" }).then(r => r.json()).then(data => {
        setHasJobsAddon((data?.subscription?.jobsAddonPacks ?? 0) > 0);
      }).catch(() => {});
    }
  }, [user?.role]);

  const settingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  );

  const studentLinks = [
    { href: "/student", label: "Stages" },
    { href: "/student/jobs", label: "Jobs étudiants" },
    { href: "/student/applications", label: "Mes candidatures" },
    { href: "/student/profile", label: "Mon profil" },
  ];

  const institutionLinks = [
    { href: "/institution", label: "Mon institution" },
    { href: "/institution/applications", label: "Candidatures" },
    { href: "/institution/students", label: "Étudiants" },
    { href: "/institution/stagiaires", label: "Stagiaires", badge: stagiairesCount },
    ...(hasJobsAddon ? [{ href: "/institution/jobs", label: "Jobs", badge: 0 }] : []),
  ];

  const professionalLinks = [
    { href: "/professional", label: "Mon profil" },
    { href: "/professional/jobs", label: "Offres d'emploi" },
    { href: "/professional/applications", label: "Mes candidatures" },
    { href: "/professional/profile", label: "Éditer mon profil" },
  ];

  const navLinks = user?.role === "STUDENT" ? studentLinks
    : user?.role === "INSTITUTION" ? institutionLinks
    : user?.role === "PROFESSIONAL" ? professionalLinks
    : [];

  const hoverColor = user?.role === "INSTITUTION" ? "hover:text-sky-600" : "hover:text-orange-600";

  return (
    <nav className="bg-white border-b border-stone-100 shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
          <Logo />
        </Link>

        {/* ── Desktop nav ── */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {!session ? (
            <>
              <Link href="/login" className="text-stone-600 hover:text-stone-900 transition-colors">Connexion</Link>
              <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">
                S'inscrire
              </Link>
            </>
          ) : (
            <>
              {user?.role === "STUDENT" && (
                <>
                  {studentLinks.map(l => (
                    <Link key={l.href} href={l.href} className={`text-stone-600 ${hoverColor} transition-colors`}>{l.label}</Link>
                  ))}
                  {activeStageId && (
                    <Link href={`/stage/${activeStageId}`}
                      className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" />
                      Mon stage
                    </Link>
                  )}
                </>
              )}
              {user?.role === "INSTITUTION" && (
                <>
                  <Link href="/institution" className="text-stone-600 hover:text-sky-600 transition-colors">Mon institution</Link>
                  <Link href="/institution/applications" className="text-stone-600 hover:text-sky-600 transition-colors">Candidatures</Link>
                  <Link href="/institution/students" className="text-stone-600 hover:text-sky-600 transition-colors">Étudiants</Link>
                  <Link href="/institution/stagiaires" className="relative text-stone-600 hover:text-sky-600 transition-colors">
                    Stagiaires
                    {stagiairesCount > 0 && (
                      <span className="absolute -top-2 -right-3 bg-sky-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {stagiairesCount}
                      </span>
                    )}
                  </Link>
                  {hasJobsAddon && (
                    <Link href="/institution/jobs" className="text-stone-600 hover:text-sky-600 transition-colors">Jobs</Link>
                  )}
                  <Link href="/institution/membership" className="text-white bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    ⭐ Devenir membre
                  </Link>
                </>
              )}
              {user?.role === "PROFESSIONAL" && (
                <>
                  {professionalLinks.map(l => (
                    <Link key={l.href} href={l.href} className={`text-stone-600 hover:text-green-600 transition-colors`}>{l.label}</Link>
                  ))}
                </>
              )}
              {user?.role === "ADMIN" && (
                <Link href="/admin" className="text-stone-600 hover:text-stone-900 transition-colors">Administration</Link>
              )}

              <Link href="/settings" title="Paramètres du compte" className="text-stone-400 hover:text-stone-700 transition-colors p-1">
                {settingsIcon}
              </Link>
              <span className="text-stone-400 text-xs">|</span>
              <span className="text-stone-500 text-sm">{session.user?.name}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="text-stone-400 hover:text-red-500 text-sm transition-colors">
                Déconnexion
              </button>
            </>
          )}
        </div>

        {/* ── Mobile right: hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          {!session ? (
            <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
              S'inscrire
            </Link>
          ) : (
            <button onClick={() => setMobileOpen(v => !v)}
              className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 transition-colors" aria-label="Menu">
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && session && (
        <div className="md:hidden border-t border-stone-100 bg-white">
          <div className="px-3 py-3 flex flex-col gap-0.5">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between text-sm text-stone-700 hover:text-stone-900 hover:bg-stone-50 px-3 py-2.5 rounded-xl transition-colors font-medium">
                {l.label}
                {(l as { badge?: number }).badge && (l as { badge?: number }).badge! > 0 ? (
                  <span className="bg-sky-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {(l as { badge?: number }).badge}
                  </span>
                ) : null}
              </Link>
            ))}
            {activeStageId && user?.role === "STUDENT" && (
              <Link href={`/stage/${activeStageId}`} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm bg-sky-50 text-sky-700 hover:bg-sky-100 px-3 py-2.5 rounded-xl transition-colors font-medium mt-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Mon stage en cours
              </Link>
            )}
            {user?.role === "INSTITUTION" && (
              <Link href="/institution/membership" onClick={() => setMobileOpen(false)}
                className="text-sm bg-sky-600 hover:bg-sky-700 text-white px-3 py-2.5 rounded-xl transition-colors font-medium text-center mt-2">
                ⭐ Devenir membre
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link href="/admin" onClick={() => setMobileOpen(false)}
                className="text-sm text-stone-700 hover:bg-stone-50 px-3 py-2.5 rounded-xl transition-colors font-medium">
                Administration
              </Link>
            )}
          </div>
          <div className="border-t border-stone-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/settings" onClick={() => setMobileOpen(false)} className="text-stone-400 hover:text-stone-700 transition-colors p-1">
                {settingsIcon}
              </Link>
              <span className="text-sm text-stone-500 truncate max-w-[160px]">{session?.user?.name}</span>
            </div>
            <button onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
              className="text-sm text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg font-medium">
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
