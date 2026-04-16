"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const requestLinkStyle = {
  backgroundColor: "#F26955",
};

function RequestLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/waitlist" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
      {children}
    </Link>
  );
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHash = params.get("token_hash");
  /** PKCE email / magic links often arrive with `code` instead of `token_hash`. */
  const code = params.get("code");
  const type = params.get("type");
  const email = params.get("email");
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

  const effectiveType = type ?? hashParams?.type ?? null;
  const effectiveCode = code ?? hashParams?.code ?? null;
  const effectiveTokenHash = tokenHash ?? hashParams?.tokenHash ?? null;
  const accessToken = hashParams?.accessToken ?? null;
  const refreshToken = hashParams?.refreshToken ?? null;

  const isSignup = useMemo(() => effectiveType === "signup", [effectiveType]);
  const isInvite = useMemo(() => effectiveType === "invite", [effectiveType]);
  /** Legacy email links may still use type=magiclink in the URL; we verify but do not expose that name in the UI. */
  const isMagicLink = useMemo(() => effectiveType === "magiclink", [effectiveType]);
  const isEmailChange = useMemo(() => effectiveType === "email_change", [effectiveType]);
  const isReauthentication = useMemo(() => effectiveType === "reauthentication", [effectiveType]);
  const isRecovery = useMemo(() => effectiveType === "recovery", [effectiveType]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) {
      setHashParsed(true);
      return;
    }

    const hashSearchParams = new URLSearchParams(hash);
    const parsed = {
      code: hashSearchParams.get("code"),
      tokenHash: hashSearchParams.get("token_hash"),
      type: hashSearchParams.get("type"),
      accessToken: hashSearchParams.get("access_token"),
      refreshToken: hashSearchParams.get("refresh_token"),
      errorDescription: hashSearchParams.get("error_description") ?? hashSearchParams.get("error"),
    };

    setHashParams(parsed);
    if (parsed.errorDescription) {
      setStatus("error");
      setMessage(parsed.errorDescription);
    }
    setHashParsed(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!hashParsed) return;

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
      setIsConfirming(true);
      try {
        if (effectiveCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(effectiveCode);
          if (error) {
            setStatus("error");
            setMessage(error.message || "Unable to verify your email.");
          } else if (isSignup || isInvite) {
            router.replace("/auth/thank-you");
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
          } else if (isSignup || isInvite) {
            router.replace("/auth/thank-you");
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
            router.replace("/auth/thank-you");
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
  }, [effectiveCode, effectiveTokenHash, accessToken, refreshToken, effectiveType, hashParsed, isSignup, isInvite, isMagicLink, isEmailChange, isReauthentication, isRecovery, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <img src="/auro_aura_logo_nobg.png" alt="Auro" className="h-10 mb-3 opacity-90" style={{ display: "none" }} />

          {isConfirming && (
            <>
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-[#F26955] border-t-transparent mb-3" />
              <h1 className="text-white text-xl font-semibold">Confirming your email…</h1>
              <p className="text-white/70 mt-2">Please wait while we verify your address.</p>
            </>
          )}

          {!isConfirming && status === "success" && (
            <>
              {isSignup && (
                <>
                  <h1 className="text-white text-2xl font-semibold">Email confirmed! 🎉</h1>
                  <p className="text-white/70 mt-2">{email ? `Verified ${email}.` : "You're all set."} Choose a next step below.</p>
                  <RequestLink>Request a review</RequestLink>
                  <div className="mt-3 grid grid-cols-1 gap-3 w-full">
                    <Link href="/waitlist" className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}>Join review waitlist</Link>
                  </div>
                </>
              )}
              {isInvite && (
                <>
                  <h1 className="text-white text-2xl font-semibold">Welcome to Auro! 🎉</h1>
                  <p className="text-white/70 mt-2">Your invitation has been confirmed. You can now sign up for an account.</p>
                <RequestLink>Get Started</RequestLink>
                </>
              )}
              {isMagicLink && (
                <>
                  <h1 className="text-white text-2xl font-semibold">Signed in successfully! ✅</h1>
                  <p className="text-white/70 mt-2">You&apos;re all set.</p>
                  <RequestLink>Continue to App</RequestLink>
                </>
              )}
              {isEmailChange && (
                <>
                  <h1 className="text-white text-2xl font-semibold">Email address updated! ✅</h1>
                  <p className="text-white/70 mt-2">{email ? `Your email has been changed to ${email}.` : "Your email address has been successfully updated."}</p>
                  <RequestLink>Continue to App</RequestLink>
                </>
              )}
              {isReauthentication && (
                <>
                  <h1 className="text-white text-2xl font-semibold">Re-authentication successful! ✅</h1>
                  <p className="text-white/70 mt-2">You've successfully verified your identity. You can now proceed with the action.</p>
                  <RequestLink>Continue to App</RequestLink>
                </>
              )}
            </>
          )}

          {!isConfirming && status === "error" && (
            <>
              <h1 className="text-white text-2xl font-semibold">We couldn't confirm your email</h1>
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
          )}

          {!isConfirming && status === "pending" && (
            <>
              <h1 className="text-white text-2xl font-semibold">Confirm your email</h1>
              <p className="text-white/70 mt-2">We sent a verification link{email ? ` to ${email}` : ""}. Click it to continue.</p>
              <Link href="/waitlist" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
                Join review waitlist
              </Link>
            </>
          )}
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


