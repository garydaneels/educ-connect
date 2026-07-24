import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    console.log("[jobs/apply POST] Body reçu:", body);

    const { jobOfferId, name, email, phone, message, cvPath } = body;

    if (!jobOfferId || !name?.trim() || !email?.trim()) {
      console.log("[jobs/apply POST] Champs manquants:", { jobOfferId, name, email });
      return NextResponse.json(
        { error: "Job ID, name et email requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'offre existe
    console.log("[jobs/apply POST] Recherche offre:", jobOfferId);
    const job = await prisma.jobOffer.findUnique({
      where: { id: jobOfferId },
    });

    if (!job) {
      console.log("[jobs/apply POST] Offre non trouvée:", jobOfferId);
      return NextResponse.json(
        { error: "Offre d'emploi introuvable" },
        { status: 404 }
      );
    }

    // Créer la candidature
    console.log("[jobs/apply POST] Création candidature pour offre:", jobOfferId);
    const application = await prisma.jobApplication.create({
      data: {
        jobOfferId,
        userId: session?.user?.id || null,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        message: message?.trim() || null,
        cvPath: cvPath || null,
        status: "PENDING",
      },
    });

    console.log("[jobs/apply POST] Candidature créée:", application.id);
    return NextResponse.json(application, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    console.error("[jobs/apply POST] Erreur:", msg, e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
