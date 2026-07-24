import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeStudent, sendWelcomeInstitution } from "@/lib/email";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));

  const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });
  if (!user) return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationToken: null },
  });

  // Envoyer l'email de bienvenue après vérification
  const emailName = user.name || user.email;
  if (user.role === "STUDENT") {
    sendWelcomeStudent(user.email, emailName).catch(() => {});
  } else if (user.role === "INSTITUTION") {
    const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
    sendWelcomeInstitution(user.email, emailName, institution?.name ?? "").catch(() => {});
  }

  return NextResponse.redirect(new URL("/verify-email?success=1", req.url));
}
