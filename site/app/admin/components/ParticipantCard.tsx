'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ParticipantInfo = {
  id: string;
  email: string | null;
  phone?: string | null;
  username: string | null;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  is_reviewer?: string | null;
  stripe_connect_account_id?: string | null;
  profileUrl?: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ParticipantCard({
  label,
  participant,
}: {
  label: string;
  participant: ParticipantInfo | null;
}) {
  if (!participant) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
        <p className="mt-3 text-sm text-white/45">Not available</p>
      </div>
    );
  }

  const p = participant;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{label}</p>

      <div className="mt-4 flex gap-4">
        {p.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatarUrl}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-sm font-semibold text-white ring-1 ring-white/10">
            {initials(p.displayName)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-white">{p.displayName}</h3>

          {p.email ? (
            <a
              href={`mailto:${p.email}`}
              className="block truncate text-sm text-primary hover:underline"
            >
              {p.email}
            </a>
          ) : (
            <p className="text-sm text-white/35">No email</p>
          )}

          {p.phone ? (
            <a href={`tel:${p.phone}`} className="block text-sm text-white/70 hover:text-white">
              {p.phone}
            </a>
          ) : (
            <p className="text-sm text-white/35">No phone on file</p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
            {p.username ? <span>@{p.username}</span> : null}
            {p.profileUrl ? (
              <Link
                href={p.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Public profile
              </Link>
            ) : null}
          </div>

          {p.is_reviewer === 'approved' ? (
            <span className="inline-flex rounded-full bg-emerald-400/12 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/20">
              Reviewer
            </span>
          ) : null}

          {p.stripe_connect_account_id ? (
            <p className="truncate text-xs text-white/40" title={p.stripe_connect_account_id}>
              Stripe: {p.stripe_connect_account_id}
            </p>
          ) : null}
        </div>
      </div>

      {p.bio ? (
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-white/75">{p.bio}</p>
      ) : null}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value)}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] px-2 py-1 text-xs font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.08]'
      )}
      title="Copy"
    >
      {label || value.slice(0, 8) + '…'}
      <span className="text-white/35">Copy</span>
    </button>
  );
}
