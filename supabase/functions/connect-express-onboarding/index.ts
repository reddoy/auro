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

function siteOrigin(): string {
  const raw = (Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://auro-pearl.vercel.app").trim().replace(/\/$/, "");
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.hostname !== "localhost") {
      u.protocol = "https:";
    }
    return u.origin;
  } catch {
    return "https://auro-pearl.vercel.app";
  }
}

function protocolOkForStripeRedirect(u: URL): boolean {
  if (u.protocol === "https:") return true;
  if (u.protocol !== "http:") return false;
  const h = u.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/** Match Next.js route `validatedSuccessUrl`. */
function resolveStripeRedirectUrls(siteBase: string, returnUrl: unknown): { successUrl: string; refreshUrl: string } {
  const refreshUrl = `${siteBase}/auth/stripe-connect-refresh`;
  let successUrl = `${siteBase}/auth/stripe-connect-success`;
  if (typeof returnUrl !== "string" || returnUrl.trim().length === 0) {
    return { successUrl, refreshUrl };
  }
  try {
    const clientU = new URL(returnUrl.trim());
    const baseU = new URL(siteBase);
    const norm = (h: string) => h.replace(/^www\./, "");
    const samePrimary =
      norm(clientU.hostname) === norm(baseU.hostname) || clientU.hostname === baseU.hostname;
    if (
      protocolOkForStripeRedirect(clientU) &&
      samePrimary &&
      clientU.pathname.startsWith("/auth/stripe-connect-success")
    ) {
      successUrl = clientU.toString();
    }
  } catch {
    // keep canonical successUrl
  }
  return { successUrl, refreshUrl };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  }
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

    const existing = await admin
      .from("profiles")
      .select("id, username, email, stripe_connect_account_id, is_reviewer")
      .eq("id", reviewerId)
      .maybeSingle();

    if (existing.error) {
      return json({ error: existing.error.message }, 400);
    }
    const profileRow = existing.data;
    if (!profileRow) {
      return json({ error: "Profile not found" }, 404);
    }

    const reviewerState = String((profileRow as { is_reviewer?: string | null }).is_reviewer ?? "").trim();
    if (reviewerState !== "approved") {
      const msg =
        reviewerState === "pending"
          ? "Stripe Connect opens after your reviewer application is approved."
          : "Only approved reviewers can connect Stripe payouts.";
      return json({ error: msg }, 400);
    }

    let connectAccountId = profileRow.stripe_connect_account_id as string | undefined;
    if (!connectAccountId) {
      const platformCountry =
        (Deno.env.get("STRIPE_CONNECT_DEFAULT_COUNTRY") || "US").trim().toUpperCase() || "US";
      const acct = await stripe.accounts.create({
        type: "express",
        country: platformCountry,
        email: (profileRow as { email?: string | null }).email || undefined,
        capabilities: {
          transfers: { requested: true },
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
      const { error: updErr } = await admin
        .from("profiles")
        .update({ stripe_connect_account_id: connectAccountId })
        .eq("id", reviewerId);
      if (updErr) {
        return json({ error: updErr.message }, 400);
      }
    }

    const siteBase = siteOrigin();
    const { successUrl, refreshUrl } = resolveStripeRedirectUrls(siteBase, returnUrl);

    const link = await stripe.accountLinks.create({
      account: connectAccountId!,
      type: "account_onboarding",
      return_url: successUrl,
      refresh_url: refreshUrl,
    });
    return json({ url: link.url, accountId: connectAccountId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});
