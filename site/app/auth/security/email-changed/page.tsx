import Link from "next/link";

export default function EmailChangedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-white text-2xl font-semibold mb-2">Email Address Changed</h1>
          <p className="text-white/70 mb-6">
            Your email address has been successfully changed. If you didn't make this change, please contact support immediately.
          </p>
          <Link href="/request" className="inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "#F26955" }}>
            Continue to App
          </Link>
        </div>
      </div>
    </div>
  );
}

