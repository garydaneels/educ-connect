import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: path.join(__dirname, "..", "dev.db") });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const insts = await prisma.institution.findMany({ include: { subscription: true } });
  let count = 0;
  for (const inst of insts) {
    if (!inst.subscription) {
      await prisma.subscription.create({
        data: {
          institutionId: inst.id,
          plan: "ANNUAL",
          status: "ACTIVE",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          price: 0,
        },
      });
      count++;
    }
  }
  console.log(`✅ ${count} abonnements activés`);
}

main().finally(() => prisma.$disconnect());
