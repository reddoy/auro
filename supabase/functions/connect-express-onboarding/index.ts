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

    // Ensure creators row exists
    let creatorsRow: any = null;
    try {
      const existing = await admin
        .from("creators")
        .select("id, profile_id, slug, stripe_connect_account_id")
        .eq("profile_id", reviewerId)
        .maybeSingle();
      creatorsRow = existing.data || null;
      if (!creatorsRow) {
        const slug = (profile as any)?.username || reviewerId;
        const insert = await admin
          .from("creators")
          .insert([{ profile_id: reviewerId, slug }])
          .select("id, profile_id, slug, stripe_connect_account_id")
          .single();
        creatorsRow = insert.data || null;
      }
    } catch {}

    let connectAccountId = creatorsRow?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const acct = await stripe.accounts.create({
        type: "express",
        email: (profile as any)?.email || undefined,
        capabilities: { transfers: { requested: true } },
      });
      connectAccountId = acct.id;
      await admin.from("creators").update({ stripe_connect_account_id: connectAccountId }).eq("profile_id", reviewerId);
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




