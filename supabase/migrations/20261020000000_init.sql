-- CAPACITI Online Register & WFH — initial schema
-- Security model: RLS on every table; candidates never write attendance/WFH rows
-- directly — all state transitions go through SECURITY DEFINER functions that
-- use auth.uid() and the database clock.

-- ─────────────────────────────────────────────────────────────── types
create type public.app_role as enum ('candidate', 'mentor');  -- add 'admin' later: alter type ... add value
create type public.work_mode as enum ('office', 'wfh');
create type public.wfh_status as enum ('pending', 'approved', 'rejected');

-- ─────────────────────────────────────────────────────────────── helpers
create or replace function public.sast_today() returns date
language sql stable as $$ select (now() at time zone 'Africa/Johannesburg')::date $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ─────────────────────────────────────────────────────────────── profiles
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text not null check (char_length(trim(full_name)) between 2 and 120),
  email                text not null unique,
  phone                text check (phone is null or phone ~ '^[0-9 +()-]{7,20}$'),
  role                 public.app_role not null default 'candidate',
  candidate_identifier text unique,
  cohort               text,
  mentor_id            uuid references public.profiles (id) on delete set null,
  status               text not null default 'active' check (status in ('active', 'inactive')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint mentor_not_self check (mentor_id is distinct from id)
);
create index profiles_mentor_idx on public.profiles (mentor_id);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role/assignment lookups used by RLS. SECURITY DEFINER avoids RLS recursion on profiles.
create or replace function public.current_role_is(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r and status = 'active')
$$;

create or replace function public.is_my_candidate(candidate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles c
    where c.id = candidate and c.mentor_id = auth.uid() and public.current_role_is('mentor')
  )
$$;

create or replace function public.my_mentor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select mentor_id from profiles where id = auth.uid()
$$;

-- New auth user → candidate profile. Role is NEVER read from user metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────── attendance
create table public.attendance_records (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null references public.profiles (id) on delete cascade,
  attendance_date date not null,
  work_mode       public.work_mode not null,
  location_note   text check (char_length(location_note) <= 120),
  notes           text check (char_length(notes) <= 500),
  check_in_at     timestamptz not null,
  check_out_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (candidate_id, attendance_date),
  constraint checkout_after_checkin check (check_out_at is null or check_out_at > check_in_at)
);
create index attendance_date_idx on public.attendance_records (attendance_date desc);
create trigger attendance_updated before update on public.attendance_records
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────── WFH requests
-- One date per request. Ranges later: add end_date + exclusion constraint.
create table public.wfh_requests (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid not null references public.profiles (id) on delete cascade,
  requested_date   date not null,
  reason           text not null check (reason in
                     ('Transport disruption', 'Medical appointment', 'Family responsibility',
                      'Home internet installation', 'Other')),
  details          text check (char_length(details) <= 1000),
  status           public.wfh_status not null default 'pending',
  submitted_at     timestamptz not null default now(),
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  decision_comment text check (char_length(decision_comment) <= 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint other_needs_details check (reason <> 'Other' or char_length(trim(coalesce(details, ''))) >= 5),
  constraint decision_consistent check (
    (status = 'pending'  and reviewed_by is null and reviewed_at is null) or
    (status <> 'pending' and reviewed_by is not null and reviewed_at is not null)),
  constraint rejection_has_comment check (status <> 'rejected' or char_length(trim(coalesce(decision_comment, ''))) >= 3)
);
-- A rejected request frees the date; pending/approved ones block duplicates.
create unique index wfh_one_active_per_day on public.wfh_requests (candidate_id, requested_date)
  where status <> 'rejected';
create index wfh_status_idx on public.wfh_requests (status, requested_date);
create trigger wfh_updated before update on public.wfh_requests
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────── audit + notifications
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  details    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_entity_idx on public.audit_logs (entity, entity_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Profile role/assignment changes are audited no matter who makes them (incl. service role).
create or replace function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role, new.mentor_id, new.status, new.cohort, new.candidate_identifier)
     is distinct from (old.role, old.mentor_id, old.status, old.cohort, old.candidate_identifier) then
    insert into audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'profile.sensitive_update', 'profiles', new.id, jsonb_build_object(
      'before', jsonb_build_object('role', old.role, 'mentor_id', old.mentor_id, 'status', old.status,
                                   'cohort', old.cohort, 'candidate_identifier', old.candidate_identifier),
      'after',  jsonb_build_object('role', new.role, 'mentor_id', new.mentor_id, 'status', new.status,
                                   'cohort', new.cohort, 'candidate_identifier', new.candidate_identifier)));
  end if;
  return new;
