"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ConfirmEmailInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const email = params.get("email");

  const [isConfirming, setIsConfirming] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string>("");

  const isSignup = useMemo(() => type === "signup", [type]);

  useEffect(() => {
    const run = async () => {
      if (!tokenHash || !isSignup) return;
      if (!supabase) {
        setStatus("error");
        setMessage("Supabase client not configured.");
        return;
      }
      setIsConfirming(true);
      try {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" as any });
        if (error) {
          setStatus("error");
          setMessage(error.message || "Unable to verify your email.");
        } else {
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
  }, [tokenHash, isSignup]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Auro" className="h-10 mb-3 opacity-90" style={{ display: "none" }} />

          {isConfirming && (
            <>
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-[#FF2D55] border-t-transparent mb-3" />
              <h1 className="text-white text-xl font-semibold">Confirming your email…</h1>
              <p className="text-[#C7BFD9] mt-2">Please wait while we verify your address.</p>
            </>
          )}

          {!isConfirming && status === "success" && (
            <>
              <h1 className="text-white text-2xl font-semibold">Email confirmed! 🎉</h1>
              <p className="text-[#C7BFD9] mt-2">{email ? `Verified ${email}.` : "You're all set."} Choose a next step below.</p>

              <Link href="/request" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)" }}>
                Request a review
              </Link>

              <div className="mt-3 grid grid-cols-1 gap-3 w-full">
                <a href="https://apps.apple.com/" target="_blank" className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}>Download on the App Store</a>
                <a href="https://play.google.com/store" target="_blank" className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}>Get it on Google Play</a>
                <Link href="/auth/callback" className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}>Open the app</Link>
              </div>
            </>
          )}

          {!isConfirming && status === "error" && (
            <>
              <h1 className="text-white text-2xl font-semibold">We couldn't confirm your email</h1>
              <p className="text-[#C7BFD9] mt-2">{message || "The link may have expired or been used already."}</p>
              <Link href="/" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)" }}>
                Back to home
              </Link>
            </>
          )}

          {!isConfirming && status === "pending" && (
            <>
              <h1 className="text-white text-2xl font-semibold">Confirm your email</h1>
              <p className="text-[#C7BFD9] mt-2">We sent a verification link{email ? ` to ${email}` : ""}. Click it to continue.</p>
              <Link href="/auth/callback" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)" }}>
                Open the app
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4"><div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}><div className="flex flex-col items-center text-center"><div className="animate-spin h-6 w-6 rounded-full border-2 border-[#FF2D55] border-t-transparent mb-3" /><p className="text-[#C7BFD9]">Loading…</p></div></div></div>}>
      <ConfirmEmailInner />
    </Suspense>
  );
}


