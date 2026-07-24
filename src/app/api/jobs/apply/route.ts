import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 applications per hour per user
    if (!rateLimit(getIp(req), 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Trop de candidatures. Réessayez dans une heure." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;

    // Authentification requise pour les candidatures
    if (!user?.id) {
      return NextResponse.json(
        { error: "Authentification requise pour postuler" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { jobOfferId, name, email, phone, message, cvPath } = body;

    // Validation des champs obligatoires
    if (!jobOfferId || !name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Job ID, name et email requis" },
        { status: 400 }
      );
    }

    // Validation des longueurs
    if (name.length > 100 || email.length > 255 || (message && message.length > 1000)) {
      return NextResponse.json(
        { error: "Contenu trop long" },
        { status: 400 }
      );
    }

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      );
    }

    // Vérifier que l'offre existe
    const job = await prisma.jobOffer.findUnique({
      where: { id: jobOfferId },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Offre d'emploi introuvable" },
        { status: 404 }
      );
    }

    // Créer la candidature - userId est obligatoire
    const application = await prisma.jobApplication.create({
      data: {
        jobOfferId,
        userId: user.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        message: message?.trim() || null,
        cvPath: cvPath || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