end $$;
create trigger profiles_audit after update on public.profiles
  for each row execute function public.audit_profile_change();

-- ─────────────────────────────────────────────────────────────── RPCs (trusted operations)
create or replace function public.check_in(p_work_mode public.work_mode, p_location text default null, p_notes text default null)
returns public.attendance_records
language plpgsql security definer set search_path = public as $$
declare rec attendance_records;
begin
  if not current_role_is('candidate') then raise exception 'Only active candidates can register attendance' using errcode = '42501'; end if;
  begin
    insert into attendance_records (candidate_id, attendance_date, work_mode, location_note, notes, check_in_at)
    values (auth.uid(), sast_today(), p_work_mode, nullif(trim(p_location), ''), nullif(trim(p_notes), ''), now())
    returning * into rec;
  exception when unique_violation then
    raise exception 'You have already checked in today' using errcode = 'P0001';
  end;
  return rec;
end $$;

create or replace function public.check_out() returns public.attendance_records
language plpgsql security definer set search_path = public as $$
declare rec attendance_records;
begin
  if not current_role_is('candidate') then raise exception 'Only active candidates can register attendance' using errcode = '42501'; end if;
  update attendance_records set check_out_at = now()
   where candidate_id = auth.uid() and attendance_date = sast_today() and check_out_at is null
  returning * into rec;
  if rec.id is null then
    if exists (select 1 from attendance_records where candidate_id = auth.uid() and attendance_date = sast_today()) then
      raise exception 'You have already checked out today' using errcode = 'P0001';
    end if;
    raise exception 'Check in before checking out' using errcode = 'P0001';
  end if;
  return rec;
end $$;

create or replace function public.submit_wfh_request(p_date date, p_reason text, p_details text default null)
returns public.wfh_requests
language plpgsql security definer set search_path = public as $$
declare rec wfh_requests; mentor uuid;
begin
  if not current_role_is('candidate') then raise exception 'Only active candidates can request WFH' using errcode = '42501'; end if;
  if p_date is null or p_date < sast_today() then raise exception 'Choose today or a future date' using errcode = 'P0001'; end if;
  if p_date > sast_today() + 90 then raise exception 'Requests can be made up to 90 days ahead' using errcode = 'P0001'; end if;
  if extract(isodow from p_date) > 5 then raise exception 'WFH requests are for weekdays only' using errcode = 'P0001'; end if;
  begin
    insert into wfh_requests (candidate_id, requested_date, reason, details)
    values (auth.uid(), p_date, p_reason, nullif(trim(p_details), ''))
    returning * into rec;
  exception when unique_violation then
    raise exception 'You already have a pending or approved request for that date' using errcode = 'P0001';
  end;
  insert into audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'wfh.submitted', 'wfh_requests', rec.id, jsonb_build_object('date', p_date, 'reason', p_reason));
  mentor := my_mentor_id();
  if mentor is not null then
    insert into notifications (user_id, title, body, link)
    select mentor, 'New WFH request', full_name || ' requested WFH for ' || to_char(p_date, 'Dy, DD Mon YYYY'), '/mentor/wfh'
      from profiles where id = auth.uid();
  end if;
  return rec;
end $$;

