import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToStorage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { id: string; role: string };
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Rôle incorrect" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as "cv" | "letter" | "convention" | null;

  if (!file || !type) return NextResponse.json({ error: "Fichier ou type manquant" }, { status: 400 });
  if (!["cv", "letter", "convention"].includes(type)) return NextResponse.json({ error: "Type invalide" }, { status: 400 });

  const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)" }, { status: 400 });

  const ALLOWED_MIME = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Format non autorisé (PDF ou Word uniquement)" }, { status: 400 });
  }

  const ext = "." + (file.name.split(".").pop() || "pdf");
  const storagePath = `profiles/${user.id}_${type}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToStorage(storagePath, buffer, file.type || "application/octet-stream");

  await prisma.studentProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...(type === "cv" ? { cvPath: publicUrl } : type === "letter" ? { letterPath: publicUrl } : { conventionPath: publicUrl }),
    },
    update: {
      ...(type === "cv" ? { cvPath: publicUrl } : type === "letter" ? { letterPath: publicUrl } : { conventionPath: publicUrl }),
    },
  });

  return NextResponse.json({ path: publicUrl });
}
