'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAppInboxData } from '@/lib/fetch-app-inbox';

export const APP_INBOX_QUERY_KEY = ['app-inbox'] as const;

export function useAppInboxQuery() {
  return useQuery({
    queryKey: APP_INBOX_QUERY_KEY,
    queryFn: fetchAppInboxData,
    staleTime: 45_000,
    gcTime: 6 * 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
