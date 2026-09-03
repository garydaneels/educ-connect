import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 applications per hour per IP
  if (!(await rateLimit(getIp(req), 5, 60 * 60))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une heure." }, { status: 429 });
  }

  const { jobOfferId, name, email, phone, message } = await req.json();

  if (!jobOfferId || !name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // Validate input lengths
  if (name.trim().length > 100 || email.trim().length > 255) {
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 });
  }
  if (message && message.trim().length > 2000) {
    return NextResponse.json({ error: "Le message est trop long (max 2000 caractères)" }, { status: 400 });
  }

  const job = await prisma.jobOffer.findUnique({
    where: { id: jobOfferId },
    select: { id: true, status: true },
  });
  if (!job || job.status !== "ACTIVE") {
    return NextResponse.json({ error: "Offre introuvable ou inactive" }, { status: 404 });
  }

  const existing = await prisma.jobApplication.findFirst({
    where: { jobOfferId, email: email.trim().toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Vous avez déjà postulé à cette offre" }, { status: 409 });
  }

  const app = await prisma.jobApplication.create({
    data: {
      jobOfferId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message?.trim() || null,
    },
  });

  return NextResponse.json(app, { status: 201 });
}
