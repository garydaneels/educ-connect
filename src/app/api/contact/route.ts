import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit, getIp } from "@/lib/rate-limit";

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const FROM = process.env.EMAIL_FROM || "Educ-Connect <contact@educonnect.be>";
const ADMIN = process.env.ADMIN_EMAIL || "admin@educonnect.be";
const BASE = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  if (!rateLimit(getIp(req), 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de messages envoyés. Réessayez dans une heure." }, { status: 429 });
  }

  const { name, email, subject, message } = await req.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const html = `<!DOCTYPE html><html lang="fr"><body style="font-family:sans-serif;background:#f9fafb;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#fff7ed,#f0f9ff);padding:24px 32px;border-bottom:1px solid #f0f0f0">
    <p style="margin:0;font-size:20px;font-weight:600;color:#1c1917"><span style="color:#ea580c">Edu</span><span style="color:#0369a1">Connect</span></p>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1c1917">📩 Nouveau message via la page contact</p>
    <p style="margin:0 0 20px;color:#a8a29e;font-size:13px">Reçu depuis educonnect.be/contact</p>
    <table style="font-size:14px;color:#44403c;line-height:2;background:#f5f5f4;border-radius:12px;padding:16px 20px;width:100%;border-spacing:0">
      <tr><td style="font-weight:700;padding-right:12px;white-space:nowrap">Nom :</td><td>${name}</td></tr>
      <tr><td style="font-weight:700;padding-right:12px">Email :</td><td><a href="mailto:${email}" style="color:#0369a1">${email}</a></td></tr>
      <tr><td style="font-weight:700;padding-right:12px">Sujet :</td><td>${subject || "—"}</td></tr>
    </table>
    <div style="margin:20px 0;background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px;font-size:14px;color:#44403c;line-height:1.7;white-space:pre-wrap">${message}</div>
    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || "Votre message Educ-Connect")}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600">Répondre à ${name} →</a>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa">
    <p style="margin:0;font-size:12px;color:#a8a29e">© 2026 Educ-Connect — ${BASE}</p>
  </div>
</div></body></html>`;

  transport.sendMail({
    from: FROM,
    to: ADMIN,
    replyTo: `${name} <${email}>`,
    subject: `📩 Contact Educ-Connect — ${subject || name}`,
    html,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
