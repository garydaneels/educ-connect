import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeInstitution } from "@/lib/email";
import { generatePaymentReference } from "@/lib/payment";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string } | undefined;
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { name, loginEmail, code, commune, contactEmail } = await req.json();
  if (!name || !loginEmail || !code || !commune) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(loginEmail)) {
    return NextResponse.json({ error: "Email de connexion invalide" }, { status: 400 });
  }

  // Validate password complexity (same as user registration)
  if (code.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères min.)" }, { status: 400 });
  }
  if (!/[A-Z]/.test(code)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une majuscule" }, { status: 400 });
  }
  if (!/[a-z]/.test(code)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une minuscule" }, { status: 400 });
  }
  if (!/[0-9]/.test(code)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins un chiffre" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
  if (existing) return NextResponse.json({ error: "Cet email de connexion est déjà utilisé" }, { status: 400 });

  const hashed = await bcrypt.hash(code, 10);
  const newUser = await prisma.user.create({
    data: { name, email: loginEmail, password: hashed, role: "INSTITUTION" },
  });

  const institution = await prisma.institution.create({
    data: {
      userId: newUser.id,
      name,
      commune,
      address: "",
      email: contactEmail || null,
      publicTypes: "[]",
      hebergements: "[]",
      organismes: "[]",
      status: "APPROVED",
    },
  });

  // Créer une subscription ACTIVE par défaut pour les institutions créées par l'admin
  const now = new Date();
  await prisma.subscription.create({
    data: {
      institutionId: institution.id,
      plan: "ANNUAL",
      status: "ACTIVE",
      startDate: now,
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      paymentReference: generatePaymentReference(),
      jobsAddonPacks: 5,
      jobOffersAddonPacks: 3,
      exemptFromVAT: true,
    },
  });

  if (contactEmail) {
    sendWelcomeInstitution(contactEmail, name, name).catch(() => {});
  }

  return NextResponse.json(institution, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const institutions = await prisma.institution.findMany({
    include: {
      subscription: true,
      slots: true,
      applications: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    institutions.map(inst => {
      const apps = inst.applications;
      const publicTypes = (() => { try { return JSON.parse(inst.publicTypes); } catch { return []; } })();

      const fields = [
        { key: "Description",             ok: !!inst.description },
        { key: "Mission",                  ok: !!inst.mission },
        { key: "Description du stage",     ok: !!inst.stageDescription },
        { key: "Superviseur",              ok: !!inst.supervisorName },
        { key: "Téléphone",               ok: !!inst.phone },
        { key: "Email institution",        ok: !!inst.email },
        { key: "Adresse",                  ok: !!inst.address },
        { key: "Commune",                  ok: !!inst.commune },
        { key: "Types de public",          ok: publicTypes.length > 0 },
        { key: "Places de stage",          ok: inst.slots.length > 0 },
      ];
      const filledCount = fields.filter(f => f.ok).length;

      return {
        id: inst.id,
        name: inst.name,
        commune: inst.commune,
        address: inst.address,
        phone: inst.phone,
        email: inst.email,
        website: inst.website,
        createdAt: inst.createdAt,
        boosted: inst.boosted,
        boostEndDate: inst.boostEndDate,
        subscription: inst.subscription
          ? { id: inst.subscription.id, status: inst.subscription.status, plan: inst.subscription.plan, jobsAddonPacks: inst.subscription.jobsAddonPacks, jobOffersAddonPacks: inst.subscription.jobOffersAddonPacks, endDate: inst.subscription.endDate }
          : null,
        completeness: {
          score: filledCount,
          total: fields.length,
          percent: Math.round((filledCount / fields.length) * 100),
          missing: fields.filter(f => !f.ok).map(f => f.key),
        },
        stats: {
          total:     apps.length,
          pending:   apps.filter(a => a.status === "PENDING").length,
          accepted:  apps.filter(a => a.status === "ACCEPTED").length,
          completed: apps.filter(a => a.status === "COMPLETED").length,
          rejected:  apps.filter(a => a.status === "REJECTED").length,
          slots:     inst.slots.length,
        },
      };
    })
  );
}
