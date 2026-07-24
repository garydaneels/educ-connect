import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "INSTITUTION") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { title, description, schedule, salary, contractType } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  // Validate input lengths
  if (title.trim().length > 500) {
    return NextResponse.json({ error: "Titre trop long (max 500 caractères)" }, { status: 400 });
  }
  if (description && description.trim().length > 5000) {
    return NextResponse.json({ error: "Description trop longue (max 5000 caractères)" }, { status: 400 });
  }
  if (schedule && schedule.trim().length > 500) {
    return NextResponse.json({ error: "Horaires trop longs (max 500 caractères)" }, { status: 400 });
  }
  if (salary && salary.trim().length > 200) {
    return NextResponse.json({ error: "Salaire trop long (max 200 caractères)" }, { status: 400 });
  }

  // Validate contractType
  const validContractTypes = ["ETUDIANT", "CDI", "CDD", "STAGE"];
  if (contractType && !validContractTypes.includes(contractType)) {
    return NextResponse.json({ error: "Type de contrat invalide" }, { status: 400 });
  }

  const institution = await prisma.institution.findUnique({ where: { userId: user.id }, include: { subscription: true } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });
  const sub = institution.subscription;
  if (!sub || sub.status !== "ACTIVE") {
    return NextResponse.json({ error: "Abonnement actif requis" }, { status: 403 });
  }

  // Vérifier les packs disponibles selon le type de contrat
  if (contractType === "ETUDIANT" && sub.jobsAddonPacks <= 0) {
    return NextResponse.json({ error: "Supplément Jobs étudiants requis" }, { status: 403 });
  }
  if (contractType !== "ETUDIANT" && sub.jobOffersAddonPacks <= 0) {
    return NextResponse.json({ error: "Supplément Offres d'emploi requis" }, { status: 403 });
  }

  const job = await prisma.jobOffer.create({
    data: {
      institutionId: institution.id,
      title: title.trim(),
      description: description?.trim() || null,
      schedule: schedule?.trim() || null,
      salary: salary?.trim() || null,
      contractType: contractType || "ETUDIANT",
      status: "ACTIVE",
    },
  });
  return NextResponse.json(job);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const commune      = searchParams.get("commune") || "";
  const sector       = searchParams.get("sector") || "";
  const contractType = searchParams.get("contractType") || "";
  const take         = parseInt(searchParams.get("take") || "0");
  const skip         = parseInt(searchParams.get("skip") || "0");

  const contractFilter =
    contractType === "CDI_CDD"
      ? { contractType: { in: ["CDI", "CDD"] } }
      : contractType
      ? { contractType }
      : {};

  const where = {
    status: "ACTIVE",
    ...contractFilter,
    institution: {
      status: { in: ["ACTIVE", "APPROVED"] },
      subscription: { status: "ACTIVE" },
      ...(commune ? { commune } : {}),
      ...(sector  ? { publicTypes: { contains: sector } } : {}),
    },
  };


  const queryOptions = {
    where,
    include: {
      institution: {
        select: { id: true, name: true, commune: true, publicTypes: true, lat: true, lng: true },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(take ? { take, skip } : {}),
  };

  if (take) {
    const [jobs, total] = await prisma.$transaction([
      prisma.jobOffer.findMany(queryOptions as Parameters<typeof prisma.jobOffer.findMany>[0]),
      prisma.jobOffer.count({ where }),
    ]);
    return NextResponse.json({ jobs, total });
  }

  const jobs = await prisma.jobOffer.findMany(queryOptions as Parameters<typeof prisma.jobOffer.findMany>[0]);
  return NextResponse.json(jobs);
}
