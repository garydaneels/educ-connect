"use client";
import { useState } from "react";

const SUBJECTS = [
  "Question sur la plateforme",
  "Problème technique",
  "Je suis une institution, je veux rejoindre",
  "Demande de partenariat",
  "Signalement d'un contenu",
  "Autre",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      setError("Une erreur est survenue. Réessayez ou écrivez directement à contact@educonnect.be");
    }
    setLoading(false);
  }

  if (sent) return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-medium text-stone-900 mb-2">Message envoyé !</h2>
      <p className="text-stone-500 text-sm leading-relaxed">
        Merci, <strong>{name}</strong>. Nous vous répondrons à <strong>{email}</strong> sous 48h ouvrables.
      </p>
      <button onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
        className="mt-6 text-sm text-orange-600 hover:underline font-medium">
        Envoyer un autre message
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1.5">Nom complet *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="Marie Martin"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-900 mb-1.5">Email *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.be"
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-900" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1.5">Sujet</label>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-stone-900">
            <option value="">Choisissez un sujet…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1.5">Message *</label>
          <textarea rows={6} required value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Décrivez votre question ou votre demande en détail…"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none text-stone-900" />
          <p className="text-xs text-stone-400 mt-1">{message.length} caractères</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium text-sm transition-colors">
          {loading ? "Envoi en cours…" : "Envoyer le message ✉️"}
        </button>
      </form>
    </div>
  );
}
