import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "NOT SET";
  const masked = dbUrl.replace(/:(.*?)@/, ":***@");

  return NextResponse.json({
    database_url: masked,
    environment: process.env.NODE_ENV,
    nextauth_url: process.env.NEXTAUTH_URL
  });
}
