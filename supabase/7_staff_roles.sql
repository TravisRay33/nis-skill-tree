-- NIS Skill Tree: two roles (Staff and Intern) and staff self-add (run ONCE in Supabase > SQL Editor)
-- * Every "area lead" becomes Staff. Staff can do everything admins could.
-- * Each area keeps one "primary staff" member (the old area lead); change it under Skills > Edit tree.
-- * Staff can add a skill to their own record without a request ("Add to my skills").
-- Safe to run more than once.
begin;

update public.people set role = 'admin' where role = 'lead';

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
        'Describe the capstone.', '["Plan","Deliver with a staff member present","Request sign-off"]'::jsonb, 'TBD');
    end loop;
    perform log_activity(pname(auth.uid()) || ' added area ' || trim(p_name));
  else
    update areas set name = trim(p_name), lead = p_lead where id = v_id;
    if not found then raise exception 'Area not found.'; end if;
    perform log_activity(pname(auth.uid()) || ' updated area ' || trim(p_name));
  end if;
  return v_id;
end $$;

-- Staff add a skill to their own record directly (no request, no sign-off). Interns still request sign-off.
create or replace function public.add_own_skill(p_skill text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only staff can add skills to their own record. Please request a sign-off.'; end if;
  if not exists (select 1 from skills where id = p_skill and not retired) then raise exception 'Skill not found.'; end if;
  if award(auth.uid(), p_skill, 'self') then
    update requests set status = 'approved', reviewer = auth.uid(), reviewed_at = now(), note = 'Added by staff'
     where person = auth.uid() and skill = p_skill and status = 'requested';
    perform log_activity(pname(auth.uid()) || ' added ' || (select name from skills where id = p_skill) || ' to their own skills');
  end if;
end $$;

revoke all on function public.add_own_skill(text) from public, anon;
grant execute on function public.add_own_skill(text) to authenticated;

commit;

-- check: everyone should be admin (Staff) or intern
select role, count(*) from public.people group by role;
