-- NIS Skill Tree: make the first admin (you)
-- Before running: in Supabase go to Authentication > Users > Add user > Create new user.
--   Email:    <your username>@users.nis-skilltree.org   (for example tray@users.nis-skilltree.org)
--   Password: a password of your choice
--   Tick "Auto Confirm User".
-- Then edit the three values below and run this file.

insert into public.people (id, username, name, role, home_area, must_change_password)
select id, 'tray', 'Travis Ray', 'admin', 'rp', false      -- <- your username, your name, your home area id
from auth.users
where email = 'tray@users.nis-skilltree.org'                -- <- the email you typed above
on conflict (id) do update set role = 'admin', active = true;

-- Area ids: wood, metal, rp (Rapid Prototyping), cer (Ceramics), des (Design), tex (Textiles)
