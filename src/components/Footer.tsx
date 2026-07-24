import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-100 bg-white/50 px-6 py-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
        <p>© {new Date().getFullYear()} Educ-Connect – Plateforme de stages en secteur social en Belgique francophone</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
          <Link href="/cgu" className="hover:text-stone-800 transition-colors">Conditions générales</Link>
          <Link href="/politique-confidentialite" className="hover:text-stone-800 transition-colors">Politique de confidentialité</Link>
          <Link href="/contact" className="hover:text-stone-800 transition-colors">Contact</Link>
          <a href="mailto:contact@educonnect.be" className="hover:text-stone-800 transition-colors">contact@educonnect.be</a>
        </nav>
      </div>
    </footer>
  );
}