-- Atomic decision: the WHERE status = 'pending' guard means a second decision can never overwrite the first.
create or replace function public.decide_wfh_request(p_id uuid, p_decision public.wfh_status, p_comment text default null)
returns public.wfh_requests
language plpgsql security definer set search_path = public as $$
declare rec wfh_requests;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'Decision must be approved or rejected' using errcode = 'P0001'; end if;
  if p_decision = 'rejected' and char_length(trim(coalesce(p_comment, ''))) < 3 then
    raise exception 'A reason is required when rejecting' using errcode = 'P0001';
  end if;
  update wfh_requests r
     set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
         decision_comment = nullif(trim(p_comment), '')
   where r.id = p_id and r.status = 'pending' and is_my_candidate(r.candidate_id)
  returning * into rec;
  if rec.id is null then
    if exists (select 1 from wfh_requests where id = p_id and is_my_candidate(candidate_id)) then
      raise exception 'This request has already been decided' using errcode = 'P0001';
    end if;
    raise exception 'Request not found or not assigned to you' using errcode = '42501';
  end if;
  insert into audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'wfh.' || p_decision, 'wfh_requests', rec.id, jsonb_build_object('comment', rec.decision_comment));
  insert into notifications (user_id, title, body, link)
  values (rec.candidate_id, 'WFH request ' || p_decision,
          'Your request for ' || to_char(rec.requested_date, 'Dy, DD Mon YYYY') || ' was ' || p_decision ||
          coalesce(': ' || rec.decision_comment, '.'), '/candidate/wfh');
  return rec;
end $$;

-- ─────────────────────────────────────────────────────────────── views (security_invoker → RLS of caller applies)
create view public.attendance_overview with (security_invoker = true) as
select a.*, p.full_name, p.candidate_identifier, p.cohort, p.mentor_id,
       round(extract(epoch from (a.check_out_at - a.check_in_at)) / 3600.0, 2) as hours,
       exists (select 1 from wfh_requests w where w.candidate_id = a.candidate_id
                 and w.requested_date = a.attendance_date and w.status = 'approved') as wfh_approved
  from attendance_records a join profiles p on p.id = a.candidate_id;

create view public.wfh_overview with (security_invoker = true) as
select w.*, p.full_name, p.candidate_identifier, p.cohort, p.mentor_id, rv.full_name as reviewer_name
  from wfh_requests w
  join profiles p on p.id = w.candidate_id
  left join profiles rv on rv.id = w.reviewed_by;

-- ─────────────────────────────────────────────────────────────── RLS
alter table public.profiles           enable row level security;
alter table public.attendance_records enable row level security;
alter table public.wfh_requests       enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.notifications      enable row level security;

create policy "profiles: self, my mentor, my candidates" on public.profiles for select to authenticated
  using (id = auth.uid() or id = my_mentor_id() or is_my_candidate(id));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "attendance: own or my candidates" on public.attendance_records for select to authenticated
  using (candidate_id = auth.uid() or is_my_candidate(candidate_id));

create policy "wfh: own or my candidates" on public.wfh_requests for select to authenticated
  using (candidate_id = auth.uid() or is_my_candidate(candidate_id));

create policy "audit: mentors read logs about their candidates' requests" on public.audit_logs for select to authenticated
  using (actor_id = auth.uid() or (entity = 'wfh_requests' and exists
         (select 1 from wfh_requests w where w.id = entity_id and is_my_candidate(w.candidate_id))));

create policy "notifications: own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────── grants (column-level = what users may edit)
revoke all on public.profiles, public.attendance_records, public.wfh_requests,
              public.audit_logs, public.notifications from anon, authenticated;
revoke all on public.attendance_overview, public.wfh_overview from anon, authenticated;

grant select on public.profiles, public.attendance_records, public.wfh_requests,
                public.audit_logs, public.notifications,
                public.attendance_overview, public.wfh_overview to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.check_in(public.work_mode, text, text), public.check_out(),
  public.submit_wfh_request(date, text, text), public.decide_wfh_request(uuid, public.wfh_status, text),
  public.sast_today(), public.current_role_is(public.app_role), public.is_my_candidate(uuid),
  public.my_mentor_id() to authenticated;
