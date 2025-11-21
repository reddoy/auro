"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function InviteClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // User must be authenticated to invite
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be signed in to invite users");
      }

      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
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
              <h1 className="text-white text-2xl font-semibold mb-2">Invite User</h1>
              <p className="text-[#C7BFD9] mb-6">
                Enter an email address to send an invitation to sign up for Auro.
              </p>

              <form onSubmit={handleSubmit} className="w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#2C1746] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#C7BFD9] focus:outline-none focus:border-[#FF2D55] mb-4"
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
                  style={{ backgroundImage: loading ? "none" : "linear-gradient(90deg,#FF6F00,#FF2D55)" }}
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </button>
              </form>

              <Link href="/auth/callback" className="mt-4 text-[#C7BFD9] text-sm hover:text-white">
                Cancel
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-white text-2xl font-semibold mb-2">Invitation sent</h1>
              <p className="text-[#C7BFD9] mb-6">
                We've sent an invitation to <strong className="text-white">{email}</strong>. 
                They'll receive an email with instructions to sign up.
              </p>
              <Link href="/auth/callback" className="inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)" }}>
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

