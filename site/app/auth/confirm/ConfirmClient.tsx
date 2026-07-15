"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const requestLinkStyle = {
  backgroundColor: "#F26955",
};

function parseHashFragment(raw: string) {
  if (!raw?.trim()) return null;
  const body = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!body) return null;
  const searchParams = new URLSearchParams(body);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("error");
  return {
    code,
    tokenHash,
    type: typeParam,
    accessToken,
    refreshToken,
    errorDescription,
  };
}

function RequestLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
      {children}
    </Link>
  );
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHashFromQuery = params.get("token_hash");
  /** PKCE email / magic links often arrive with `code` instead of `token_hash`. */
  const codeFromQuery = params.get("code");
  const typeFromQuery = params.get("type");
  const email = params.get("email");
  const roleIntent = params.get("role_intent");
  const [hashParams, setHashParams] = useState<{
    code: string | null;
    tokenHash: string | null;
    type: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    errorDescription: string | null;
  } | null>(null);
  const [hashParsed, setHashParsed] = useState(false);

  const [isConfirming, setIsConfirming] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string>("");

  const effectiveType = typeFromQuery ?? hashParams?.type ?? null;
  const effectiveCode = codeFromQuery ?? hashParams?.code ?? null;
  const effectiveTokenHash = tokenHashFromQuery ?? hashParams?.tokenHash ?? null;
  const accessToken = hashParams?.accessToken ?? null;
  const refreshToken = hashParams?.refreshToken ?? null;

  const hasVerificationPayload =
    !!(effectiveCode || effectiveTokenHash || (accessToken && refreshToken));

  const verificationRanRef = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const qErr =
      searchParams.get("error_description") ?? searchParams.get("error");
    const qCode = searchParams.get("code");
    const qTokenHash = searchParams.get("token_hash");
    if (qErr?.trim()) {
      setStatus("error");
      setMessage(qErr);
    } else if (qCode?.trim() || qTokenHash?.trim()) {
      setIsConfirming(true);
    }

    const parsed = parseHashFragment(window.location.hash || "");
    if (
      parsed &&
      (parsed.code || parsed.tokenHash || parsed.accessToken || parsed.refreshToken || parsed.errorDescription)
    ) {
      setHashParams(parsed);
      if (parsed.errorDescription) {
        setStatus("error");
        setMessage(parsed.errorDescription);
      } else if (parsed.code || parsed.tokenHash || (parsed.accessToken && parsed.refreshToken)) {
        setIsConfirming(true);
      }
    }
    setHashParsed(true);
  }, []);

  const isSignup = useMemo(() => effectiveType === "signup", [effectiveType]);
  const isInvite = useMemo(() => effectiveType === "invite", [effectiveType]);
  /** Legacy email links may still use type=magiclink in the URL; we verify but do not expose that name in the UI. */
  const isMagicLink = useMemo(() => effectiveType === "magiclink", [effectiveType]);
  const isEmailChange = useMemo(() => effectiveType === "email_change", [effectiveType]);
  const isReauthentication = useMemo(() => effectiveType === "reauthentication", [effectiveType]);
  const isRecovery = useMemo(() => effectiveType === "recovery", [effectiveType]);
  const postConfirmHref = useMemo(() => {
    if (roleIntent === 'reviewer' || roleIntent === 'reviewee') {
      return `/auth/post-confirm?role_intent=${encodeURIComponent(roleIntent)}`;
    }
    return '/auth/post-confirm';
  }, [roleIntent]);
  const postSignInHref = useMemo(() => {
    if (roleIntent === 'reviewer' || roleIntent === 'reviewee') {
      return `/auth/post-sign-in?role_intent=${encodeURIComponent(roleIntent)}`;
    }
    return '/auth/post-sign-in';
  }, [roleIntent]);

  useEffect(() => {
    const run = async () => {
      if (!hashParsed) return;
      if (verificationRanRef.current) return;

      if (!effectiveCode && !effectiveTokenHash && !(accessToken && refreshToken)) {
        if (effectiveType) {
          setStatus("error");
          setMessage("This confirmation link is incomplete or expired. Please request a new confirmation email.");
        }
        return;
      }
      if (!supabase) {
        setStatus("error");
        setMessage("Supabase client not configured.");
        return;
      }
      verificationRanRef.current = true;
      setIsConfirming(true);
      try {
        if (effectiveCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(effectiveCode);
          if (error) {
            setStatus("error");
            setMessage(error.message || "Unable to verify your email.");
          } else if (isRecovery) {
            router.replace("/auth/reset-password");
            return;
          } else if (isSignup || isInvite) {
            router.replace(postConfirmHref);
            return;
          } else {
            setStatus("success");
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setStatus("error");
            setMessage(error.message || "Unable to verify your email.");
          } else if (isRecovery) {
            router.replace("/auth/reset-password");
            return;
          } else if (isSignup || isInvite) {
            router.replace(postConfirmHref);
            return;
          } else {
            setStatus("success");
          }
          return;
        }

        let verifyType: any = "signup";
        if (isSignup || isInvite) verifyType = "signup";
        else if (isMagicLink) verifyType = "magiclink";
        else if (isEmailChange) verifyType = "email_change";
        else if (isReauthentication) verifyType = "reauthentication";
        else if (isRecovery) {
          // For recovery, redirect to reset password page
          router.push(`/auth/reset-password?token_hash=${effectiveTokenHash}&type=recovery`);
          return;
        }

        const { error } = await supabase.auth.verifyOtp({ token_hash: effectiveTokenHash!, type: verifyType });
        if (error) {
          setStatus("error");
          setMessage(error.message || "Unable to verify your email.");
        } else {
          // For signup confirmations, always redirect to thank you page
          // verifyType defaults to "signup" if no type is specified, so this catches all signups
          if (isSignup || isInvite || verifyType === "signup") {
            router.replace(postConfirmHref);
            return;
          }
          setStatus("success");
        }
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Unable to verify your email.");
      } finally {
        setIsConfirming(false);
      }
    };
    run();
  }, [
    effectiveCode,
    effectiveTokenHash,
    accessToken,
    refreshToken,
    effectiveType,
    hashParsed,
    isSignup,
    isInvite,
    isMagicLink,
    isEmailChange,
    isReauthentication,
    isRecovery,
    postConfirmHref,
    router,
  ]);

  const spinner = (
    <>
      <div className="animate-spin h-6 w-6 rounded-full border-2 border-[#F26955] border-t-transparent mb-3" />
      <p className="text-white/70">Loading…</p>
    </>
  );

  const confirmingBlock = (
    <>
      <div className="animate-spin h-6 w-6 rounded-full border-2 border-[#F26955] border-t-transparent mb-3" />
      <h1 className="text-white text-xl font-semibold">Confirming your email…</h1>
      <p className="text-white/70 mt-2">Please wait while we verify your address.</p>
    </>
  );

  let panel: ReactNode;
  if (!hashParsed) {
    panel = spinner;
  } else if (isConfirming) {
    panel = confirmingBlock;
  } else if (status === "success") {
    panel = (
      <>
        {isSignup && (
          <>
            <h1 className="text-white text-2xl font-semibold">Email confirmed!</h1>
            <p className="text-white/70 mt-2">
              {email ? `Verified ${email}.` : "You're all set."} Choose a next step below.
            </p>
            <RequestLink href={postSignInHref}>Continue to app</RequestLink>
            <div className="mt-3 grid grid-cols-1 gap-3 w-full">
              <Link
                href="/request"
                className="block w-full rounded-2xl px-5 py-3 text-center font-semibold"
                style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Request a review
              </Link>
            </div>
          </>
        )}
        {isInvite && (
          <>
            <h1 className="text-white text-2xl font-semibold">Welcome to Auro</h1>
            <p className="text-white/70 mt-2">Your invitation has been confirmed. You can now sign up for an account.</p>
            <RequestLink href={postSignInHref}>Get Started</RequestLink>
          </>
        )}
        {isMagicLink && (
          <>
            <h1 className="text-white text-2xl font-semibold">Signed in successfully</h1>
            <p className="text-white/70 mt-2">You&apos;re all set.</p>
            <RequestLink href={postSignInHref}>Continue to App</RequestLink>
          </>
        )}
        {isEmailChange && (
          <>
            <h1 className="text-white text-2xl font-semibold">Email address updated</h1>
            <p className="text-white/70 mt-2">
              {email ? `Your email has been changed to ${email}.` : "Your email address has been successfully updated."}
            </p>
            <RequestLink href={postSignInHref}>Continue to App</RequestLink>
          </>
        )}
        {isReauthentication && (
          <>
            <h1 className="text-white text-2xl font-semibold">Re-authentication successful</h1>
            <p className="text-white/70 mt-2">
              You&apos;ve successfully verified your identity. You can now proceed with the action.
            </p>
            <RequestLink href={postSignInHref}>Continue to App</RequestLink>
          </>
        )}
      </>
    );
  } else if (status === "error") {
    panel = (
      <>
        <h1 className="text-white text-2xl font-semibold">We couldn&apos;t confirm your email</h1>
        <p className="text-white/70 mt-2">{message || "The link may have expired or been used already."}</p>
        {(isSignup || isInvite) && (
          <Link
            href={`/auth/resend-confirmation${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold"
            style={requestLinkStyle}
          >
            Resend confirmation email
          </Link>
        )}
        <Link href="/" className="mt-3 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
          Back to home
        </Link>
      </>
    );
  } else if (hasVerificationPayload) {
    panel = confirmingBlock;
  } else {
    panel = (
      <>
        <h1 className="text-white text-2xl font-semibold">Confirm your email</h1>
        <p className="text-white/70 mt-2">
          We sent a verification link{email ? ` to ${email}` : ""}. Click it to continue.
        </p>
        <Link href="/request" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
          Request a review
        </Link>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <img src="/auro_aura_logo_nobg.png" alt="Auro" className="h-10 mb-3 opacity-90" style={{ display: "none" }} />

          {panel}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4"><div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}><div className="flex flex-col items-center text-center"><div className="animate-spin h-6 w-6 rounded-full border-2 border-[#F26955] border-t-transparent mb-3" /><p className="text-white/70">Loading…</p></div></div></div>}>
      <Inner />
    </Suspense>
  );
}


