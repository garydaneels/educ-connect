import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function generatePaymentReference(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "EDUC-";
  for (let i = 0; i < 5; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin
  const adminExists = await prisma.user.findUnique({ where: { email: "admin@educonnect.be" } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: "Administrateur",
        email: "admin@educonnect.be",
        password: await bcrypt.hash("admin123", 10),
        role: "ADMIN",
      },
    });
    console.log("✅ Admin créé : admin@educonnect.be / admin123");
  }

  // Étudiant de test
  const studentExists = await prisma.user.findUnique({ where: { email: "etudiant@test.be" } });
  if (!studentExists) {
    await prisma.user.create({
      data: {
        name: "Marie Dupont",
        email: "etudiant@test.be",
        password: await bcrypt.hash("test123", 10),
        role: "STUDENT",
      },
    });
    console.log("✅ Étudiant test : etudiant@test.be / test123");
  }

  // Professionnel de test
  const profExists = await prisma.user.findUnique({ where: { email: "professionnel@test.be" } });
  if (!profExists) {
    const user = await prisma.user.create({
      data: {
        name: "Jean Dupont",
        email: "professionnel@test.be",
        password: await bcrypt.hash("test123", 10),
        role: "PROFESSIONAL",
      },
    });
    // Créer un profil professionnel
    await prisma.professionalProfile.create({
      data: {
        userId: user.id,
        presentation: "Éducateur spécialisé avec 8 ans d'expérience dans l'accompagnement des personnes en situation de handicap.",
        experiences: JSON.stringify([
          {
            id: "exp1",
            title: "Éducateur spécialisé",
            company: "Centre d'Accueil du Phare",
            startDate: "2018-01",
            endDate: "2024-12",
            ongoing: false,
            description: "Accompagnement de personnes adultes avec trouble du spectre autistique en milieu résidentiel.",
          },
          {
            id: "exp2",
            title: "Stagiaire éducateur",
            company: "ASBL Horizon",
            startDate: "2017-09",
            endDate: "2018-06",
            ongoing: false,
            description: "Stage en centre d'accueil de jour pour personnes avec déficience intellectuelle.",
          },
        ]),
        qualifications: JSON.stringify([
          {
            id: "qual1",
            title: "Bachelier en Éducation Spécialisée",
            issuer: "Haute École de Bruxelles",
            year: "2017",
            description: "Formation complète en accompagnement des personnes en situation de handicap.",
          },
          {
            id: "qual2",
            title: "Certification en Gestion de Crise",
            issuer: "Institut Belge de Formation",
            year: "2020",
            description: "Techniques de désescalade et gestion des situations difficiles.",
          },
        ]),
        sectorPreference: "social",
        contractType: "CDI",
      },
    });
    console.log("✅ Professionnel test : professionnel@test.be / test123");
  }

  // Institution principale de test (pour développement)
  const testInst = await prisma.user.findUnique({ where: { email: "institution@test.com" } });
  if (!testInst) {
    const user = await prisma.user.create({
      data: {
        name: "Test Institution",
        email: "institution@test.com",
        password: await bcrypt.hash("password123", 10),
        role: "INSTITUTION",
      },
    });

    const inst = await prisma.institution.create({
      data: {
        userId: user.id,
        name: "Test Institution",
        description: "Institution de test pour développement",
        address: "Rue de Test 1",
        commune: "Bruxelles (Ville)",
        phone: "02 000 00 00",
        email: "test@test.com",
        website: "",
        publicTypes: JSON.stringify(["AIDE_JEUNESSE"]),
        hebergements: JSON.stringify(["AMBULATOIRE"]),
        organismes: JSON.stringify(["COCOF"]),
        status: "APPROVED",
      },
    });

    // Abonnement actif avec packs pour jobs
    await prisma.subscription.create({
      data: {
        institutionId: inst.id,
        plan: "ANNUAL",
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-12-31"),
        price: 0,
        paymentReference: generatePaymentReference(),
        jobsAddonPacks: 5,
        jobOffersAddonPacks: 3,
      },
    });

    console.log("✅ Institution test créée : institution@test.com / password123");
  } else {
    console.log("⏭  Institution test déjà existante");
  }

  // Institutions de test
  const institutions = [
    {
      email: "lephare@test.be",
      userName: "Le Phare ASBL",
      institution: {
        name: "Centre Le Phare",
        description: "Le Centre Le Phare accompagne des adultes avec un trouble du spectre autistique (TSA) en milieu résidentiel. Notre équipe pluridisciplinaire propose un accompagnement individualisé dans un cadre bienveillant.",
        address: "Rue du Trône 45",
        commune: "Ixelles",
        phone: "02 512 34 56",
        email: "contact@lephare.be",
        website: "www.lephare.be",
        publicTypes: JSON.stringify(["AUTISME_TSA"]),
        hebergements: JSON.stringify(["RESIDENTIEL", "SEMI_RESIDENTIEL"]),
        organismes: JSON.stringify(["COCOF"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31"), totalPlaces: 2, description: "Stage de 5 mois, accompagnement adultes TSA" },
        { startDate: new Date("2027-02-01"), endDate: new Date("2027-06-30"), totalPlaces: 1, description: "Stage de fin d'année" },
      ],
    },
    {
      email: "horizonasbl@test.be",
      userName: "Horizon ASBL",
      institution: {
        name: "ASBL Horizon",
        description: "Horizon est un centre d'accueil de jour pour personnes avec déficience intellectuelle légère à modérée. Nous mettons l'accent sur l'autonomie, les activités créatives et la vie sociale.",
        address: "Avenue Louise 112",
        commune: "Ixelles",
        phone: "02 648 22 11",
        email: "info@horizon-asbl.be",
        website: "",
        publicTypes: JSON.stringify(["HANDICAP_MENTAL"]),
        hebergements: JSON.stringify(["ACCUEIL_DE_JOUR"]),
        organismes: JSON.stringify(["AVIQ"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-15"), endDate: new Date("2026-12-15"), totalPlaces: 1, description: "Stage automne-hiver, accueil de jour DI" },
      ],
    },
    {
      email: "arcenciel@test.be",
      userName: "Arc-en-Ciel",
      institution: {
        name: "Institut Arc-en-Ciel",
        description: "L'Institut Arc-en-Ciel accueille des enfants et adolescents en situation de handicap moteur. Nous proposons une prise en charge globale alliant rééducation, scolarité adaptée et activités de loisirs.",
        address: "Rue Américaine 87",
        commune: "Saint-Gilles",
        phone: "02 537 89 00",
        email: "contact@arcenciel.be",
        website: "www.arcenciel.be",
        publicTypes: JSON.stringify(["HANDICAP_MOTEUR"]),
        hebergements: JSON.stringify(["RESIDENTIEL", "AMBULATOIRE"]),
        organismes: JSON.stringify(["ONE", "COCOF"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-10-01"), endDate: new Date("2027-02-28"), totalPlaces: 3, description: "Stage pluridisciplinaire, enfants et ados" },
      ],
    },
    {
      email: "leventsurterre@test.be",
      userName: "Le Vent sur Terre",
      institution: {
        name: "Le Vent sur Terre",
        description: "Service d'aide à la jeunesse travaillant en milieu ouvert avec des familles en difficulté et des jeunes en situation de crise. Approche systémique et travail de réseau.",
        address: "Rue de Laeken 55",
        commune: "Bruxelles (Ville)",
        phone: "02 219 45 78",
        email: "contact@leventsurlerre.be",
        website: "",
        publicTypes: JSON.stringify(["AIDE_JEUNESSE"]),
        hebergements: JSON.stringify(["AMBULATOIRE"]),
        organismes: JSON.stringify(["ONE", "CPAS"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31"), totalPlaces: 2, description: "Stage en milieu ouvert, accompagnement familial" },
        { startDate: new Date("2027-02-01"), endDate: new Date("2027-06-30"), totalPlaces: 2, description: "Stage printemps" },
      ],
    },
    {
      email: "clinicvert@test.be",
      userName: "Clinique du Vert Chasseur",
      institution: {
        name: "Clinique du Vert Chasseur",
        description: "Hôpital psychiatrique proposant des unités de soins aigus et chroniques. Stage en unité fermée ou ouverte selon le profil. Supervision clinique hebdomadaire garantie.",
        address: "Avenue du Vert Chasseur 21",
        commune: "Uccle",
        phone: "02 374 11 00",
        email: "stages@vertchasseur.be",
        website: "www.vertchasseur.be",
        publicTypes: JSON.stringify(["PSYCHIATRIE"]),
        hebergements: JSON.stringify(["RESIDENTIEL", "SEMI_RESIDENTIEL"]),
        organismes: JSON.stringify(["SECTEUR_PRIVE"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-01"), endDate: new Date("2026-12-31"), totalPlaces: 2, description: "Unité adultes, psychiatrie générale" },
        { startDate: new Date("2027-01-05"), endDate: new Date("2027-06-30"), totalPlaces: 1, description: "Unité géronto-psychiatrie" },
      ],
    },
    {
      email: "mrslesaules@test.be",
      userName: "MRS Les Saules",
      institution: {
        name: "Maison de Repos Les Saules",
        description: "Maison de repos et de soins accueillant des personnes âgées dépendantes. Approche centrée sur la personne, activités d'animation, soins palliatifs. Un environnement chaleureux et familial.",
        address: "Avenue des Saules 14",
        commune: "Anderlecht",
        phone: "02 521 66 44",
        email: "direction@lessaules.be",
        website: "",
        publicTypes: JSON.stringify(["SENIOR_MRS"]),
        hebergements: JSON.stringify(["RESIDENTIEL"]),
        organismes: JSON.stringify(["SECTEUR_PRIVE", "CPAS"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-01"), endDate: new Date("2027-06-30"), totalPlaces: 3, description: "Stage longue durée, soins et animation" },
      ],
    },
    {
      email: "lumiereschaerbeek@test.be",
      userName: "Lumières Schaerbeek",
      institution: {
        name: "Lumières de Schaerbeek",
        description: "Service ambulatoire spécialisé dans l'accompagnement de personnes avec handicap sensoriel (visuel et auditif). Travail en individuel et en groupe, guidance parentale.",
        address: "Chaussée de Haecht 190",
        commune: "Schaerbeek",
        phone: "02 245 78 12",
        email: "lumieres.schaerbeek@gmail.com",
        website: "",
        publicTypes: JSON.stringify(["HANDICAP_SENSORIEL_VISUEL", "HANDICAP_SENSORIEL_AUDITIF"]),
        hebergements: JSON.stringify(["AMBULATOIRE"]),
        organismes: JSON.stringify(["AVIQ", "COCOF"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-10-01"), endDate: new Date("2027-03-31"), totalPlaces: 1, description: "Stage ambulatoire, handicap sensoriel" },
      ],
    },
    {
      email: "lescedres@test.be",
      userName: "Les Cèdres Molenbeek",
      institution: {
        name: "ASBL Les Cèdres",
        description: "Centre d'aide à la jeunesse situé à Molenbeek, travaillant avec des mineurs en difficulté familiale et sociale. Hébergement d'urgence, accompagnement éducatif individualisé.",
        address: "Rue du Comte de Flandre 28",
        commune: "Molenbeek-Saint-Jean",
        phone: "02 411 93 55",
        email: "contact@lescedres.be",
        website: "",
        publicTypes: JSON.stringify(["AIDE_JEUNESSE"]),
        hebergements: JSON.stringify(["RESIDENTIEL", "SEMI_RESIDENTIEL"]),
        organismes: JSON.stringify(["ONE"]),
        status: "APPROVED",
      },
      slots: [
        { startDate: new Date("2026-09-01"), endDate: new Date("2027-01-31"), totalPlaces: 2, description: "Hébergement urgence et suivi éducatif" },
      ],
    },
  ];

  for (const data of institutions) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) { console.log(`⏭  ${data.institution.name} déjà existant`); continue; }

    const user = await prisma.user.create({
      data: {
        name: data.userName,
        email: data.email,
        password: await bcrypt.hash("institution123", 10),
        role: "INSTITUTION",
      },
    });

    const inst = await prisma.institution.create({
      data: { userId: user.id, ...data.institution },
    });

    for (const slot of data.slots) {
      await prisma.internshipSlot.create({
        data: { institutionId: inst.id, ...slot, availablePlaces: slot.totalPlaces },
      });
    }

    // Abonnement actif pour les données de test
    await prisma.subscription.create({
      data: {
        institutionId: inst.id,
        plan: "ANNUAL",
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        price: 0,
        paymentReference: generatePaymentReference(),
        jobsAddonPacks: 3,
        jobOffersAddonPacks: 2,
      },
    });

    console.log(`✅ ${data.institution.name} créée (${data.slots.length} période(s))`);
  }

  console.log("\n🎉 Base de données prête !");
  console.log("Compte admin    : admin@educonnect.be / admin123");
  console.log("Compte étudiant : etudiant@test.be / test123");
}

main().finally(() => prisma.$disconnect());
