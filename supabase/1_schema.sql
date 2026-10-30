-- NIS Skill Tree: database schema, security rules, and functions
-- Run this whole file once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run: functions are replaced; tables are only created if missing.

create extension if not exists pgcrypto;

-- ============ TABLES ============
create table if not exists public.areas (
  id          text primary key,
  name        text not null,
  lead        uuid,
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.people (
  id                    uuid primary key references auth.users(id) on delete cascade,
  username              text not null unique,
  name                  text not null,
  role                  text not null default 'intern' check (role in ('admin','lead','intern')),
  home_area             text references public.areas(id) on delete set null,
  end_date              date,
  active                boolean not null default true,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'areas_lead_fkey') then
    alter table public.areas add constraint areas_lead_fkey foreign key (lead) references public.people(id) on delete set null;
  end if;
end $$;

create table if not exists public.tier_rules (
  area               text not null references public.areas(id) on delete cascade,
  tier               text not null check (tier in ('bronze','silver','gold')),
  electives_needed   int  not null default 2 check (electives_needed >= 0),
  primary key (area, tier)
);

create table if not exists public.skills (
  id           text primary key,
  area         text not null references public.areas(id) on delete cascade,
  tier         text not null check (tier in ('bronze','silver','gold')),
  kind         text not null check (kind in ('req','el','cap')),
  name         text not null,
  description  text not null default '',
  steps        jsonb not null default '[]'::jsonb,
  est_time     text not null default '',
  retired      boolean not null default false,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Who holds what right now
create table if not exists public.certifications (
  person       uuid not null references public.people(id) on delete cascade,
  skill        text not null references public.skills(id) on delete cascade,
  approved_by  uuid references public.people(id) on delete set null,
  at           timestamptz not null default now(),
  source       text not null default 'approval',
  primary key (person, skill)
);

-- Full timestamped history (never edited; used for growth reports and research)
create table if not exists public.events (
  id      bigint generated always as identity primary key,
  person  uuid not null,
  skill   text not null,
  type    text not null check (type in ('earned','removed')),
  at      timestamptz not null default now(),
  by      uuid,
  source  text not null default 'approval'
);
create index if not exists events_person_at on public.events(person, at);

create table if not exists public.requests (
  id           bigint generated always as identity primary key,
  person       uuid not null references public.people(id) on delete cascade,
  skill        text not null references public.skills(id) on delete cascade,
  status       text not null default 'requested' check (status in ('requested','approved','returned','withdrawn')),
  created_at   timestamptz not null default now(),
  reviewer     uuid references public.people(id) on delete set null,
  reviewed_at  timestamptz,
  note         text not null default ''
);
create unique index if not exists one_open_request on public.requests(person, skill) where status = 'requested';

create table if not exists public.interests (
  person  uuid not null references public.people(id) on delete cascade,
  skill   text not null references public.skills(id) on delete cascade,
  primary key (person, skill)
);

create table if not exists public.activity_log (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  actor  uuid,
  text   text not null
);

-- ============ SECURITY: everyone signed in can read; all changes go through the functions below ============
do $$
declare t text;
begin
  foreach t in array array['areas','people','tier_rules','skills','certifications','events','requests','interests','activity_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "signed-in users can read" on public.%I', t);
    execute format('create policy "signed-in users can read" on public.%I for select to authenticated using (true)', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ============ HELPERS ============
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = auth.uid() and active)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people where id = auth.uid() and active and role = 'admin')
$$;

create or replace function public.can_manage_area(p_area text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from areas a join people p on p.id = a.lead
    where a.id = p_area and p.id = auth.uid() and p.active)
$$;

create or replace function public.pname(p_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name from people where id = p_id), 'Someone')
$$;

create or replace function public.log_activity(p_text text) returns void
language sql security definer set search_path = public as $$
  insert into activity_log(actor, text) values (auth.uid(), p_text)
$$;

