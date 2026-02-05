import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const {
      email,
      firmName,
      role,
      invitationUrl,
      invitedByEmail,
    } = await req.json();

    if (!email || !firmName || !role || !invitationUrl) {
      return new Response("Missing required fields", { status: 400 });
    }

    // ✅ Usar Supabase Auth admin API para invitar usuario
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Invitar usuario usando Supabase Auth nativo
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: invitationUrl,
        data: {
          firm_name: firmName,
          role: role,
          invited_by: invitedByEmail,
          invitation_accepted: false,
        },
      }
    );

    if (error) {
      console.error("Supabase auth error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Invitation sent to ${email} for firm ${firmName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitación enviada a ${email}`,
        user_id: data?.user?.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-invitation-email:", error);
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
