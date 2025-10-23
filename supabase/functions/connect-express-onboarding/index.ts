import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { reviewerId, returnUrl } = await req.json();
    if (!reviewerId) return json({ error: "Missing reviewerId" }, 400);

    const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);
    const admin = createClient(supabaseUrl, serviceKey);

    const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!secret) return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
    const stripe = new Stripe(secret);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, username")
      .eq("id", reviewerId)
      .maybeSingle();

    // Check if profile exists and is a reviewer
    let profileRow: any = null;
    try {
      const existing = await admin
        .from("profiles")
        .select("id, username, stripe_connect_account_id, is_reviewer")
        .eq("id", reviewerId)
        .maybeSingle();
      profileRow = existing.data || null;
      if (!profileRow) {
        return json({ error: "Profile not found" }, 404);
      }
      if (!(profileRow as any)?.is_reviewer) {
        return json({ error: "User is not a reviewer" }, 400);
      }
    } catch {}

    let connectAccountId = profileRow?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        email: (profile as any)?.email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: "daily",
            },
          },
        },
      });
      connectAccountId = acct.id;
      await admin.from("profiles").update({ stripe_connect_account_id: connectAccountId }).eq("id", reviewerId);
    }

    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://www.appauro.com";
    const link = await stripe.accountLinks.create({
      account: connectAccountId!,
      type: "account_onboarding",
      return_url: returnUrl || siteUrl,
      refresh_url: returnUrl || siteUrl,
    });
    return json({ url: link.url, accountId: connectAccountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});




