-- The old attachment policies checked the clients table directly, so RLS on clients hid the
-- client row from outsiders and the "client does not exist" branch let any signed-in user attach
-- files to another workspace's client. Decide access through SECURITY DEFINER helpers that read
-- the real client ownership, then rebuild every attachment policy on top of them.
create or replace function public.client_files_readable(_client_id bigint)
 returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from clients c
    where c.id = _client_id
      and (c.user_id = auth.uid() or public.member_role(c.user_id, c.company, 'clientes') is not null)
  );
$$;

create or replace function public.client_files_writable(_client_id bigint)
 returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from clients c
    where c.id = _client_id
      and (c.user_id = auth.uid() or public.role_rank(public.member_role(c.user_id, c.company, 'clientes')) >= 2)
  );
$$;

create or replace function public.client_files_deletable(_client_id bigint)
 returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from clients c
    where c.id = _client_id
      and (c.user_id = auth.uid() or public.member_role(c.user_id, c.company, 'clientes') = 'admin')
  );
$$;

revoke all on function public.client_files_readable(bigint) from public, anon;
revoke all on function public.client_files_writable(bigint) from public, anon;
revoke all on function public.client_files_deletable(bigint) from public, anon;
grant execute on function public.client_files_readable(bigint) to authenticated;
grant execute on function public.client_files_writable(bigint) to authenticated;
grant execute on function public.client_files_deletable(bigint) to authenticated;

drop policy if exists "own rows" on public.client_attachments;
drop policy if exists "member attachments read" on public.client_attachments;
drop policy if exists "member attachments insert" on public.client_attachments;
drop policy if exists "member attachments update" on public.client_attachments;
drop policy if exists "member attachments delete" on public.client_attachments;

create policy "attachments read" on public.client_attachments
  for select to authenticated
  using (public.client_files_readable(client_id));

create policy "attachments insert" on public.client_attachments
  for insert to authenticated
  with check (public.client_files_writable(client_id));

create policy "attachments update" on public.client_attachments
  for update to authenticated
  using (public.client_files_writable(client_id))
  with check (public.client_files_writable(client_id));

create policy "attachments delete" on public.client_attachments
  for delete to authenticated
  using (
    public.client_files_deletable(client_id)
    or (user_id = auth.uid() and not exists (select 1 from public.clients c where c.id = client_attachments.client_id))
  );