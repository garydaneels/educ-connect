import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FROM = process.env.EMAIL_FROM || "noreply@educonnect.be";
const ADMIN = process.env.ADMIN_EMAIL || "admin@educonnect.be";
const BASE = process.env.NEXTAUTH_URL || "http://localhost:3000";
if (process.env.NODE_ENV === "production" && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))) {
  console.warn("[email] NEXTAUTH_URL is not set or points to localhost — email links will be broken in production");
}

function base(content: string, title: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <tr><td style="background:linear-gradient(135deg,#fff7ed,#f0f9ff);padding:28px 32px;border-bottom:1px solid #f0f0f0;">
        <p style="margin:0;font-size:20px;font-weight:600;color:#1c1917;">
          <span style="color:#ea580c;">Edu</span><span style="color:#0369a1;">Connect</span>
        </p>
      </td></tr>
      <tr><td style="padding:32px;">${content}</td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
        <p style="margin:0;font-size:12px;color:#a8a29e;">© 2026 Educ-Connect — Plateforme de stages en secteur social en Belgique francophone</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function btn(url: string, label: string, color = "#0369a1") {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;margin-top:20px;">${label}</a>`;
}

function tag(text: string, color = "#f0f9ff", textColor = "#0369a1") {
  return `<span style="display:inline-block;background:${color};color:${textColor};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${text}</span>`;
}

// ── Bienvenue étudiant ─────────────────────────────────────────────────────
export async function sendWelcomeStudent(to: string, name: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Bienvenue, ${name} ! 🎓</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${tag("Étudiant(e)", "#fff7ed", "#c2410c")}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Votre compte Educ-Connect est créé. Vous pouvez maintenant explorer les institutions de Belgique francophone qui accueillent des stagiaires et envoyer vos candidatures directement depuis la plateforme.
    </p>
    <ul style="color:#57534e;font-size:14px;line-height:2;padding-left:20px;">
      <li>Recherchez par commune, type de public ou hébergement</li>
      <li>Envoyez votre CV et lettre de motivation en un clic</li>
      <li>Suivez l'état de vos candidatures en temps réel</li>
      <li>Chattez directement avec les institutions</li>
    </ul>
    ${btn(`${BASE}/student`, "Explorer les institutions →", "#ea580c")}
  `;
  await resend.emails.send({ from: FROM, to, subject: "Bienvenue sur Educ-Connect 🎓", html: base(body, "Bienvenue") });
}

// ── Bienvenue institution ──────────────────────────────────────────────────
export async function sendWelcomeInstitution(to: string, name: string, institutionName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Bienvenue, ${name} ! 🏛️</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${tag("Institution", "#f0f9ff", "#0369a1")}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Votre compte pour <strong>${institutionName}</strong> est bien créé sur Educ-Connect. Pour que votre institution soit visible par les étudiants, il vous reste une étape : activer votre abonnement.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">⏳ Prochaine étape</p>
      <p style="margin:6px 0 0;font-size:14px;color:#78350f;">Souscrivez à un abonnement (149€/an ou 109€ scolaire) pour apparaître dans les recherches des étudiants.</p>
    </div>
    <ul style="color:#57534e;font-size:14px;line-height:2;padding-left:20px;">
      <li>Complétez la fiche de votre institution</li>
      <li>Ajoutez vos places de stage disponibles</li>
      <li>Recevez et gérez les candidatures</li>
      <li>Chattez avec les étudiants intéressés</li>
    </ul>
    ${btn(`${BASE}/institution/membership`, "Activer mon abonnement →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `Bienvenue sur Educ-Connect — ${institutionName}`, html: base(body, "Bienvenue") });
}

// ── Admin : nouvelle inscription ───────────────────────────────────────────
export async function sendAdminNewRegistration(role: "STUDENT" | "INSTITUTION" | "PROFESSIONAL", name: string, email: string, institutionName?: string) {
  const isInst = role === "INSTITUTION";
  const isProf = role === "PROFESSIONAL";
  const emoji = isInst ? "🏛️" : isProf ? "👨‍🏫" : "🎓";
  const roleLabel = isInst ? "Institution" : isProf ? "Professionnel(le)" : "Étudiant(e)";
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">${emoji} Nouvelle inscription ${roleLabel}</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Notification automatique Educ-Connect</p>
    <div style="background:#f5f5f4;border-radius:12px;padding:16px 20px;font-size:14px;color:#44403c;line-height:2;">
      <div><strong>Nom :</strong> ${escapeHtml(name)}</div>
      <div><strong>Email :</strong> ${escapeHtml(email)}</div>
      ${isInst && institutionName ? `<div><strong>Institution :</strong> ${escapeHtml(institutionName)}</div>` : ""}
      <div><strong>Rôle :</strong> ${roleLabel}</div>
      <div><strong>Date :</strong> ${new Date().toLocaleString("fr-BE")}</div>
    </div>
    ${isInst ? btn(`${BASE}/admin`, "Gérer les abonnements →") : ""}
  `;
  await resend.emails.send({ from: FROM, to: ADMIN, subject: `${emoji} Nouvelle inscription ${roleLabel} — ${name}`, html: base(body, "Nouvelle inscription") });
}

// ── Institution : nouvelle candidature ────────────────────────────────────
export async function sendInstitutionNewApplication(to: string, institutionName: string, studentName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">📩 Nouvelle candidature reçue</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${studentName}</strong> vient de postuler pour une place de stage chez vous.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#0c4a6e;line-height:2;">
      <div><strong>Candidat :</strong> ${studentName}</div>
    </div>
    <p style="color:#57534e;font-size:14px;">Consultez le CV, la lettre de motivation et répondez au candidat depuis votre espace institution.</p>
    ${btn(`${BASE}/institution/applications`, "Voir la candidature →")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `📩 Nouvelle candidature — ${studentName}`, html: base(body, "Nouvelle candidature") });
}

