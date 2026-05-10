import { Suspense } from "react";
import StripeConnectRefreshClient from "./StripeConnectRefreshClient";

export default function StripeConnectRefreshPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#1A0B2E] px-4">
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{ backgroundColor: "#24123B", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#F26955] border-t-transparent" />
              <p className="text-white/70">Loading…</p>
            </div>
          </div>
        </div>
      }
    >
      <StripeConnectRefreshClient />
    </Suspense>
  );
}
