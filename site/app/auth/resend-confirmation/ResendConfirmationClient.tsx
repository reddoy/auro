"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AUTH_EMAIL_RATE_LIMIT_MESSAGE, isAuthEmailRateLimitError } from "@/lib/auth-messages";

export default function ResendConfirmationClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const q = searchParams.get("email");
    if (q) setEmail(q);
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send confirmation email");
      }

      setSent(true);
    } catch (err: any) {
      if (isAuthEmailRateLimitError(err)) {
        setError(AUTH_EMAIL_RATE_LIMIT_MESSAGE);
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          {!sent ? (
            <>
              <h1 className="text-white text-2xl font-semibold mb-2">Resend Confirmation Email</h1>
              <p className="text-white/70 mb-6">
                Enter your email address and we'll send you a new confirmation link.
              </p>

              <form onSubmit={handleSubmit} className="w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#2C1746] border border-[rgba(255,255,255,0.1)] text-white placeholder-[rgba(255,255,255,0.72)] focus:outline-none focus:border-[#F26955] mb-4"
                />

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl px-5 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundImage: loading ? "none" : "#F26955" }}
                >
                  {loading ? "Sending..." : "Resend Confirmation Email"}
                </button>
              </form>

              <Link href="/auth/sign-in" className="mt-4 text-white/70 text-sm hover:text-white">
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white text-2xl font-semibold mb-2">Check your email</h1>
              <p className="text-white/70 mb-6">
                We've sent a confirmation link to <strong className="text-white">{email}</strong>. 
                Click the link in the email to confirm your account.
              </p>
              <Link href="/auth/sign-in" className="inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "#F26955" }}>
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

