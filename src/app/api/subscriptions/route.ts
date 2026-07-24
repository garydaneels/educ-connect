import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePaymentReference } from "@/lib/payment";
import { sendSubscriptionPendingToInstitution, sendSubscriptionPendingToAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { id: string; role: string };
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const { plan, jobsAddonPacks, jobOffersAddonPacks, exemptFromVAT } = await req.json();

  // Validate plan
  const validPlans = ["ANNUAL", "SCHOOL"];
  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  // Validate addon packs
  if (jobsAddonPacks !== null && jobsAddonPacks !== undefined) {
    if (typeof jobsAddonPacks !== "number" || jobsAddonPacks < 0 || jobsAddonPacks > 1000) {
      return NextResponse.json({ error: "Nombre d'addons métiers invalide (0-1000)" }, { status: 400 });
    }
  }
  if (jobOffersAddonPacks !== null && jobOffersAddonPacks !== undefined) {
    if (typeof jobOffersAddonPacks !== "number" || jobOffersAddonPacks < 0 || jobOffersAddonPacks > 1000) {
      return NextResponse.json({ error: "Nombre d'addons offres invalide (0-1000)" }, { status: 400 });
    }
  }

  const existing = await prisma.subscription.findUnique({ where: { institutionId: institution.id } });
  if (existing && existing.status === "ACTIVE") {
    return NextResponse.json({ error: "Abonnement déjà actif" }, { status: 400 });
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (plan === "ANNUAL") {
    startDate = now;
    endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  } else {
    // SCHOOL : septembre → juin
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    startDate = new Date(year, 8, 1);        // 1er septembre
    endDate = new Date(year + 1, 5, 30);     // 30 juin
  }

  // Générer une communication unique (vérifier les collisions)
  let paymentRef: string = existing?.paymentReference || "";
  if (!paymentRef) {
    let isUnique = false;
    while (!isUnique) {
      const candidate = generatePaymentReference();
      const conflict = await prisma.subscription.findUnique({
        where: { paymentReference: candidate }
      });
      if (!conflict) {
        paymentRef = candidate;
        isUnique = true;
      }
    }
  }

  const sub = existing
    ? await prisma.subscription.update({
        where: { institutionId: institution.id },
        data: { plan, status: "PENDING_PAYMENT", startDate, endDate, jobsAddonPacks: jobsAddonPacks ?? 0, jobOffersAddonPacks: jobOffersAddonPacks ?? 0, exemptFromVAT: exemptFromVAT ?? false, paymentReference: paymentRef },
      })
    : await prisma.subscription.create({
        data: { institutionId: institution.id, plan, status: "PENDING_PAYMENT", startDate, endDate, paymentReference: paymentRef, jobsAddonPacks: jobsAddonPacks ?? 0, jobOffersAddonPacks: jobOffersAddonPacks ?? 0, exemptFromVAT: exemptFromVAT ?? false },
      });

  // Envoyer les emails
  try {
    const institutionWithUser = await prisma.institution.findUnique({
      where: { id: institution.id },
      include: { user: { select: { email: true, name: true } } },
    });

    if (institutionWithUser) {
      // Calculer le prix total pour l'email
      const planPrices: Record<string, number> = {
        ANNUAL: 199.99,
        SCHOOL: 166.66,
      };
      const basPrice = planPrices[plan] || 0;
      const jobsPrice = (jobsAddonPacks ?? 0) * 50;
      const jobOffersPrice = (jobOffersAddonPacks ?? 0) * 150;
      const subtotal = basPrice + jobsPrice + jobOffersPrice;
      const vat = exemptFromVAT ? 0 : Math.round(subtotal * 0.21 * 100) / 100;
      const totalPrice = subtotal + vat;

      // Email à l'institution
      await sendSubscriptionPendingToInstitution(
        institutionWithUser.user.email,
        institutionWithUser.user.name || "Contact",
        institutionWithUser.name,
        plan,
        paymentRef
      ).catch(() => {});

      // Email à l'admin
      await sendSubscriptionPendingToAdmin(
        institutionWithUser.name,
        institutionWithUser.user.email,
        plan,
        paymentRef,
        totalPrice
      ).catch(() => {});
    }
  } catch (e) {
    // Email sending errors are not critical
  }

  return NextResponse.json(sub);
}
