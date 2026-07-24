import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN" ? session : null;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const items = await prisma.configItem.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ position: "asc" }, { label: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { category, key, label, emoji, parentKey } = await req.json();
  if (!category || !key || !label)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

  const count = await prisma.configItem.count({ where: { category } });
  const cleanKey = key.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

  try {
    const item = await prisma.configItem.create({
      data: { category, key: cleanKey, label, emoji: emoji || null, parentKey: parentKey || null, position: count },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Cette clé existe déjà dans cette catégorie" }, { status: 409 });
  }
}
