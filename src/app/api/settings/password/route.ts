import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // Password complexity requirements (consistent with registration)
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Nouveau mot de passe trop court (8 caractères min.)" }, { status: 400 });
  }
  if (!/[A-Z]/.test(newPassword)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une majuscule" }, { status: 400 });
  }
  if (!/[a-z]/.test(newPassword)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins une minuscule" }, { status: 400 });
  }
  if (!/[0-9]/.test(newPassword)) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins un chiffre" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
