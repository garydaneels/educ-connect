import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PREF_FIELDS = [
  "emailInstitutionInterest",
  "emailApplicationStatus",
  "emailNewMessage",
  "emailScheduleUpdate",
  "emailNewApplication",
  "emailUnavailability",
] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const prefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: Object.fromEntries(PREF_FIELDS.map(f => [f, true])) as Record<typeof PREF_FIELDS[number], true>,
  });

  return NextResponse.json(prefs ?? {});
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const data: Partial<Record<typeof PREF_FIELDS[number], boolean>> = {};

  for (const field of PREF_FIELDS) {
    if (typeof body[field] === "boolean") data[field] = body[field];
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: Object.fromEntries(PREF_FIELDS.map(f => [f, true])) as Record<typeof PREF_FIELDS[number], true>,
  });

  return NextResponse.json(updated);
}
