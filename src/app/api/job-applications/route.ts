import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { jobOfferId, name, email, phone, message } = await req.json();

  if (!jobOfferId || !name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
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
