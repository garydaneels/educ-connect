import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";

  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const where = { userId: user.id, ...(unreadOnly ? { read: false } : {}) };

  if (page > 0) {
    const [notifs, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    return NextResponse.json({ notifications: notifs, total, hasMore: (page - 1) * limit + notifs.length < total });
  }

  const notifs = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifs);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (id) {
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  }

  return NextResponse.json({ ok: true });
}
