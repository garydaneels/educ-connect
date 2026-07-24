import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #fff7ed 0%, #f0f9ff 50%, #fef3c7 100%)" }}>
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-5xl font-medium text-stone-900 mb-2">404</h1>
        <h2 className="text-xl font-medium text-stone-700 mb-4">Page introuvable</h2>
        <p className="text-stone-500 mb-8 leading-relaxed">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors">
            Retour à l'accueil
          </Link>
          <Link href="/login"
            className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 px-6 py-3 rounded-xl font-medium text-sm transition-colors">
            Se connecter
          </Link>
        </div>
        <div className="mt-10">
          <Link href="/"><Logo /></Link>
        </div>
      </div>
    </div>
  );
}
