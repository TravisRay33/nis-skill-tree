-- NIS Skill Tree: area colours (run once in Supabase > SQL Editor, after 1_schema.sql)
-- Adds a colour to each shop area, editable by staff in "Edit tree".
-- Safe to run more than once.

alter table public.areas add column if not exists color text;

-- starting colours: UNL web framework accents + Nebraska Innovation Campus cool grey
update public.areas set color = case id
  when 'wood'  then '#f58a1f'
  when 'metal' then '#616265'
  when 'rp'    then '#ffd74e'
  when 'laser' then '#5b3f8f'
  when 'elec'  then '#0a9396'
  when 'cer'   then '#00784e'
  when 'des'   then '#007197'
  when 'tex'   then '#b32d9c'
  else color end
where color is null;

create or replace function public.set_area_color(p_area text, p_color text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_area(p_area) then raise exception 'Only staff can edit areas.'; end if;
  if p_color !~* '^#[0-9a-f]{6}$' then raise exception 'Colour must look like #d00000.'; end if;
  update areas set color = lower(p_color) where id = p_area;
  perform log_activity(pname(auth.uid()) || ' set the ' || (select name from areas where id = p_area) || ' colour to ' || lower(p_color));
end $$;

revoke all on function public.set_area_color(text, text) from public, anon;
grant execute on function public.set_area_color(text, text) to authenticated;
