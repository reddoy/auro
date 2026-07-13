import { requireAdmin } from '@/lib/admin-server';
import { formatDisplayName } from '@/lib/admin-display';
import type { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = new Set([
  'pending',
  'paid',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
  'timeout',
  'refunded',
]);

const PROFILE_SUMMARY =
  'id, email, username, first_name, last_name, avatar_url, preferences';

type ProfileSummary = {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferences: unknown;
};

type RequestRow = {
  id: string;
  status: string;
  payment_status: string | null;
  amount_cents: number | null;
  created_at: string;
  photos: string[] | null;
  user_id: string;
  influencer_id: string;
};

function summarizeParticipant(p: ProfileSummary | undefined) {
  if (!p) return null;
  return {
    id: p.id,
    email: p.email,
    username: p.username,
    displayName: formatDisplayName(p),
  };
}

async function loadProfilesById(
  admin: SupabaseClient,
  ids: string[]
): Promise<Map<string, ProfileSummary>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await admin.from('profiles').select(PROFILE_SUMMARY).in('id', unique);
  if (error) {
    console.error('[admin/requests] profile batch load failed:', error);
    return new Map();
  }

  return new Map((data || []).map((p) => [p.id as string, p as ProfileSummary]));
}

async function findProfileIdsBySearch(admin: SupabaseClient, q: string): Promise<string[]> {
  const escaped = q.trim().replace(/"/g, '\\"');
  const term = `"%${escaped}%"`;
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .or(
      [
        `email.ilike.${term}`,
        `username.ilike.${term}`,
        `first_name.ilike.${term}`,
        `last_name.ilike.${term}`,
        `id.ilike.${term}`,
      ].join(',')
    )
    .limit(50);

  if (error) {
    console.error('[admin/requests] profile search failed:', error);
    return [];
  }
  return (data || []).map((r) => r.id as string);
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify(gate.body), {
      status: gate.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status') || '';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

  if (status && !VALID_STATUSES.has(status)) {
    return new Response(
      JSON.stringify({ error: `Invalid status. Use one of: ${[...VALID_STATUSES].join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let query = gate.admin
      .from('requests')
      .select(
        'id, status, payment_status, amount_cents, created_at, photos, user_id, influencer_id',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (q) {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q) ||
        (q.length >= 8 && /^[0-9a-f-]+$/i.test(q));

      if (isUuid) {
        if (q.length === 36) {
          query = query.eq('id', q);
        } else {
          query = query.ilike('id', `${q}%`);
        }
      } else {
        const profileIds = await findProfileIdsBySearch(gate.admin, q);
        if (profileIds.length === 0) {
          return new Response(
            JSON.stringify({ requests: [], count: 0, limit, offset }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
          );
        }
        const idList = profileIds.join(',');
        query = query.or(`user_id.in.(${idList}),influencer_id.in.(${idList})`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin/requests]', error);
      return new Response(JSON.stringify({ error: 'Failed to load requests', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rows = (data || []) as RequestRow[];
    const profileIds = rows.flatMap((r) => [r.user_id, r.influencer_id]);
    const profilesById = await loadProfilesById(gate.admin, profileIds);

    const requests = rows.map((row) => ({
      id: row.id,
      status: row.status,
      payment_status: row.payment_status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      photo_count: row.photos?.length ?? 0,
      reviewee: summarizeParticipant(profilesById.get(row.user_id)),
      reviewer: summarizeParticipant(profilesById.get(row.influencer_id)),
    }));

    return new Response(JSON.stringify({ requests, count: count ?? requests.length, limit, offset }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('[admin/requests]', e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
