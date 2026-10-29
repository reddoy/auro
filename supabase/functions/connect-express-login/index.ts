import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { reviewerId, returnUrl } = await req.json();
    if (!reviewerId) return json({ error: "Missing reviewerId" }, 400);

    // Require Supabase JWT and ensure caller matches reviewerId
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid token" }, 401);
    if (userData.user.id !== reviewerId) return json({ error: "Forbidden" }, 403);

    const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!secret) return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
    const stripe = new Stripe(secret);

    const admin = createClient(supabaseUrl, serviceKey);
    // Read from profiles table where you stored the connect account id
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", reviewerId)
      .eq("is_reviewer", true)
      .maybeSingle();
    if (profErr) return json({ error: profErr.message }, 400);
    const connectAccountId = (profile as any)?.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) return json({ error: "Reviewer is not connected to Stripe" }, 400);

    const siteUrl = Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://auro-pearl.vercel.app";
    const link = await stripe.accounts.createLoginLink(connectAccountId, { redirect_url: returnUrl || siteUrl });
    return json({ url: link.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});




