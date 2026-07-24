import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; email?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé aux institutions" }, { status: 403 });

  const institution = await prisma.institution.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      user: { select: { email: true } },
      subscription: {
        select: { id: true, plan: true, status: true, price: true, startDate: true, endDate: true },
      },
    },
  });

  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });
  if (!institution.subscription) return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 404 });

  const sub = institution.subscription;
  if (sub.status !== "ACTIVE") {
    return NextResponse.json({ error: "Impossible de générer une facture pour un abonnement inactif" }, { status: 400 });
  }
  const email = institution.user.email;

  const now = new Date();
  const year = now.getFullYear();
  const ts = now.getTime().toString(36).toUpperCase().slice(-5);
  const shortId = institution.id.slice(0, 4).toUpperCase();
  const invoiceNumber = `EDC-${year}-${shortId}-${ts}`;

  const price = sub.price ?? 0;
  const startDate = sub.startDate ? (typeof sub.startDate === "string" ? sub.startDate : (sub.startDate as Date).toISOString()) : now.toISOString();
  const endDate = sub.endDate ? (typeof sub.endDate === "string" ? sub.endDate : (sub.endDate as Date).toISOString()) : now.toISOString();

  try {
    await sendInvoiceEmail({
      to: email,
      institutionName: institution.name,
      invoiceNumber,
      plan: sub.plan,
      startDate,
      endDate,
      price,
      issuedAt: now.toISOString(),
    });
    return NextResponse.json({ ok: true, sentTo: email });
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}
