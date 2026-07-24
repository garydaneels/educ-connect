import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendAdminNewRegistration, sendEmailVerification } from "@/lib/email";
import { rateLimit, getIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une heure." }, { status: 429 });
  }

  const { name, email, password, role, institutionName, sector, address, commune } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mot de passe trop court (6 caractères minimum)" }, { status: 400 });
  }

  if (role === "INSTITUTION" && !institutionName) {
    return NextResponse.json({ error: "Le nom de l'institution est requis" }, { status: 400 });
  }

  if (role === "INSTITUTION" && (!address || !commune)) {
    return NextResponse.json({ error: "L'adresse et la commune sont requises" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, emailVerified: false, emailVerificationToken: token },
  });

  if (role === "INSTITUTION") {
    await prisma.institution.create({
      data: {
        userId: user.id,
        name: institutionName,
        address: address || "",
        commune: commune || "",
        publicTypes: JSON.stringify(sector ? [sector] : []),
        hebergements: JSON.stringify([]),
        organismes: JSON.stringify([]),
        status: "APPROVED",
      },
    });
  }

  // Emails en arrière-plan
  const emailName = name || email;
  if (role === "STUDENT" || role === "INSTITUTION" || role === "PROFESSIONAL") {
    sendAdminNewRegistration(role as "STUDENT" | "INSTITUTION" | "PROFESSIONAL", emailName, email, institutionName).catch(() => {});
  }
  sendEmailVerification(email, emailName, token).catch(() => {});

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    message: "Vérifiez votre email pour activer votre compte",
  });
}
