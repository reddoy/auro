'use client';

import AppShell from './AppShell';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
