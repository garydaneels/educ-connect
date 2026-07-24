import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

type SeedEntry = {
  category: string; key: string; label: string;
  emoji: string | null; parentKey: string | null; position: number;
};

export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const entries: SeedEntry[] = [
    // Secteurs
    ...Object.entries(PUBLIC_TYPES).map(([key, label], i) => ({
      category: "SECTOR", key, label, emoji: SECTOR_EMOJI[key] ?? null, parentKey: null, position: i,
    })),
    // Types de public
    ...Object.entries(HEBERGEMENTS).map(([key, label], i) => ({
      category: "HEBERGEMENT", key, label, emoji: null, parentKey: null, position: i,
    })),
    // Organismes
    ...Object.entries(ORGANISMES).map(([key, label], i) => ({
      category: "ORGANISME", key, label, emoji: null, parentKey: null, position: i,
    })),
    // Villes
    { category: "CITY", key: "BRUXELLES",  label: "Ville de Bruxelles",  emoji: "🏙️", parentKey: null, position: 0 },
    { category: "CITY", key: "NIVELLES",   label: "Nivelles",            emoji: "🏘️", parentKey: null, position: 1 },
    { category: "CITY", key: "WATERLOO",   label: "Waterloo",            emoji: "🏘️", parentKey: null, position: 2 },
    { category: "CITY", key: "NAMUR",      label: "Province de Namur",   emoji: "🏛️", parentKey: null, position: 3 },
    { category: "CITY", key: "CHARLEROI",  label: "Charleroi",           emoji: "🏭", parentKey: null, position: 4 },
    { category: "CITY", key: "LIEGE",      label: "Liège",               emoji: "🏯", parentKey: null, position: 5 },
    { category: "CITY", key: "MONS",       label: "Mons",                emoji: "🏰", parentKey: null, position: 6 },
    { category: "CITY", key: "TOURNAI",    label: "Tournai",             emoji: "⛪", parentKey: null, position: 7 },
    { category: "CITY", key: "MOSANE",     label: "Mosane",              emoji: "🏘️", parentKey: null, position: 8 },
    { category: "CITY", key: "ROUX",       label: "Roux",                emoji: "🏘️", parentKey: null, position: 9 },
    // Communes Bruxelles
    ...COMMUNES_BRUXELLES.map((label, i) => ({
      category: "COMMUNE", key: label, label, emoji: null, parentKey: "BRUXELLES", position: i,
    })),
    // Communes Namur
    ...COMMUNES_NAMUR.map((label, i) => ({
      category: "COMMUNE", key: `NAMUR_${label}`, label, emoji: null, parentKey: "NAMUR", position: i,
    })),
  ];

  let count = 0;
  try {
    for (const entry of entries) {
      await prisma.configItem.upsert({
        where: { category_key: { category: entry.category, key: entry.key } },
        create: entry,
        update: { label: entry.label, emoji: entry.emoji, position: entry.position },
      });
      count++;
    }
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'initialisation" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count });
}
