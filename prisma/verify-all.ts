import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    data: { emailVerified: true, emailVerificationToken: null },
  });
  console.log(`✅ ${result.count} compte(s) marqué(s) comme vérifié(s).`);
}

main().finally(() => prisma.$disconnect());
