import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getInstitutionJob(jobId: string, userId: string) {
  const job = await prisma.jobOffer.findUnique({
    where: { id: jobId },
    include: { institution: { select: { userId: true } } },
  });
  if (!job) return null;
  if (job.institution.userId !== userId) return null;
  return job;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const job = await getInstitutionJob(id, user.id);
  if (!job) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { title, description, schedule, salary, contractType, status } = await req.json();

  const updated = await prisma.jobOffer.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(schedule !== undefined ? { schedule: schedule?.trim() || null } : {}),
      ...(salary !== undefined ? { salary: salary?.trim() || null } : {}),
      ...(contractType !== undefined ? { contractType } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const job = await getInstitutionJob(id, user.id);
  if (!job) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.jobOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
