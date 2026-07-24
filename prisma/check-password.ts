import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const tests = [
    { email: "admin@educonnect.be", password: "admin123" },
    { email: "etudiant@test.be", password: "test123" },
    { email: "lephare@test.be", password: "institution123" },
  ];

  for (const t of tests) {
    const user = await prisma.user.findUnique({ where: { email: t.email }, select: { password: true, emailVerified: true, emailVerificationToken: true } });
    if (!user) { console.log(`❌ ${t.email} → introuvable`); continue; }
    const ok = await bcrypt.compare(t.password, user.password);
    console.log(`${ok ? "✅" : "❌"} ${t.email} → mdp ${ok ? "correct" : "INCORRECT"} | verified=${user.emailVerified} | token=${user.emailVerificationToken ?? "null"}`);
  }
}

main().finally(() => prisma.$disconnect());
