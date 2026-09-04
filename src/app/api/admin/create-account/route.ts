import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const hashedPassword = '$2b$10$f1IxTcXWLKXZ/iptgQF1aunX7IhFXt9RXylYvGe2B1QEvpqbwmcQK';

    const admin = await prisma.user.upsert({
      where: { email: 'edu-connect@outlook.be' },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true,
      },
      create: {
        email: 'edu-connect@outlook.be',
        password: hashedPassword,
        name: 'Admin Educ-Connect',
        role: 'ADMIN',
        emailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
