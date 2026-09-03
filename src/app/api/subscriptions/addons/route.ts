import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/payment";

const addonRequestSchema = z.object({
  subscriptionId: z.string().cuid("Invalid subscription ID"),
  jobsAddonPacks: z.number().int().min(0).default(0),
  jobOffersAddonPacks: z.number().int().min(0).default(0),
  exemptFromVAT: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const validated = addonRequestSchema.parse(body);
    const { subscriptionId, jobsAddonPacks, jobOffersAddonPacks, exemptFromVAT } = validated;

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
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: e.issues }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
