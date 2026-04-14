'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastCtx = {
  showToast: (message: string, durationMs?: number) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useAppToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useAppToast must be used within AppToastProvider');
  }
  return v;
}

/** Safe when provider may be absent (e.g. tests). */
export function useAppToastOptional(): ToastCtx | null {
  return useContext(Ctx);
}

export default function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, durationMs = 2600) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), durationMs);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {message ? (
        <div
          className="fixed left-1/2 z-[70] max-w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-white/15 bg-[#1a0f2e]/95 px-4 py-2.5 text-center text-sm text-white shadow-lg backdrop-blur-md motion-reduce:transition-none"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
          role="status"
        >
          {message}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}
