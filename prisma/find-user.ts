import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.table(users);
}

main().finally(() => prisma.$disconnect());
