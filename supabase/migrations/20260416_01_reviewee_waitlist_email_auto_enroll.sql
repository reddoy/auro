-- Expand reviewee waitlist so account signups can be auto-enrolled by email.
-- Phone remains optional for SMS notifications.

alter table public.reviewee_waitlist
  alter column phone_number drop not null;

alter table public.reviewee_waitlist
  add column if not exists user_id uuid null,
  add column if not exists email text null,
  add column if not exists full_name text null,
  add column if not exists sms_opt_in boolean not null default false;

-- Existing phone signups implicitly opted into SMS.
update public.reviewee_waitlist
set sms_opt_in = true
where phone_number is not null;

-- Ensure every record has at least one contact method.
alter table public.reviewee_waitlist
  drop constraint if exists reviewee_waitlist_contact_check;

alter table public.reviewee_waitlist
  add constraint reviewee_waitlist_contact_check
  check (phone_number is not null or email is not null);

-- Keep phone uniqueness behavior and add idempotency keys for account signups.
create unique index if not exists idx_reviewee_waitlist_user_id_unique
  on public.reviewee_waitlist (user_id)
  where user_id is not null;

create unique index if not exists idx_reviewee_waitlist_email_unique
  on public.reviewee_waitlist (lower(email))
  where email is not null;
