import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { subscriptionId, jobsAddonPacks, jobOffersAddonPacks, exemptFromVAT } = await req.json();

    if (!subscriptionId) return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });

    // Vérifier que la subscription appartient à l'institution de l'utilisateur
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { institution: true },
    });

    if (!subscription) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    const user = session.user as { id?: string };
    if (subscription.institution.userId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Créer une demande de packs au lieu d'ajouter directement
    const addonRequest = await prisma.addonPackRequest.create({
      data: {
        subscriptionId,
        jobsAddonPacks: jobsAddonPacks || 0,
        jobOffersAddonPacks: jobOffersAddonPacks || 0,
        paymentReference: generatePaymentReference() + "-ADDON",
        exemptFromVAT: exemptFromVAT || false,
      },
    });

    return NextResponse.json(addonRequest);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
