"use client";

import Link from "next/link";

const requestLinkStyle = {
  backgroundColor: "#F26955",
};

function RequestLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/" className="mt-5 inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={requestLinkStyle}>
      {children}
    </Link>
  );
}

export default function ThankYouClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <img
            src="/rohan%20headshot%20backyard-min.jpg"
            alt="RJ, founder of Auro"
            width={88}
            height={88}
            className="mb-5 h-[88px] w-[88px] rounded-full object-cover ring-2 ring-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/rohan-headshot.jpg";
            }}
          />
          <h1 className="text-white text-2xl font-semibold mb-3">You are on the list</h1>
          <p className="text-white/70 mt-2 mb-6 leading-relaxed">
            Thanks for signing up. I will notify you once reviewers are open for business.
          </p>

          <RequestLink>Back to home</RequestLink>

          <div className="mt-6 grid grid-cols-1 gap-3 w-full">
            <Link 
              href="/reviewers/apply" 
              className="block w-full rounded-2xl px-5 py-3 text-center font-semibold" 
              style={{ color: "#EDE8F7", backgroundColor: "#2C1746", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Interested in becoming a reviewer? Apply now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

