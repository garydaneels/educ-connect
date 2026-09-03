import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // Vérifier le token Resend (optionnel mais recommandé)
    const resendToken = req.headers.get("svix-id");
    if (!resendToken) {
      console.warn("Webhook reçu sans token Resend");
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
