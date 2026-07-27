import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const belgiumFrancophoneData: Record<string, { region: string; cities: Array<{ name: string; zipCode?: string }> }> = {
  "Bruxelles": {
    region: "Bruxelles",
    cities: [{ name: "Bruxelles", zipCode: "1000" }],
  },
  "Hainaut": {
    region: "Wallonie",
    cities: [
      { name: "Mons", zipCode: "7000" },
      { name: "Charleroi", zipCode: "6000" },
      { name: "Tournai", zipCode: "7500" },
      { name: "Mouscron", zipCode: "7700" },
      { name: "Soignies", zipCode: "7060" },
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
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log("🌱 Seeding Belgian provinces and cities...");

    let createdProvinces = 0;
    let createdCities = 0;

    for (const [provinceName, data] of Object.entries(belgiumFrancophoneData)) {
      const province = await prisma.province.upsert({
        where: { name: provinceName },
        update: {},
        create: {
          name: provinceName,
          region: data.region,
        },
      });

      console.log(`✅ Province: ${provinceName}`);
      createdProvinces++;

      for (const city of data.cities) {
        await prisma.city.upsert({
          where: { id: `${province.id}-${city.name}` },
          update: {},
          create: {
            name: city.name,
            zipCode: city.zipCode,
            provinceId: province.id,
          },
        });
        createdCities++;
      }
    }

    const stats = {
      provinces: await prisma.province.count(),
      cities: await prisma.city.count(),
    };

    return NextResponse.json({
      success: true,
      message: `✨ Seeding complete!`,
      stats,
    });
  } catch (error) {
    console.error("❌ Seed error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
