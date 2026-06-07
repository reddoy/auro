import FunnelTopBar from '@/components/FunnelTopBar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FunnelTopBar variant="auth" />
      {children}
    </>
  );
}
