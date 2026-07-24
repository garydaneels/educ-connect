import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('📡 Connection string:', process.env.DATABASE_URL?.slice(0, 50) + '...');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();

  try {
    // Trouver l'institution test
    const instResult = await client.query(`
      SELECT id, name FROM "Institution"
      WHERE name LIKE $1 OR name LIKE $2
      LIMIT 1
    `, ['%Test%', '%test%']);

    if (instResult.rows.length === 0) {
      console.log('❌ Aucune institution test trouvée');
      process.exit(1);
    }

    const instId = instResult.rows[0].id;
    const instName = instResult.rows[0].name;

    console.log(`✓ Institution trouvée: ${instName}`);

    // Mettre à jour l'abonnement
    const updateResult = await client.query(`
      UPDATE "Subscription"
      SET status = 'ACTIVE'
      WHERE "institutionId" = $1 AND status != 'ACTIVE'
      RETURNING *
    `, [instId]);

    if (updateResult.rows.length > 0) {
      console.log(`✓ Abonnement mis à jour au statut ACTIVE`);
      console.log(`  - ID: ${updateResult.rows[0].id}`);
      console.log(`  - Statut: ${updateResult.rows[0].status}`);
      console.log(`  - Jobs packs: ${updateResult.rows[0].jobsAddonPacks}`);
      console.log(`  - Employment packs: ${updateResult.rows[0].jobOffersAddonPacks}`);
    } else {
      console.log('⚠️  L\'abonnement est déjà ACTIVE');
    }

    // Mettre à jour le statut de l'institution
    const instUpdateResult = await client.query(`
      UPDATE "Institution"
      SET status = 'ACTIVE'
      WHERE id = $1 AND status != 'ACTIVE'
      RETURNING name, status
    `, [instId]);

    if (instUpdateResult.rows.length > 0) {
      console.log(`\n✓ Institution mise à jour au statut ACTIVE`);
      console.log(`  - Nom: ${instUpdateResult.rows[0].name}`);
      console.log(`  - Statut: ${instUpdateResult.rows[0].status}`);
    } else {
      console.log(`\n📋 Institution status: déjà ACTIVE`);
    }

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
