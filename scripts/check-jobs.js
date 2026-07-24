import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING JOB OFFERS ===\n');

  // Check all jobs
  const allJobs = await prisma.jobOffer.findMany({
    include: {
      institution: {
        include: {
          subscription: true,
          user: { select: { email: true } }
        }
      }
    }
  });

  console.log(`Total jobs in database: ${allJobs.length}`);
  allJobs.forEach(job => {
    console.log(`\n- "${job.title}"`);
    console.log(`  ID: ${job.id}`);
    console.log(`  Type: ${job.contractType}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Institution: ${job.institution.name} (${job.institution.user.email})`);
    console.log(`  Institution Status: ${job.institution.status}`);
    console.log(`  Subscription Status: ${job.institution.subscription?.status || 'NONE'}`);
  });

  // Check institutions
  console.log('\n=== INSTITUTIONS ===\n');
  const institutions = await prisma.institution.findMany({
    include: {
      subscription: true,
      user: { select: { email: true } }
    }
  });

  console.log(`Total institutions: ${institutions.length}`);
  institutions.forEach(inst => {
    console.log(`\n- ${inst.name} (${inst.user.email})`);
    console.log(`  Status: ${inst.status}`);
    console.log(`  Subscription: ${inst.subscription?.status || 'NONE'}`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
