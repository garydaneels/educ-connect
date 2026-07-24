import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const requests = await prisma.addonPackRequest.findMany({
      where: { status: "PENDING" },
      include: {
        subscription: {
          include: { institution: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id, status, sendEmail } = await req.json();

    if (!id || !status) return NextResponse.json({ error: "ID and status required" }, { status: 400 });

    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    // Récupérer la demande
    const addonRequest = await prisma.addonPackRequest.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { institution: { include: { user: { select: { email: true, name: true } } } } },
        },
      },
    });

    if (!addonRequest) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Si approuvé, ajouter les packs à l'abonnement et créer un enregistrement de paiement
    if (status === "APPROVED") {
      await prisma.subscription.update({
        where: { id: addonRequest.subscriptionId },
        data: {
          ...(addonRequest.subscription.status !== "ACTIVE" && { status: "ACTIVE" }),
          jobsAddonPacks: { increment: addonRequest.jobsAddonPacks },
          jobOffersAddonPacks: { increment: addonRequest.jobOffersAddonPacks },
        },
      });

      // Calculer le montant
      const subtotal = (addonRequest.jobsAddonPacks * 50) + (addonRequest.jobOffersAddonPacks * 150);
      const vat = addonRequest.exemptFromVAT ? 0 : Math.round(subtotal * 0.21 * 100) / 100;
      const totalAmount = subtotal + vat;

      // Créer un enregistrement de paiement
      await prisma.payment.create({
        data: {
          subscriptionId: addonRequest.subscriptionId,
          type: "ADDON_PACK",
          amount: subtotal,
          vat,
          totalAmount,
          paymentReference: addonRequest.paymentReference,
          status: "CONFIRMED",
          jobsAddonPacks: addonRequest.jobsAddonPacks,
          jobOffersAddonPacks: addonRequest.jobOffersAddonPacks,
        },
      });
    }

    // Mettre à jour le statut de la demande
    const updatedRequest = await prisma.addonPackRequest.update({
      where: { id },
      data: { status },
      include: {
        subscription: {
          include: { institution: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
