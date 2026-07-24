import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: true }); // visiteur anonyme : on ne compte pas
  const user = session.user as { id: string };

  const { id } = await params;
  const cookieKey = `iv_${id}`;

  // Si le cookie existe, cette institution a déjà été comptée aujourd'hui pour cet utilisateur
  const cookieHeader = _req.headers.get("cookie") || "";
  if (cookieHeader.split(";").some(c => c.trim().startsWith(cookieKey + "="))) {
    return NextResponse.json({ ok: true });
  }

  // L'institution ne compte pas ses propres vues
  const institution = await prisma.institution.findUnique({ where: { id }, select: { userId: true } });
  if (!institution || institution.userId === user.id) return NextResponse.json({ ok: true });

  await prisma.institution.update({
    where: { id },
    data: { views: { increment: 1 } },
  });

  // Cookie qui expire à minuit (heure locale serveur)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const maxAge = Math.floor((midnight.getTime() - now.getTime()) / 1000);

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `${cookieKey}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
  return res;
}
