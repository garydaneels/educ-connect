import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { sendContactFormToAdmin, sendContactFormConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!(await rateLimit(getIp(req), 5, 60 * 60))) {
    return NextResponse.json({ error: "Trop de messages envoyés. Réessayez dans une heure." }, { status: 429 });
  }

  const { name, email, subject, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  if (name.length > 100 || email.length > 255 || (subject && subject.length > 255) || message.length > 5000) {
    return NextResponse.json({ error: "Contenu trop long" }, { status: 400 });
  }

  try {
    await Promise.all([
      sendContactFormToAdmin(name, email, subject || "Pas de sujet", message),
      sendContactFormConfirmation(email, name),
    ]);
  } catch (error) {
    console.error("Contact form email error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
