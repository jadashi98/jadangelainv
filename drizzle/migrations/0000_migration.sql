create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- First account ever created becomes the administrator
create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.assign_first_admin();

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin') $$;
grant execute on function public.admin_exists() to anon, authenticated;

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  hero_image_url text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon, authenticated;
grant update, insert on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins insert settings" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
insert into public.site_settings (id, hero_image_url, data) values (1, null, '{}'::jsonb);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  attending boolean not null,
  guests int not null default 1 check (guests between 0 and 20),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);
grant insert on public.rsvps to anon, authenticated;
grant select, update, delete on public.rsvps to authenticated;
grant all on public.rsvps to service_role;
alter table public.rsvps enable row level security;
create policy "Anyone can RSVP" on public.rsvps for insert to anon, authenticated with check (true);
create policy "Admins read rsvps" on public.rsvps for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update rsvps" on public.rsvps for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete rsvps" on public.rsvps for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- site media storage policies (bucket created separately)
create policy "Public read site media" on storage.objects for select using (bucket_id = 'site-media');
create policy "Admins upload site media" on storage.objects for insert to authenticated with check (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "Admins update site media" on storage.objects for update to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete site media" on storage.objects for delete to authenticated using (bucket_id = 'site-media' and public.has_role(auth.uid(),'admin'));