import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Compte ADMIN
  const adminEmail = "gary@educonnect.be";
  const adminPassword = "Gary2026!";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: await bcrypt.hash(adminPassword, 10), emailVerified: true, emailVerificationToken: null },
    });
    console.log(`🔄 Admin mis à jour : ${adminEmail}`);
  } else {
    await prisma.user.create({
      data: {
        name: "Gary Daneels",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
        emailVerified: true,
      },
    });
    console.log(`✅ Admin créé : ${adminEmail}`);
  }

  // Compte INSTITUTION
  const instEmail = "gapn@hotmail.be";
  const instPassword = "Gapn2026!";
  const existingInst = await prisma.user.findUnique({ where: { email: instEmail } });
  if (existingInst) {
    await prisma.user.update({
      where: { email: instEmail },
      data: { password: await bcrypt.hash(instPassword, 10), emailVerified: true, emailVerificationToken: null },
    });
    console.log(`🔄 Institution mis à jour : ${instEmail}`);
  } else {
    const user = await prisma.user.create({
      data: {
        name: "Gary (test institution)",
        email: instEmail,
        password: await bcrypt.hash(instPassword, 10),
        role: "INSTITUTION",
        emailVerified: true,
      },
    });

    const inst = await prisma.institution.create({
      data: {
        userId: user.id,
        name: "Institution Test Gary",
        address: "Rue de la Loi 1",
        commune: "Bruxelles (Ville)",
        publicTypes: JSON.stringify([]),
        hebergements: JSON.stringify([]),
        organismes: JSON.stringify([]),
        status: "APPROVED",
      },
    });

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

    console.log(`✅ Institution créée : ${instEmail}`);
  }

  console.log("\n📋 COMPTES CRÉÉS :");
  console.log(`👤 Admin       : gary@educonnect.be  /  Gary2026!`);
  console.log(`🏥 Institution : gapn@hotmail.be     /  Gapn2026!`);
}

main().finally(() => prisma.$disconnect());
