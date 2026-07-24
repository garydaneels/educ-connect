import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const user = await prisma.user.findUnique({
    where: { email: "institution@test.com" },
    include: {
      institution: {
        include: { subscription: true },
      },
    },
  });

  console.log("User:", user?.email);
  console.log("Institution:", user?.institution?.name);
  console.log("Subscription Status:", user?.institution?.subscription?.status);
  console.log("Jobs Addon Packs:", user?.institution?.subscription?.jobsAddonPacks);
  console.log("Job Offers Addon Packs:", user?.institution?.subscription?.jobOffersAddonPacks);

  const jobOffers = await prisma.jobOffer.findMany({
    where: { institutionId: user?.institution?.id },
  });

  console.log("\nJob Offers found:", jobOffers.length);
  jobOffers.forEach((job) => {
    console.log(`- ${job.title} (${job.contractType}): status=${job.status}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

check().catch(console.error);
