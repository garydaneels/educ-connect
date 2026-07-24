import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSubscriptionActivated } from "@/lib/email";
import { generatePaymentReference } from "@/lib/payment";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const subscriptions = await prisma.subscription.findMany({
    include: { institution: { select: { name: true, commune: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { institutionId, plan, status, startDate, endDate, price, jobsAddonPacks, jobOffersAddonPacks, sendEmail, exemptFromVAT } = await req.json();

    const finalStatus = status || "ACTIVE";

    const sub = await prisma.subscription.upsert({
      where: { institutionId },
      create: {
        institutionId,
        plan: plan || "MONTHLY",
        status: finalStatus,
        jobsAddonPacks: jobsAddonPacks ?? 0,
        jobOffersAddonPacks: jobOffersAddonPacks ?? 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        price: price ?? null,
        exemptFromVAT: exemptFromVAT ?? false,
        paymentReference: generatePaymentReference(),
      },
      update: {
        ...(status ? { status } : {}),
        ...(plan ? { plan } : {}),
        ...(jobsAddonPacks !== undefined ? { jobsAddonPacks } : {}),
        ...(jobOffersAddonPacks !== undefined ? { jobOffersAddonPacks } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(exemptFromVAT !== undefined ? { exemptFromVAT } : {}),
      },
    });

    // Si on active la subscription, mettre aussi l'institution en ACTIVE
    if (finalStatus === "ACTIVE") {
      await prisma.institution.update({
        where: { id: institutionId },
        data: { status: "ACTIVE" },
      });
    }

    if (sendEmail && finalStatus === "ACTIVE" && endDate) {
      const inst = await prisma.institution.findUnique({
        where: { id: institutionId },
        include: { user: { select: { email: true, name: true } } },
      });
      if (inst) {
        sendSubscriptionActivated(inst.user.email, inst.user.name ?? "Contact", inst.name, plan || "MONTHLY", endDate).catch(() => {});
      }
    }

    return NextResponse.json(sub);
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
    const { id, status, price, startDate, endDate, plan, jobsAddonPacks, jobOffersAddonPacks, sendEmail } = await req.json();

    const sub = await prisma.subscription.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(plan !== undefined ? { plan } : {}),
        ...(jobsAddonPacks !== undefined ? { jobsAddonPacks } : {}),
        ...(jobOffersAddonPacks !== undefined ? { jobOffersAddonPacks } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
      include: { institution: { include: { user: { select: { email: true, name: true } } } } },
    });

    // Si on active la subscription, mettre aussi l'institution en ACTIVE
    if (status === "ACTIVE") {
      await prisma.institution.update({
        where: { id: sub.institutionId },
        data: { status: "ACTIVE" },
      });
    }

    if (sendEmail && status === "ACTIVE" && sub.endDate) {
      sendSubscriptionActivated(
        sub.institution.user.email,
        sub.institution.user.name ?? "Contact",
        sub.institution.name,
        sub.plan,
        sub.endDate.toISOString(),
      ).catch(() => {});
    }

    return NextResponse.json(sub);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
