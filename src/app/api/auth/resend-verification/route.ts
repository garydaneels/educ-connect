import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailVerification } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  // Toujours répondre OK pour ne pas révéler si l'email existe
  if (!user || user.emailVerified) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: token } });
  sendEmailVerification(email, user.name || email, token).catch(() => {});

  return NextResponse.json({ ok: true });
}
