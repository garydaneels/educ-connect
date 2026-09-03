import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ RESEND_WEBHOOK_SECRET not configured in .env");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Vérifier la signature du webhook avec Svix
    const svixHeaders = {
      "svix-id": req.headers.get("svix-id") || "",
      "svix-timestamp": req.headers.get("svix-timestamp") || "",
      "svix-signature": req.headers.get("svix-signature") || "",
    };

    const body = await req.text();
    const wh = new Webhook(webhookSecret);

    let event;
    try {
      event = wh.verify(body, svixHeaders) as any;
    } catch (error) {
      console.error("❌ Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401 }
      );
    }

    const { type, data } = event;

    if (!type || !data) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Extraire les données selon le type d'événement
    const email = data.email || data.to || "";
    if (!email) {
      return NextResponse.json(
        { error: "Email not found in webhook" },
        { status: 400 }
      );
    }

    // Créer le record d'événement email
    const emailEvent: any = {
      email,
      eventType: type, // "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained"
      subject: data.subject,
      resendId: data.id,
      metadata: JSON.stringify(data),
    };

    // Ajouter les champs spécifiques selon le type d'événement
    if (type === "clicked") {
      emailEvent.clickedUrl = data.click?.url || data.url;
    }

    if (type === "bounced") {
      emailEvent.bounceType = data.bounce?.type || data.bounce_type;
      emailEvent.bounceReason = data.bounce?.message || data.bounce_reason;
    }

    // Sauvegarder dans la base de données
    await prisma.emailEvent.create({
      data: emailEvent,
    });

    console.log(`✅ Email event tracked: ${type} for ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
