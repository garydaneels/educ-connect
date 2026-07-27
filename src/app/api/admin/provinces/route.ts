import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const provinces = await prisma.province.findMany({
      include: {
        cities: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ provinces });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to fetch provinces",
    }, { status: 500 });
  }
}
