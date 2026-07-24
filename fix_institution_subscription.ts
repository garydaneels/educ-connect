import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fix() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "institution@test.com" },
      include: { institution: true },
    });

    if (!user) {
      console.log("❌ institution@test.com non trouvé");
      return;
    }

    if (!user.institution) {
      console.log("❌ Pas d'institution associée");
      return;
    }

    const now = new Date();
    const existing = await prisma.subscription.findUnique({
      where: { institutionId: user.institution.id },
    });

    if (existing) {
      console.log("Mise à jour subscription existante...");
      const updated = await prisma.subscription.update({
        where: { institutionId: user.institution.id },
        data: {
          status: "ACTIVE",
          plan: "ANNUAL",
          jobsAddonPacks: 5,
          jobOffersAddonPacks: 3,
          startDate: now,
          endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          exemptFromVAT: true,
        },
      });
      console.log("✅ Subscription mise à jour:", updated);
    } else {
      console.log("Création nouvelle subscription...");
      const created = await prisma.subscription.create({
        data: {
          institutionId: user.institution.id,
          plan: "ANNUAL",
          status: "ACTIVE",
          jobsAddonPacks: 5,
          jobOffersAddonPacks: 3,
          startDate: now,
          endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
          paymentReference: "EDUC-TEST-" + Math.random().toString(36).substring(7).toUpperCase(),
          exemptFromVAT: true,
        },
      });
      console.log("✅ Subscription créée:", created);
    }
  } catch (e) {
    console.error("❌ Erreur:", e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

fix();