// ── Étudiant : candidature acceptée + RDV ─────────────────────────────────
export async function sendStudentApplicationAccepted(to: string, studentName: string, institutionName: string, rdvDate: string, rdvNote?: string) {
  const fmt = (d: string) => new Date(d).toLocaleString("fr-BE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">🎉 Votre candidature a été acceptée !</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Bonne nouvelle ! <strong>${institutionName}</strong> a accepté votre candidature et vous propose un rendez-vous.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#14532d;line-height:2;">
      <p style="margin:0 0 4px;font-weight:700;">📅 Rendez-vous fixé</p>
      <div><strong>Date :</strong> ${fmt(rdvDate)}</div>
      ${rdvNote ? `<div><strong>Lieu / note :</strong> ${rdvNote}</div>` : ""}
    </div>
    <p style="color:#57534e;font-size:14px;">Vous pouvez échanger des messages avec l'institution depuis votre espace candidatures.</p>
    ${btn(`${BASE}/student/applications`, "Voir mes candidatures →", "#16a34a")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `🎉 Candidature acceptée — ${institutionName}`, html: base(body, "Candidature acceptée") });
}

// ── Admin : stage trouvé ───────────────────────────────────────────────────
export async function sendAdminStageFound(institutionName: string, studentName: string, stageDate: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">✅ Stage confirmé</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Notification automatique Educ-Connect</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Un stage a été confirmé sur Educ-Connect.
    </p>
    <div style="background:#f5f5f4;border-radius:12px;padding:16px 20px;font-size:14px;color:#44403c;line-height:2;">
      <div><strong>Étudiant :</strong> ${studentName}</div>
      <div><strong>Institution :</strong> ${institutionName}</div>
      <div><strong>Date de confirmation :</strong> ${fmt(stageDate)}</div>
    </div>
    ${btn(`${BASE}/admin`, "Voir le tableau de bord →")}
  `;
  await resend.emails.send({ from: FROM, to: ADMIN, subject: `✅ Stage confirmé — ${studentName} chez ${institutionName}`, html: base(body, "Stage confirmé") });
}

// ── Étudiant : stage confirmé (notification finale) ───────────────────────
export async function sendStudentStageConfirmed(to: string, studentName: string, institutionName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">🏆 Votre stage est confirmé !</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${institutionName}</strong> a officiellement confirmé votre stage. Félicitations !
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#14532d;">
      <p style="margin:0;font-weight:600;">🎉 Tout est en ordre. Bon stage !</p>
    </div>
    ${btn(`${BASE}/student/applications`, "Voir mes candidatures →", "#16a34a")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `🏆 Stage confirmé — ${institutionName}`, html: base(body, "Stage confirmé") });
}

// ── Étudiant : candidature refusée ────────────────────────────────────────
export async function sendStudentApplicationRejected(to: string, studentName: string, institutionName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">Candidature non retenue</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${institutionName}</strong> n'a malheureusement pas retenu votre candidature cette fois-ci.
    </p>
    <p style="color:#57534e;font-size:14px;line-height:1.6;">
      Ne vous découragez pas — d'autres institutions attendent vos candidatures. Vous pouvez continuer vos recherches depuis votre espace.
    </p>
    ${btn(`${BASE}/student`, "Continuer mes recherches →", "#ea580c")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `Candidature non retenue — ${institutionName}`, html: base(body, "Candidature non retenue") });
}

// ── Nouveau message reçu ───────────────────────────────────────────────────
export async function sendNewMessage(to: string, recipientName: string, senderName: string, preview: string, link: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">💬 Nouveau message</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${recipientName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Vous avez reçu un nouveau message de <strong>${senderName}</strong>.
    </p>
    ${preview ? `<div style="background:#f5f5f4;border-left:3px solid #d6d3d1;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;color:#57534e;font-size:14px;font-style:italic;">"${preview}"</div>` : ""}
    ${btn(`${BASE}${link}`, "Répondre →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `💬 Nouveau message de ${senderName}`, html: base(body, "Nouveau message") });
}

// ── Institution : demande de changement d'horaire ─────────────────────────
export async function sendInstitutionScheduleRequest(to: string, institutionName: string, studentName: string, description: string, stageLink: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">📅 Demande de changement d'horaire</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${studentName}</strong> a soumis une demande de modification d'horaire.
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#78350f;">
      <p style="margin:0 0 4px;font-weight:700;">Message du stagiaire :</p>
      <p style="margin:0;">${escapeHtml(description)}</p>
    </div>
    <p style="color:#57534e;font-size:14px;">Acceptez ou refusez cette demande depuis la page du stage.</p>
    <p style="color:#a8a29e;font-size:12px;">⚠️ Vous devez être connecté(e) à Educ-Connect pour accéder à ce lien.</p>
    ${btn(`${BASE}${stageLink}`, "Voir la demande →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `📅 Demande d'horaire — ${studentName}`, html: base(body, "Demande d'horaire") });
}

