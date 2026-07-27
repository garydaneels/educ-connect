import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const belgiumFrancophoneData = {
  "Bruxelles": {
    region: "Bruxelles",
    cities: [
      { name: "Bruxelles", zipCode: "1000" },
    ],
  },
  "Hainaut": {
    region: "Wallonie",
    cities: [
      { name: "Mons", zipCode: "7000" },
      { name: "Charleroi", zipCode: "6000" },
      { name: "Tournai", zipCode: "7500" },
      { name: "Mouscron", zipCode: "7700" },
      { name: "Soignies", zipCode: "7060" },
      { name: "Binche", zipCode: "7130" },
      { name: "Comines", zipCode: "7780" },
      { name: "Frameries", zipCode: "7080" },
      { name: "Saint-Ghislain", zipCode: "7000" },
      { name: "Ath", zipCode: "7800" },
    ],
  },
  "Namur": {
    region: "Wallonie",
    cities: [
      { name: "Namur", zipCode: "5000" },
      { name: "Dinant", zipCode: "5500" },
      { name: "Ciney", zipCode: "5590" },
      { name: "Jambes", zipCode: "5100" },
      { name: "Gembloux", zipCode: "5030" },
      { name: "Fleurus", zipCode: "6220" },
      { name: "Jodoigne", zipCode: "1370" },
      { name: "Charleroi", zipCode: "6000" },
      { name: "Andenne", zipCode: "5300" },
      { name: "Rochefort", zipCode: "5580" },
    ],
  },
  "Liège": {
    region: "Wallonie",
    cities: [
      { name: "Liège", zipCode: "4000" },
      { name: "Verviers", zipCode: "4800" },
      { name: "Seraing", zipCode: "4100" },
      { name: "Herstal", zipCode: "4040" },
      { name: "Huy", zipCode: "4500" },
      { name: "Spa", zipCode: "4900" },
      { name: "Pepinster", zipCode: "4860" },
      { name: "Beaulieu", zipCode: "4050" },
      { name: "Theux", zipCode: "4910" },
      { name: "Jehanster", zipCode: "4900" },
    ],
  },
  "Luxembourg": {
    region: "Wallonie",
    cities: [
      { name: "Arlon", zipCode: "6700" },
      { name: "Bastogne", zipCode: "6600" },
      { name: "Virton", zipCode: "6760" },
      { name: "Martelange", zipCode: "6790" },
      { name: "Habay", zipCode: "6720" },
      { name: "Pinchon", zipCode: "6740" },
      { name: "Ethe", zipCode: "6750" },
      { name: "Ivois", zipCode: "6750" },
      { name: "Messancy", zipCode: "6780" },
      { name: "Déiffage", zipCode: "6700" },
    ],
  },
  "Brabant Wallon": {
    region: "Wallonie",
    cities: [
      { name: "Wavre", zipCode: "1300" },
      { name: "Nivelles", zipCode: "1400" },
      { name: "Ottignies", zipCode: "1340" },
      { name: "Louvain-la-Neuve", zipCode: "1348" },
      { name: "Court-Saint-Étienne", zipCode: "1490" },
      { name: "Perwez", zipCode: "1360" },
      { name: "Rixensart", zipCode: "1330" },
      { name: "Lasne", zipCode: "1380" },
      { name: "Jodoigne", zipCode: "1370" },
      { name: "Rebecq", zipCode: "1430" },
    ],
  },
};

async function main() {
  console.log("🌱 Seeding database with Belgian provinces and cities...");

  // Delete existing data
  await prisma.city.deleteMany({});
  await prisma.province.deleteMany({});

  // Seed provinces and cities
  for (const [provinceName, data] of Object.entries(belgiumFrancophoneData)) {
    const province = await prisma.province.create({
      data: {
        name: provinceName,
        region: data.region,
      },
    });

    console.log(`✅ Created province: ${provinceName} (${data.region})`);

    for (const city of data.cities) {
      await prisma.city.create({
        data: {
          name: city.name,
          zipCode: city.zipCode,
          provinceId: province.id,
        },
      });
    }

    console.log(`   📍 Added ${data.cities.length} cities`);
  }

  console.log("✨ Seed completed!");
  console.log("📊 Stats:");
  const provinceCount = await prisma.province.count();
  const cityCount = await prisma.city.count();
  console.log(`   - Provinces: ${provinceCount}`);
  console.log(`   - Cities/Communes: ${cityCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
