import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

  // Password complexity requirements (consistent with registration and password change)
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court (8 caractères min.)" }, { status: 400 });
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

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
  });

  if (!user) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
