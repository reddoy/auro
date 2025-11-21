import Link from "next/link";
import { hasIosSourceFlag } from "@/lib/ios-source";

export default function MfaAddedPage() {
  const iosBlocked = hasIosSourceFlag();
  const iosMessage =
    "Checkout and account changes are unavailable in the iOS in-app browser. Please reopen appauro.com in Safari or on desktop.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-white text-2xl font-semibold mb-2">Multi-Factor Authentication Added</h1>
          <p className="text-[#C7BFD9] mb-6">
            A new multi-factor authentication method has been added to your account. If you didn't make this change, please contact support immediately.
          </p>
          {iosBlocked ? (
            <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80">
              {iosMessage}
            </div>
          ) : (
            <Link href="/request" className="inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)" }}>
              Continue to App
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

