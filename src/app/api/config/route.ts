import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_TYPES, HEBERGEMENTS, ORGANISMES, COMMUNES_BRUXELLES, COMMUNES_NAMUR } from "@/lib/constants";

const SECTOR_EMOJI: Record<string, string> = {
  ECOLE_PRIMAIRE: "🏫", ECOLE_SECONDAIRE: "🏫", ECOLE_SPECIALISEE: "🎓",
  HOPITAL: "🏥", HOPITAL_PSY: "🧠", SERVICE_SANTE_MENTALE: "💬",
  MAISON_SOIN_PSY: "🏠", AIDE_JEUNESSE: "👶", PRISON: "🔒",
  IPPJ_FERME: "🔐", IPPJ_OUVERT: "🚪", SERVICE_LOGEMENT_ADAPTE: "🏘️",
  INTERNAT: "🛏️", ECOLE_DEVOIRS: "📚", MAISON_JEUNE: "🏡",
  MAISON_SOIN_REPOS: "🌿", SANS_CHEZ_SOIRISME: "⛺", CENTRE_HEBERGEMENT: "🏘️",
  CRECHE: "🍼", EMA: "🚐", CCMD: "👥", PERISCOLAIRE: "⛹️",
  SRG: "🏠", SRU: "🚨", SRJ: "🧒", AMO: "🤝", MECS: "🏡",
  IME: "♿", MAS: "🌸", CHRS: "🏘️", CPAS_ACTION: "🏛️", CENTRE_JOUR: "☀️",
};

export async function GET() {
  const items = await prisma.configItem.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { label: "asc" }],
  });

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  // Fallback to constants if nothing seeded yet
  if (!grouped.SECTOR?.length) {
    grouped.SECTOR = Object.entries(PUBLIC_TYPES).map(([key, label], i) => ({
      id: key, category: "SECTOR", key, label,
      emoji: SECTOR_EMOJI[key] ?? null, parentKey: null, position: i, createdAt: new Date(),
    }));
  }
  if (!grouped.HEBERGEMENT?.length) {
    grouped.HEBERGEMENT = Object.entries(HEBERGEMENTS).map(([key, label], i) => ({
      id: key, category: "HEBERGEMENT", key, label,
      emoji: null, parentKey: null, position: i, createdAt: new Date(),
    }));
  }
  if (!grouped.ORGANISME?.length) {
    grouped.ORGANISME = Object.entries(ORGANISMES).map(([key, label], i) => ({
      id: key, category: "ORGANISME", key, label,
      emoji: null, parentKey: null, position: i, createdAt: new Date(),
    }));
  }
  if (!grouped.CITY?.length) {
    grouped.CITY = [{ id: "bruxelles", category: "CITY", key: "bruxelles", label: "Bruxelles", emoji: null, parentKey: null, position: 0, createdAt: new Date() }];
  }
  if (!grouped.COMMUNE?.length) {
    grouped.COMMUNE = [
      ...COMMUNES_BRUXELLES.map((label, i) => ({
        id: label, category: "COMMUNE", key: label, label,
        emoji: null, parentKey: "BRUXELLES", position: i, createdAt: new Date(),
      })),
      ...COMMUNES_NAMUR.map((label, i) => ({
        id: `NAMUR_${label}`, category: "COMMUNE", key: `NAMUR_${label}`, label,
        emoji: null, parentKey: "NAMUR", position: i, createdAt: new Date(),
      })),
    ];
  }

  const response = NextResponse.json(grouped);
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return response;
}
