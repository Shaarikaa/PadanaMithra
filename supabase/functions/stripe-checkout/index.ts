import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-user-id",
};

const INDIVIDUAL_PRICE = 9900; // ₹99.00 in paise
const BUNDLE_PRICE = 44900; // ₹449.00 in paise

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

    const { userId, action, featureId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If Stripe is not configured, return a structured response
    if (!stripeSecretKey) {
      // Demo mode — activate without real payment
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
          message: "Premium bundle activated (demo mode — no real payment processed)",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "demo_activate_feature" && featureId) {
        const { error } = await supabase
          .from("feature_entitlements")
          .upsert({
            user_id: userId,
            feature_id: featureId,
            status: "active",
            provider: "demo",
            entitlement_id: "demo_" + featureId + "_" + Date.now(),
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,feature_id" });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          status: "active",
          featureId,
          message: `Feature '${featureId}' activated (demo mode — no real payment processed)`,
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

    // Create checkout for the full bundle (₹449)
    if (action === "create_checkout") {
      const origin = req.headers.get("origin") || "http://localhost:5173";
      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "inr",
            product_data: { name: "PadanaMithra Pro — All Features" },
            unit_amount: BUNDLE_PRICE,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        success_url: `${origin}/?payment=success`,
        cancel_url: `${origin}/?payment=cancelled`,
        metadata: { userId, type: "bundle" },
      });

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

    // Create checkout for an individual feature (₹99)
    if (action === "create_feature_checkout" && featureId) {
      const origin = req.headers.get("origin") || "http://localhost:5173";
      const featureNames: Record<string, string> = {
        "offline": "Offline Mode — PRO",
        "mentoring": "Personal Mentor — PRO",
        "video-classes": "Live Video Class — PRO",
        "pro-notes": "Notes by Professionals — PRO",
      };
      const productName = featureNames[featureId] || `PadanaMithra — ${featureId}`;

      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "inr",
            product_data: { name: productName },
            unit_amount: INDIVIDUAL_PRICE,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        success_url: `${origin}/?payment=success&feature=${featureId}`,
        cancel_url: `${origin}/?payment=cancelled`,
        metadata: { userId, type: "feature", featureId },
      });

      await supabase
        .from("feature_entitlements")
        .upsert({
          user_id: userId,
          feature_id: featureId,
          status: "pending",
          provider: "stripe",
          entitlement_id: session.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,feature_id" });

      return new Response(JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription + entitlement status
    if (action === "check_status") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: entitlements } = await supabase
        .from("feature_entitlements")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");

      return new Response(JSON.stringify({
        subscription: sub,
        entitlements: entitlements || [],
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
