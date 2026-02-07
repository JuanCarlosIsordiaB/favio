import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const {
      to,
      subject,
      orderNumber,
      supplierName,
      pdfBase64,
      firmName,
    } = await req.json();

    if (!to || !subject || !pdfBase64) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Si no hay RESEND_API_KEY, usar un servicio de email alternativo o simplemente retornar éxito
    // Por ahora, vamos a usar Resend que es un servicio popular para envío de emails
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY no configurada. Email no se enviará.");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Servicio de email no configurado",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Preparar el email con el PDF adjunto
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Orden de Compra</h2>
        <p>Estimado/a ${supplierName || "Proveedor"},</p>
        <p>Adjuntamos la orden de compra <strong>${orderNumber}</strong>${firmName ? ` de ${firmName}` : ""}.</p>
        <p>Por favor, revise los detalles y confirme la recepción.</p>
        <p>Saludos cordiales.</p>
      </div>
    `;

    // Enviar email usando Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "noreply@campogestor.com", // Cambiar por tu dominio verificado en Resend
        to: [to],
        subject: subject,
        html: emailBody,
        attachments: [
          {
            filename: `orden-compra-${orderNumber}.pdf`,
            content: pdfBase64,
            type: "application/pdf",
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Error en Resend API:", errorData);
      throw new Error(`Error enviando email: ${resendResponse.statusText}`);
    }

    const result = await resendResponse.json();
    console.log(`✅ Email enviado a ${to} para orden ${orderNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email enviado exitosamente a ${to}`,
        emailId: result.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en send-purchase-order-email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

