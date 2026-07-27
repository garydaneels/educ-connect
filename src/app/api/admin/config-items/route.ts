import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.configItem.findMany({
      where: {
        category: { in: ["SECTOR", "HEBERGEMENT", "ORGANISME"] },
      },
      orderBy: [{ category: "asc" }, { position: "asc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching config items:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to fetch config items",
    }, { status: 500 });
  }
}