// ── Étudiant : réponse à sa demande d'horaire ────────────────────────────
export async function sendStudentScheduleRequestResponse(to: string, studentName: string, institutionName: string, approved: boolean, responseNote: string | null | undefined, stageLink: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">${approved ? "✅ Demande d'horaire acceptée" : "❌ Demande d'horaire refusée"}</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${institutionName}</strong> a ${approved ? "accepté" : "refusé"} votre demande de changement d'horaire.
    </p>
    ${responseNote ? `<div style="background:#f5f5f4;border-left:3px solid #d6d3d1;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;color:#57534e;font-size:14px;">${escapeHtml(responseNote)}</div>` : ""}
    ${btn(`${BASE}${stageLink}`, "Voir mon stage →", approved ? "#16a34a" : "#dc2626")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `${approved ? "✅" : "❌"} Demande d'horaire ${approved ? "acceptée" : "refusée"} — ${institutionName}`, html: base(body, "Réponse demande d'horaire") });
}

// ── Institution : indisponibilité signalée ────────────────────────────────
export async function sendInstitutionUnavailability(to: string, institutionName: string, studentName: string, date: string, reason: string | null | undefined, stageLink: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">🗓️ Indisponibilité signalée</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${studentName}</strong> a signalé une indisponibilité.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#78350f;line-height:2;">
      <div><strong>Date :</strong> ${fmt(date)}</div>
      ${reason ? `<div><strong>Motif :</strong> ${escapeHtml(reason)}</div>` : ""}
    </div>
    <p style="color:#57534e;font-size:14px;">Vous pouvez approuver ou refuser cette indisponibilité depuis la page du stage.</p>
    ${btn(`${BASE}${stageLink}`, "Voir le stage →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `🗓️ Indisponibilité signalée — ${studentName}`, html: base(body, "Indisponibilité") });
}

// ── Étudiant : stage arrêté ou non validé ────────────────────────────────
export async function sendStudentStageStatusChanged(to: string, studentName: string, institutionName: string, status: "STOPPED" | "NOT_VALIDATED" | "COMPLETED") {
  const configs = {
    STOPPED:       { emoji: "⏹", label: "arrêté", color: "#dc2626", msg: "Votre stage a été interrompu par l'institution. Contactez-la pour plus d'informations." },
    NOT_VALIDATED: { emoji: "❌", label: "non validé", color: "#d97706", msg: "L'institution n'a pas validé votre stage. Prenez contact avec elle pour comprendre les raisons." },
    COMPLETED:     { emoji: "🏆", label: "validé", color: "#16a34a", msg: "Félicitations ! Votre stage a été validé avec succès par l'institution." },
  };
  const c = configs[status];
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">${c.emoji} Stage ${c.label}</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      ${c.msg}
    </p>
    <div style="background:#f5f5f4;border-radius:12px;padding:14px 20px;margin:20px 0;font-size:14px;color:#57534e;">
      <strong>Institution :</strong> ${institutionName}
    </div>
    ${btn(`${BASE}/student/applications`, "Voir mes candidatures →", c.color)}
  `;
  await resend.emails.send({ from: FROM, to, subject: `${c.emoji} Votre stage est ${c.label} — ${institutionName}`, html: base(body, `Stage ${c.label}`) });
}

// ── Vérification email ────────────────────────────────────────────────────
export async function sendEmailVerification(to: string, name: string, token: string) {
  const link = `${BASE}/verify-email?token=${token}`;
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Confirmez votre adresse email 📬</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Bienvenue, ${name} !</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Votre compte Educ-Connect a bien été créé. Il ne vous reste plus qu'une étape : confirmer votre adresse email pour activer votre compte.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:13px;color:#c2410c;">Ce lien expire dans <strong>24 heures</strong></p>
    </div>
    ${btn(link, "Confirmer mon email →", "#ea580c")}
    <p style="color:#a8a29e;font-size:12px;margin-top:20px;line-height:1.6;">
      Si vous n'avez pas créé de compte Educ-Connect, ignorez cet email.
    </p>
  `;
  await resend.emails.send({ from: FROM, to, subject: "Confirmez votre adresse email — Educ-Connect", html: base(body, "Confirmation email") });
}

// ── Réinitialisation mot de passe ─────────────────────────────────────────
export async function sendPasswordReset(to: string, name: string, token: string) {
  const link = `${BASE}/reset-password?token=${token}`;
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Réinitialiser votre mot de passe 🔐</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Bonjour ${name}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Vous avez demandé à réinitialiser votre mot de passe Educ-Connect. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#b91c1c;">⏰ Ce lien expire dans <strong>1 heure</strong></p>
    </div>
    ${btn(link, "Choisir un nouveau mot de passe →", "#dc2626")}
    <p style="color:#a8a29e;font-size:12px;margin-top:20px;line-height:1.6;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.
    </p>
  `;
  await resend.emails.send({ from: FROM, to, subject: "Réinitialisation de votre mot de passe — Educ-Connect", html: base(body, "Réinitialisation mot de passe") });
}

// ── Institution : abonnement activé par l'admin ───────────────────────────
export async function sendSubscriptionActivated(to: string, name: string, institutionName: string, plan: string, endDate: string) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const planLabel: Record<string, string> = { MONTHLY: "Mensuel", QUARTERLY: "Trimestriel", SEMESTER: "Semestriel", ANNUAL: "Annuel", SCHOOL: "Scolaire (an scolaire)" };
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Votre abonnement est actif ! 🎉</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Bonjour ${name}, votre abonnement <strong>${planLabel[plan] ?? plan}</strong> a été activé par l'équipe Educ-Connect.
      Votre institution est maintenant <strong>visible par les étudiants</strong> à la recherche d'un stage.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#14532d;line-height:2;">
      <div><strong>Formule :</strong> ${planLabel[plan] ?? plan}</div>
      <div><strong>Valide jusqu'au :</strong> ${fmtDate(endDate)}</div>
    </div>
    <ul style="color:#57534e;font-size:14px;line-height:2;padding-left:20px;">
      <li>Complétez votre fiche institution si ce n'est pas encore fait</li>
      <li>Ajoutez vos places de stage disponibles</li>
      <li>Recevez et gérez les candidatures des étudiants</li>
    </ul>
    ${btn(`${BASE}/institution`, "Accéder à mon espace →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `✅ Abonnement activé — ${institutionName}`, html: base(body, "Abonnement activé") });
}

// ── Institution : abonnement expirant bientôt ─────────────────────────────
export async function sendSubscriptionExpiry(to: string, name: string, institutionName: string, daysLeft: number, endDate: string) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">⚠️ Votre abonnement expire bientôt</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Bonjour ${name}, votre abonnement Educ-Connect arrive à échéance dans <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>.
    </p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#92400e;">
      <p style="margin:0;font-weight:600;">📅 Date d'expiration : ${fmtDate(endDate)}</p>
      <p style="margin:6px 0 0;">Après cette date, votre institution ne sera plus visible par les étudiants.</p>
    </div>
    <p style="color:#57534e;font-size:14px;line-height:1.6;">
      Pour renouveler, contactez-nous à <a href="mailto:contact@educonnect.be" style="color:#0369a1;">contact@educonnect.be</a> ou rendez-vous dans votre espace membre.
    </p>
    ${btn(`${BASE}/institution/membership`, "Renouveler mon abonnement →", "#d97706")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `⚠️ Abonnement expirant dans ${daysLeft}j — ${institutionName}`, html: base(body, "Abonnement expirant") });
}

// ── Institution : rappel candidatures en attente ──────────────────────────
export async function sendPendingApplicationReminder(to: string, institutionName: string, count: number) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">📋 ${count} candidature${count > 1 ? "s" : ""} en attente de réponse</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${institutionName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Des étudiants attendent votre retour depuis plus de 5 jours. Un traitement rapide des candidatures améliore l'expérience des étudiants et la réputation de votre institution.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#0c4a6e;">
      <p style="margin:0;font-weight:600;">📩 ${count} candidature${count > 1 ? "s" : ""} en attente</p>
      <p style="margin:6px 0 0;">Acceptez, refusez ou proposez un rendez-vous depuis votre espace institution.</p>
    </div>
    ${btn(`${BASE}/institution/applications`, "Voir les candidatures →")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `📋 ${count} candidature${count > 1 ? "s" : ""} en attente — ${institutionName}`, html: base(body, "Candidatures en attente") });
}

// ── Facture institution ───────────────────────────────────────────────────
export async function sendInvoiceEmail(opts: {
  to: string;
  institutionName: string;
  invoiceNumber: string;
  plan: string;
  startDate: string;
  endDate: string;
  price: number;
  issuedAt: string;
}) {
  const { to, institutionName, invoiceNumber, plan, startDate, endDate, price, issuedAt } = opts;
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
  const planLabels: Record<string, string> = {
    MONTHLY: "Mensuel", QUARTERLY: "Trimestriel", SEMESTER: "Semestriel", ANNUAL: "Annuel", SCHOOL: "Scolaire",
  };
  const planLabel = planLabels[plan] ?? plan;
  const priceStr = price.toLocaleString("fr-BE", { style: "currency", currency: "EUR" });

  const body = `
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1c1917;">🧾 Facture Educ-Connect</p>
    <p style="margin:0 0 24px;color:#a8a29e;font-size:14px;">Merci pour votre confiance</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#64748b;padding-bottom:6px;">N° de facture</td>
          <td style="font-size:13px;font-weight:700;color:#1e293b;text-align:right;padding-bottom:6px;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;padding-bottom:6px;">Date d'émission</td>
          <td style="font-size:13px;color:#1e293b;text-align:right;padding-bottom:6px;">${fmt(issuedAt)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;padding-bottom:6px;">Destinataire</td>
          <td style="font-size:13px;font-weight:600;color:#1e293b;text-align:right;padding-bottom:6px;">${institutionName}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:10px 16px;text-align:left;">Description</th>
            <th style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:10px 16px;text-align:right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:14px 16px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">Abonnement Educ-Connect — Formule ${planLabel}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Période : ${fmt(startDate)} → ${fmt(endDate)}</p>
            </td>
            <td style="padding:14px 16px;text-align:right;font-size:14px;font-weight:600;color:#1e293b;">${priceStr}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc;border-top:1px solid #e2e8f0;">
            <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1e293b;">Total TTC</td>
            <td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#0369a1;">${priceStr}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p style="color:#64748b;font-size:13px;line-height:1.7;">
      Educ-Connect est une association sans but lucratif (ASBL). Ce document tient lieu de reçu officiel pour votre comptabilité.
      Pour toute question, contactez <a href="mailto:contact@educonnect.be" style="color:#0369a1;">contact@educonnect.be</a>.
    </p>

    ${btn(`${BASE}/institution/billing`, "Voir mon abonnement →")}
  `;
  await resend.emails.send({
    from: FROM,
    to,
    bcc: ADMIN,
    subject: `🧾 Facture Educ-Connect — ${invoiceNumber}`,
    html: base(body, `Facture ${invoiceNumber}`),
  });
}

// ── Institution : intérêt pour un étudiant ───────────────────────────────
export async function sendStudentInstitutionInterest(to: string, studentName: string, institutionName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">💌 Une institution est intéressée par votre profil</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${institutionName}</strong> a consulté votre profil et souhaite vous accueillir en stage.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin:20px 0;font-size:14px;color:#c2410c;line-height:1.7;">
      <p style="margin:0;font-weight:600;">📋 Prochaine étape</p>
      <p style="margin:6px 0 0;">Connectez-vous à votre espace pour <strong>accepter ou décliner</strong> cette invitation. Si vous acceptez, vous pourrez discuter directement avec l'institution pour organiser votre stage.</p>
    </div>
    ${btn(`${BASE}/student/applications`, "Voir l'invitation →", "#ea580c")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `💌 ${institutionName} est intéressée par votre profil`, html: base(body, "Invitation de stage") });
}

// ── Institution : réponse de l'étudiant à une invitation ──────────────────
export async function sendInstitutionInvitationAccepted(to: string, institutionName: string, studentName: string, appLink: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">✅ ${studentName} a accepté votre invitation</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${tag("Institution", "#f0f9ff", "#0369a1")}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Bonne nouvelle ! <strong>${studentName}</strong> a accepté votre invitation de stage et est maintenant en attente de votre réponse.
      Vous pouvez consulter sa candidature et lui envoyer un message directement depuis la plateforme.
    </p>
    ${btn(`${appLink}`, "Voir la candidature →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `✅ ${studentName} a accepté votre invitation — Educ-Connect`, html: base(body, "Invitation acceptée") });
}

export async function sendInstitutionInvitationDeclined(to: string, institutionName: string, studentName: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">❌ ${studentName} a décliné votre invitation</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${tag("Institution", "#f0f9ff", "#0369a1")}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${studentName}</strong> n'est pas disponible pour ce stage. Vous pouvez explorer d'autres profils d'étudiants sur la plateforme.
    </p>
    ${btn(`${BASE}/institution/students`, "Explorer les étudiants →", "#0369a1")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `${studentName} a décliné votre invitation — Educ-Connect`, html: base(body, "Invitation déclinée") });
}

export async function sendStudentUnavailabilityResponse(to: string, studentName: string, institutionName: string, approved: boolean, stageLink: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">${approved ? "✅ Indisponibilité approuvée" : "❌ Indisponibilité refusée"}</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">${studentName}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      <strong>${institutionName}</strong> a ${approved ? "approuvé" : "refusé"} votre demande d'indisponibilité.
    </p>
    ${btn(`${BASE}${stageLink}`, "Voir mon stage →", approved ? "#16a34a" : "#dc2626")}
  `;
  await resend.emails.send({ from: FROM, to, subject: `${approved ? "✅" : "❌"} Demande d'indisponibilité ${approved ? "approuvée" : "refusée"} — ${institutionName}`, html: base(body, `Réponse indisponibilité`) });
}

// ── Mot de passe oublié ────────────────────────────────────────────────────
export async function sendForgotPassword(to: string, name: string, code: string) {
  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Nouveau code d'accès 🔑</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Bonjour ${name}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Vous avez demandé un nouveau code d'accès pour votre compte Educ-Connect.<br>
      Voici votre code temporaire :
    </p>
    <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:6px;color:#1e293b;font-family:monospace;">${code}</p>
    </div>
    <p style="color:#78716c;font-size:13px;line-height:1.6;">
      Connectez-vous avec ce code, puis changez-le depuis votre espace pour en choisir un plus personnel.<br>
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre ancien code reste actif.
    </p>
    ${btn(`${BASE}/login`, "Se connecter →", "#ea580c")}
  `;
  await resend.emails.send({ from: FROM, to, subject: "Votre nouveau code d'accès — Educ-Connect", html: base(body, "Nouveau code d'accès") });
}

// ── Subscription : Email à l'institution ────────────────────────────────────
export async function sendSubscriptionPendingToInstitution(to: string, name: string, institutionName: string, plan: string, communication: string) {
  const planLabel: Record<string, string> = {
    QUARTERLY: "Trimestriel",
    SEMESTER: "Semestriel",
    ANNUAL: "Annuel",
    SCHOOL: "Scolaire",
  };

  const body = `
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1917;">Demande enregistrée ✅</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Bonjour ${name}</p>
    <p style="color:#44403c;font-size:15px;line-height:1.6;">
      Votre demande d'abonnement <strong>${planLabel[plan] || plan}</strong> pour <strong>${institutionName}</strong> a bien été enregistrée.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">⏳ Vérification en cours</p>
      <p style="margin:6px 0 0;font-size:14px;color:#15803d;">Nous vérifions votre virement et vous enverrons une facture sous peu. Votre institution sera visible dans les recherches dès confirmation.</p>
    </div>
    <p style="color:#78716c;font-size:13px;line-height:1.6;">
      Communication de virement : <strong style="font-family:monospace;font-size:14px;">${communication}</strong>
    </p>
  `;
  await resend.emails.send({ from: FROM, to, subject: `Demande enregistrée — ${institutionName}`, html: base(body, "Demande enregistrée") });
}

// ── Subscription : Email à l'admin (facturation) ─────────────────────────────
export async function sendSubscriptionPendingToAdmin(institutionName: string, institutionEmail: string, plan: string, communication: string, price: number) {
  const body = `
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917;">📋 Nouvelle subscription en attente de vérification</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:14px;">Notification automatique Educ-Connect</p>
    <div style="background:#f5f5f4;border-radius:12px;padding:16px 20px;font-size:14px;color:#44403c;line-height:2;">
      <div><strong>Institution :</strong> ${institutionName}</div>
      <div><strong>Email :</strong> ${institutionEmail}</div>
      <div><strong>Plan :</strong> ${plan}</div>
      <div><strong>Montant :</strong> ${price},00 €</div>
      <div><strong>Communication :</strong> <span style="font-family:monospace;font-weight:600;">${communication}</span></div>
      <div><strong>Date :</strong> ${new Date().toLocaleString("fr-BE")}</div>
    </div>
  `;
  await resend.emails.send({ from: FROM, to: ADMIN, subject: `📋 Subscription en attente — ${institutionName}`, html: base(body, "Subscription en attente") });
}
