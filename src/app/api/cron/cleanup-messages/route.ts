import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const deleted = await prisma.message.deleteMany({
    where: {
      application: {
        status: { in: ["REJECTED", "COMPLETED"] },
        updatedAt: { lt: oneMonthAgo },
      },
    },
  });

  return NextResponse.json({
    deletedMessages: deleted.count,
    checkedAt: new Date().toISOString(),
  });
}
