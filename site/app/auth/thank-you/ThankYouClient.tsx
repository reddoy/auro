"use client";

import Link from "next/link";
import { useIosSourceFlag } from "@/hooks/useIosSourceFlag";

const requestLinkStyle = {
  backgroundImage: "linear-gradient(90deg,#FF6F00,#FF2D55)",
};

function RequestLink({ children }: { children: React.ReactNode }) {
  const isIosSource = useIosSourceFlag();
  const iosMessage =
    "Purchases are unavailable inside the iOS in-app browser. Please open this link in Safari or on desktop.";

  if (isIosSource) {
    return (
      <div className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold border border-white/30 bg-white/5 text-center text-sm">
        {iosMessage}
      </div>
    );
  }

  return (
    <Link href="/request" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
      {children}
    </Link>
  );
}

export default function ThankYouClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <div className="text-6xl mb-6">🎉</div>
          
          <h1 className="text-white text-2xl font-semibold mb-3">Email Confirmed! 🎉</h1>
          <p className="text-[#C7BFD9] mt-2 mb-6">
            Thank you for confirming your email. You're all set! Continue on Auro web or mobile web.
          </p>

          <RequestLink>Request a review</RequestLink>
          
          <div className="mt-6 grid grid-cols-1 gap-3 w-full">
            <Link 
              href="https://app.appauro.com" 
              className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" 
              style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Open Auro Web App
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

