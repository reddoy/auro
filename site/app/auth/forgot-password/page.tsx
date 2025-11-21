import { Suspense } from "react";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#1A0B2E] px-4"><div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}><div className="flex flex-col items-center text-center"><div className="animate-spin h-6 w-6 rounded-full border-2 border-[#FF2D55] border-t-transparent mb-3" /><p className="text-[#C7BFD9]">Loading…</p></div></div></div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}

