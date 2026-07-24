import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ applied: false });
    }

    const { searchParams } = new URL(req.url);
    const jobOfferId = searchParams.get("jobOfferId");

    if (!jobOfferId) {
      return NextResponse.json(
        { error: "jobOfferId requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.jobApplication.findUnique({
      where: {
        jobOfferId_userId: {
          jobOfferId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ applied: !!existing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
