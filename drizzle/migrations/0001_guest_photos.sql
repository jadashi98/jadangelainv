create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  fingerprint text,
  guest_name text,
  created_at timestamptz not null default now()
);
create index on public.guest_sessions (fingerprint);
grant select on public.guest_sessions to authenticated;
grant all on public.guest_sessions to service_role;
alter table public.guest_sessions enable row level security;
create policy "Admins read sessions" on public.guest_sessions for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.guest_tokens (
  token_hash text primary key,
  session_id uuid not null references public.guest_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant all on public.guest_tokens to service_role;
alter table public.guest_tokens enable row level security;

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.guest_sessions(id) on delete cascade,
  path text not null unique,
  original_name text,
  content_type text not null,
  size_bytes bigint not null default 0,
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now()
);
create index on public.photos (session_id);
create index on public.photos (created_at desc);
grant select, delete on public.photos to authenticated;
grant all on public.photos to service_role;
alter table public.photos enable row level security;
create policy "Admins read photos" on public.photos for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete photos" on public.photos for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Atomically reserve an upload slot; pending reservations expire after 30 minutes
create or replace function public.reserve_photo_slot(_session uuid, _limit int, _path text, _name text, _type text, _size bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare used int; new_id uuid;
begin
  perform 1 from public.guest_sessions where id = _session for update;
  if not found then raise exception 'session_not_found'; end if;
  select count(*) into used from public.photos
    where session_id = _session and (status = 'done' or created_at > now() - interval '30 minutes');
  if used >= _limit then raise exception 'limit_reached'; end if;
  insert into public.photos (session_id, path, original_name, content_type, size_bytes)
    values (_session, _path, _name, _type, _size) returning id into new_id;
  return new_id;
end $$;
revoke execute on function public.reserve_photo_slot(uuid,int,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.reserve_photo_slot(uuid,int,text,text,text,bigint) to service_role;

create table public.download_tickets (
  id uuid primary key default gen_random_uuid(),
  photo_ids uuid[],
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_by uuid not null
);
grant all on public.download_tickets to service_role;
alter table public.download_tickets enable row level security;

create policy "Admins read wedding photos" on storage.objects for select to authenticated using (bucket_id = 'wedding-photos' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete wedding photos" on storage.objects for delete to authenticated using (bucket_id = 'wedding-photos' and public.has_role(auth.uid(),'admin'));