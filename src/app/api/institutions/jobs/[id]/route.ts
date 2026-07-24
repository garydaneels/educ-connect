import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const data = await req.json();

  const job = await prisma.jobOffer.findUnique({
    where: { id },
    include: { institution: { select: { userId: true } } },
  });
  if (!job || job.institution.userId !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      ...(data.title       !== undefined ? { title: data.title.trim() }             : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.schedule    !== undefined ? { schedule: data.schedule || null }       : {}),
      ...(data.salary      !== undefined ? { salary: data.salary || null }           : {}),
      ...(data.status      !== undefined ? { status: data.status }                   : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  const job = await prisma.jobOffer.findUnique({
    where: { id },
    include: { institution: { select: { userId: true } } },
  });
  if (!job || job.institution.userId !== user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  await prisma.jobOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
