import Link from "next/link";

export default function IdentityUnlinkedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4">
      <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-white text-2xl font-semibold mb-2">Identity Unlinked</h1>
          <p className="text-white/70 mb-6">
            An identity has been unlinked from your account. If you didn't make this change, please contact support immediately.
          </p>
          <Link href="/app" className="inline-block rounded-2xl px-5 py-3 text-white font-semibold" style={{ backgroundImage: "#F26955" }}>
            Continue to App
          </Link>
        </div>
      </div>
    </div>
  );
}

