import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (user.role !== "INSTITUTION") return NextResponse.json({ error: "Réservé aux institutions" }, { status: 403 });

  const institution = await prisma.institution.findUnique({ where: { userId: user.id } });
  if (!institution) return NextResponse.json({ error: "Institution introuvable" }, { status: 404 });

  const applications = await prisma.application.findMany({
    where: { institutionId: institution.id },
    include: {
      student: { select: { name: true, email: true } },
      slot: { select: { startDate: true, endDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Étudiant", "Email", "Statut", "Début stage", "Fin stage", "Date candidature", "Statut stage", "Message"];
  const statusLabels: Record<string, string> = {
    PENDING: "En attente", ACCEPTED: "Acceptée", REJECTED: "Refusée", COMPLETED: "Stage trouvé",
  };
  const stageLabels: Record<string, string> = {
    ONGOING: "En cours", COMPLETED: "Terminé", NOT_VALIDATED: "Non validé", STOPPED: "Arrêté",
  };

  const fmt = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("fr-BE") : "";

  const rows = applications.map(a => [
    escapeCsv(a.student.name),
    escapeCsv(a.student.email),
    escapeCsv(statusLabels[a.status] ?? a.status),
    escapeCsv(fmt(a.slot?.startDate)),
    escapeCsv(fmt(a.slot?.endDate)),
    escapeCsv(fmt(a.createdAt)),
    escapeCsv(a.stageStatus ? (stageLabels[a.stageStatus] ?? a.stageStatus) : ""),
    escapeCsv(a.message),
  ]);

  const csv = [headers.map(escapeCsv).join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const bom = "﻿"; // UTF-8 BOM for Excel

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidatures-${institution.name.replace(/[^a-z0-9]/gi, "_")}.csv"`,
    },
  });
}