create or replace function public.capstone_unlocked(p_person uuid, p_area text, p_tier text) returns boolean
language sql stable security definer set search_path = public as $$
  with live as (select id, kind from skills where area = p_area and tier = p_tier and not retired and kind in ('req','el')),
  held as (select l.kind from live l join certifications c on c.skill = l.id and c.person = p_person),
  n as (select
    (select count(*) from live where kind = 'req') as req_total,
    (select count(*) from held where kind = 'req') as req_held,
    (select count(*) from live where kind = 'el')  as el_total,
    (select count(*) from held where kind = 'el')  as el_held,
    coalesce((select electives_needed from tier_rules where area = p_area and tier = p_tier), 2) as need)
  select req_held >= req_total and el_held >= least(need, el_total) and (req_total + least(need, el_total)) > 0 from n
$$;

-- Internal: give / take a skill and record the history event
create or replace function public.award(p_person uuid, p_skill text, p_source text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into certifications(person, skill, approved_by, source) values (p_person, p_skill, auth.uid(), p_source)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    insert into events(person, skill, type, by, source) values (p_person, p_skill, 'earned', auth.uid(), p_source);
  end if;
  return n > 0;
end $$;

create or replace function public.take_away(p_person uuid, p_skill text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from certifications where person = p_person and skill = p_skill;
  get diagnostics n = row_count;
  if n > 0 then
    insert into events(person, skill, type, by, source) values (p_person, p_skill, 'removed', auth.uid(), 'override');
  end if;
  return n > 0;
end $$;

-- ============ ACTIONS: learners ============
create or replace function public.request_signoff(p_skill text) returns bigint
language plpgsql security definer set search_path = public as $$
declare s skills; v_id bigint;
begin
  if not is_active_user() then raise exception 'Please sign in again.'; end if;
  select * into s from skills where id = p_skill;
  if not found or s.retired then raise exception 'That skill no longer exists.'; end if;
  if exists (select 1 from certifications where person = auth.uid() and skill = p_skill) then raise exception 'You already hold this skill.'; end if;
  if exists (select 1 from requests where person = auth.uid() and skill = p_skill and status = 'requested') then raise exception 'You already requested this sign-off.'; end if;
  if s.kind = 'cap' and not capstone_unlocked(auth.uid(), s.area, s.tier) then raise exception 'This capstone is still locked.'; end if;
  insert into requests(person, skill) values (auth.uid(), p_skill) returning id into v_id;
  perform log_activity(pname(auth.uid()) || ' requested sign-off: ' || s.name);
  return v_id;
end $$;

create or replace function public.withdraw_request(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update requests set status = 'withdrawn', reviewed_at = now()
   where id = p_id and person = auth.uid() and status = 'requested';
  if not found then raise exception 'Request not found.'; end if;
end $$;

create or replace function public.set_interest(p_skill text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_active_user() then raise exception 'Please sign in again.'; end if;
  if p_on then insert into interests(person, skill) values (auth.uid(), p_skill) on conflict do nothing;
  else delete from interests where person = auth.uid() and skill = p_skill; end if;
end $$;

create or replace function public.password_changed() returns void
language sql security definer set search_path = public as $$
  update people set must_change_password = false where id = auth.uid()
$$;

-- ============ ACTIONS: area leads and admins ============
create or replace function public.review_request(p_id bigint, p_approve boolean, p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r requests; s skills;
begin
  select * into r from requests where id = p_id;
  if not found or r.status <> 'requested' then raise exception 'That request was already handled.'; end if;
  select * into s from skills where id = r.skill;
  if not can_manage_area(s.area) then raise exception 'Only the area lead or an admin can review this request.'; end if;
  update requests set status = case when p_approve then 'approved' else 'returned' end,
         reviewer = auth.uid(), reviewed_at = now(), note = coalesce(p_note, '')
   where id = p_id;
  if p_approve then
    perform award(r.person, r.skill, 'approval');
    perform log_activity(pname(auth.uid()) || ' approved ' || pname(r.person) || ': ' || s.name);
  else
    perform log_activity(pname(auth.uid()) || ' returned ' || pname(r.person) || ': ' || s.name);
  end if;
end $$;

create or replace function public.add_skill(p_area text, p_tier text, p_kind text) returns text
language plpgsql security definer set search_path = public as $$
declare v_id text; v_sort int;
begin
  if not can_manage_area(p_area) then raise exception 'Only the area lead or an admin can edit this area.'; end if;
  if p_kind not in ('req','el') or p_tier not in ('bronze','silver','gold') then raise exception 'Invalid tier or type.'; end if;
  v_id := p_area || '-' || p_tier || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  select coalesce(max(sort), 0) + 1 into v_sort from skills where area = p_area;
  insert into skills(id, area, tier, kind, name, description, steps, est_time, sort)
  values (v_id, p_area, p_tier, p_kind,
          'New ' || case when p_kind = 'req' then 'required' else 'elective' end || ' skill',
          'Describe what this skill covers.',
          '["Read the NIS procedure","Watch a certified holder do it","Do it with a holder watching","Request sign-off"]'::jsonb,
          'About 1 hr', v_sort);
  perform log_activity(pname(auth.uid()) || ' added a ' || p_tier || ' ' || case when p_kind = 'req' then 'required' else 'elective' end || ' skill in ' || (select name from areas where id = p_area));
  return v_id;
end $$;

create or replace function public.save_skill(p_id text, p_name text, p_desc text, p_steps jsonb, p_time text, p_kind text, p_tier text) returns void
language plpgsql security definer set search_path = public as $$
declare s skills;
begin
  select * into s from skills where id = p_id;
  if not found then raise exception 'Skill not found.'; end if;
  if not can_manage_area(s.area) then raise exception 'Only the area lead or an admin can edit this area.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'A name is required.'; end if;
  update skills set
    name = trim(p_name),
    description = coalesce(p_desc, ''),
    steps = coalesce(p_steps, '[]'::jsonb),
    est_time = coalesce(p_time, ''),
    kind = case when s.kind = 'cap' then 'cap' when p_kind in ('req','el') then p_kind else s.kind end,
    tier = case when s.kind = 'cap' then s.tier when p_tier in ('bronze','silver','gold') then p_tier else s.tier end,
    updated_at = now()
  where id = p_id;
  if s.name <> trim(p_name) then
    perform log_activity(pname(auth.uid()) || ' renamed "' || s.name || '" to "' || trim(p_name) || '"');
  else
    perform log_activity(pname(auth.uid()) || ' edited "' || s.name || '"');
  end if;
end $$;

create or replace function public.set_retired(p_id text, p_retired boolean) returns void
language plpgsql security definer set search_path = public as $$
declare s skills;
begin
  select * into s from skills where id = p_id;
  if not found then raise exception 'Skill not found.'; end if;
  if not can_manage_area(s.area) then raise exception 'Only the area lead or an admin can edit this area.'; end if;
  if s.kind = 'cap' then raise exception 'Capstones cannot be retired.'; end if;
  update skills set retired = p_retired, updated_at = now() where id = p_id;
  if p_retired then
    update requests set status = 'returned', note = 'Skill retired', reviewer = auth.uid(), reviewed_at = now()
     where skill = p_id and status = 'requested';
  end if;
  perform log_activity(pname(auth.uid()) || case when p_retired then ' retired "' else ' restored "' end || s.name || '"');
end $$;

create or replace function public.set_rule(p_area text, p_tier text, p_n int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_area(p_area) then raise exception 'Only the area lead or an admin can edit this area.'; end if;
  insert into tier_rules(area, tier, electives_needed) values (p_area, p_tier, greatest(0, p_n))
  on conflict (area, tier) do update set electives_needed = excluded.electives_needed;
  perform log_activity(pname(auth.uid()) || ' set ' || (select name from areas where id = p_area) || ' ' || p_tier || ' to need ' || greatest(0, p_n) || ' electives');
end $$;

-- ============ ACTIONS: admins only ============
create or replace function public.grant_skill(p_person uuid, p_skill text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only.'; end if;
  if not exists (select 1 from skills where id = p_skill) then raise exception 'Skill not found.'; end if;
  if award(p_person, p_skill, 'override') then
    update requests set status = 'approved', reviewer = auth.uid(), reviewed_at = now(), note = 'Granted by admin'
     where person = p_person and skill = p_skill and status = 'requested';
    perform log_activity('Override: ' || pname(auth.uid()) || ' granted ' || pname(p_person) || ' ' || (select name from skills where id = p_skill));
  end if;
end $$;

create or replace function public.revoke_skill(p_person uuid, p_skill text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only.'; end if;
  if take_away(p_person, p_skill) then
    perform log_activity('Override: ' || pname(auth.uid()) || ' removed ' || (select name from skills where id = p_skill) || ' from ' || pname(p_person));
  end if;
end $$;

create or replace function public.grant_tier(p_person uuid, p_area text, p_tier text) returns void
language plpgsql security definer set search_path = public as $$
declare sid text;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;
  for sid in select id from skills where area = p_area and tier = p_tier and (not retired or kind = 'cap') order by (kind = 'cap'), sort loop
    perform award(p_person, sid, 'override');
  end loop;
  perform log_activity('Override: ' || pname(auth.uid()) || ' granted ' || pname(p_person) || ' all of ' || (select name from areas where id = p_area) || ' ' || p_tier);
end $$;

create or replace function public.save_area(p_id text, p_name text, p_lead uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_id text := p_id; t text;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'A name is required.'; end if;
  if v_id is null then
    v_id := 'area-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    insert into areas(id, name, lead, sort) values (v_id, trim(p_name), p_lead, (select coalesce(max(sort), 0) + 1 from areas));
    foreach t in array array['bronze','silver','gold'] loop
      insert into tier_rules(area, tier, electives_needed) values (v_id, t, 2);
      insert into skills(id, area, tier, kind, name, description, steps, est_time)
      values (v_id || '-' || t || '-cap', v_id, t, 'cap',
        case t when 'bronze' then 'Teach the ' || trim(p_name) || ' SOP' when 'silver' then 'Lead an advanced ' || trim(p_name) || ' workshop' else 'Develop a new ' || trim(p_name) || ' workshop' end,
        'Describe the capstone.', '["Plan","Deliver with the area lead present","Request sign-off"]'::jsonb, 'TBD');
    end loop;
    perform log_activity(pname(auth.uid()) || ' added area ' || trim(p_name));
  else
    update areas set name = trim(p_name), lead = p_lead where id = v_id;
    if not found then raise exception 'Area not found.'; end if;
    perform log_activity(pname(auth.uid()) || ' updated area ' || trim(p_name));
  end if;
  update people set role = 'lead' where id = p_lead and role = 'intern';
  return v_id;
end $$;

create or replace function public.update_person(p_id uuid, p_name text, p_role text, p_home text, p_end date, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare old people;
begin
  if not is_admin() then raise exception 'Admins only.'; end if;
  select * into old from people where id = p_id;
  if not found then raise exception 'Person not found.'; end if;
  if p_id = auth.uid() and (p_role <> 'admin' or not p_active) then raise exception 'You cannot remove your own admin access.'; end if;
  if p_role not in ('admin','lead','intern') then raise exception 'Invalid role.'; end if;
  update people set name = coalesce(nullif(trim(p_name), ''), old.name), role = p_role, home_area = p_home, end_date = p_end, active = p_active
   where id = p_id;
  if old.active <> p_active then
    perform log_activity(pname(auth.uid()) || case when p_active then ' reactivated ' else ' deactivated ' end || old.name);
  elsif old.role <> p_role then
    perform log_activity(old.name || ' is now ' || p_role);
  end if;
end $$;

-- ============ WHO CAN CALL WHAT ============
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'is_active_user','is_admin','can_manage_area','pname','log_activity','capstone_unlocked','award','take_away',
             'request_signoff','withdraw_request','set_interest','password_changed','review_request','add_skill','save_skill',
             'set_retired','set_rule','grant_skill','revoke_skill','grant_tier','save_area','update_person') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('log_activity','award','take_away') then
      execute format('revoke all on function %s from authenticated', f.sig);   -- internal only
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;
