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

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  // Password validation: minimum 8 chars with complexity
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères minimum)" }, { status: 400 });
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une majuscule" }, { status: 400 });
  }
  if (!/[a-z]/.test(password)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une minuscule" }, { status: 400 });
  }
  if (!/[0-9]/.test(password)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins un chiffre" }, { status: 400 });
  }

  // Name validation
  if (name.length > 100 || name.trim().length === 0) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  if (role === "INSTITUTION") {
    if (!institutionName || institutionName.trim().length === 0) {
      return NextResponse.json({ error: "Le nom de l'institution est requis" }, { status: 400 });
    }
    if (institutionName.length > 255) {
      return NextResponse.json({ error: "Le nom de l'institution est trop long" }, { status: 400 });
    }
    if (!address || address.trim().length === 0) {
      return NextResponse.json({ error: "L'adresse est requise" }, { status: 400 });
    }
    if (address.length > 255) {
      return NextResponse.json({ error: "L'adresse est trop longue" }, { status: 400 });
    }
    if (!commune || commune.trim().length === 0) {
      return NextResponse.json({ error: "La commune est requise" }, { status: 400 });
    }
    if (commune.length > 100) {
      return NextResponse.json({ error: "La commune est trop longue" }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");

  // Use transaction to ensure consistency between user and institution
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, password: hashed, role, emailVerified: false, emailVerificationToken: token },
    });

    if (role === "INSTITUTION") {
      await tx.institution.create({
        data: {
          userId: newUser.id,
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

    return newUser;
  });

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
