import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-user-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { userId, action } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If Stripe is not configured, return a structured response
    if (!stripeSecretKey) {
      // For demo: mark subscription as active without real payment
      // This allows the app to function for demonstration
      if (action === "demo_activate") {
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan: "premium",
            status: "active",
            provider: "demo",
            subscription_id: "demo_" + Date.now(),
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Assign a demo mentor
        const { data: mentor } = await supabase
          .from("mentors")
          .select("id")
          .eq("is_demo", true)
          .limit(1)
          .maybeSingle();

        if (mentor) {
          await supabase
            .from("mentor_assignments")
            .upsert({
              student_id: userId,
              mentor_id: mentor.id,
              assigned_at: new Date().toISOString(),
              status: "active",
            }, { onConflict: "student_id" });
        }

        return new Response(JSON.stringify({
          success: true,
          status: "active",
          message: "Premium activated (demo mode — no real payment processed)",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.",
        stripeConfigured: false,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Real Stripe integration
    const stripe = await import("npm:stripe@14.21.0");
    const stripeClient = new stripe.default(stripeSecretKey);

    if (action === "create_checkout") {
      const origin = req.headers.get("origin") || "http://localhost:5173";
      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "inr",
            product_data: { name: "PadanaMithra Premium" },
            unit_amount: 9900, // ₹99.00
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        success_url: `${origin}/?payment=success`,
        cancel_url: `${origin}/?payment=cancelled`,
        metadata: { userId },
      });

      // Mark subscription as pending
      await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: "premium",
          status: "pending",
          provider: "stripe",
          subscription_id: session.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return new Response(JSON.stringify({
        subscription: sub,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
