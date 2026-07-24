import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";

async function getApp(id: string, userId: string, role: string) {
  const app = await prisma.application.findUnique({
    where: { id },
    include: { institution: { select: { userId: true } } },
  });
  if (!app) return null;
  if (role === "STUDENT" && app.studentId !== userId) return null;
  if (role === "INSTITUTION" && app.institution.userId !== userId) return null;
  return app;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const app = await getApp(id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)" }, { status: 400 });

  const ALLOWED_MIME = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Format non autorisé (PDF, Word, JPEG ou PNG)" }, { status: 400 });
  }

  // Validate file extension to prevent double extension attacks
  const ALLOWED_EXT = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  const fileExt = ("." + (file.name.split(".").pop() || "")).toLowerCase();
  if (!ALLOWED_EXT.includes(fileExt)) {
    return NextResponse.json({ error: "Extension non autorisée" }, { status: 400 });
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `stages/${id}/documents/${Date.now()}_${sanitizedName}`;
  const publicUrl = await uploadToStorage(
    storagePath,
    Buffer.from(await file.arrayBuffer()),
    file.type || "application/octet-stream"
  );

  const doc = await prisma.stageDocument.create({
    data: {
      applicationId: id,
      name: file.name,
      path: publicUrl,
      uploadedById: user.id,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const user = session.user as { id: string; role: string };

  const app = await getApp(id, user.id, user.role);
  if (!app) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { docId } = await req.json();
  const doc = await prisma.stageDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.applicationId !== id) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await deleteFromStorage(doc.path);
  await prisma.stageDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
