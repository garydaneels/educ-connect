import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToStorage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as "cv" | "letter" | null;

    if (!file || !type) {
      return NextResponse.json({ error: "Fichier ou type manquant" }, { status: 400 });
    }

    if (!["cv", "letter"].includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)" }, { status: 400 });
    }

    const ALLOWED_MIME = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "Format non autorisé (PDF ou Word uniquement)" }, { status: 400 });
    }

    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: "Extension non autorisée (PDF ou Word uniquement)" }, { status: 400 });
    }

    const ext = "." + fileExt;
    const timestamp = Date.now();
    const storagePath = `job-applications/${timestamp}_${type}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadToStorage(storagePath, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ path: publicUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
