-- NIS Skill Tree: "Create an NIS Skill account" requests (run ONCE in Supabase > SQL Editor)
-- People who don't have an account yet ask for one from the sign-in page (name + NIS username).
-- Requests are stored here and appear at the top of Approvals for staff, who approve or decline them.
-- The request itself is saved by the "request-account" Edge Function (it also emails staff).
-- Safe to run more than once.

create table if not exists public.account_requests (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 1 and 80),
  username     text not null check (username ~ '^[a-z0-9._-]{2,40}$'),
  status       text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at   timestamptz not null default now(),
  reviewed_by  uuid references public.people(id) on delete set null,
  reviewed_at  timestamptz,
  person       uuid references public.people(id) on delete set null
);
create unique index if not exists account_requests_one_pending on public.account_requests(username) where status = 'pending';

-- only staff can see requests; nobody writes to the table directly
alter table public.account_requests enable row level security;
drop policy if exists "staff can read account requests" on public.account_requests;
create policy "staff can read account requests" on public.account_requests for select to authenticated using (public.is_admin());
revoke all on public.account_requests from anon;
revoke insert, update, delete, truncate on public.account_requests from authenticated;
grant select on public.account_requests to authenticated;

-- staff decline a request (approving happens in the manage-users Edge Function, which creates the sign-in)
create or replace function public.decline_account_request(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r account_requests;
begin
  if not is_admin() then raise exception 'Only staff can review account requests.'; end if;
  update account_requests set status = 'declined', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_id and status = 'pending' returning * into r;
  if r.id is null then raise exception 'That request was already handled.'; end if;
  perform log_activity(pname(auth.uid()) || ' declined the account request from ' || r.name || ' (' || r.username || ')');
end $$;
revoke all on function public.decline_account_request(bigint) from public, anon;
grant execute on function public.decline_account_request(bigint) to authenticated;
