-- Fix: "member attachments" allowed ANY signed-in user to read/write/delete every attachment
-- row (its check only required that the client id existed). Replace with workspace-scoped rules
-- derived from the client's own workspace, mirroring the clients table policies.
drop policy if exists "member attachments" on public.client_attachments;

create policy "member attachments read" on public.client_attachments
  for select to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = client_attachments.client_id
      and (c.user_id = auth.uid() or public.member_role(c.user_id, c.company, 'clientes') is not null)
  ));

create policy "member attachments insert" on public.client_attachments
  for insert to authenticated
  with check (exists (
    select 1 from public.clients c
    where c.id = client_attachments.client_id
      and (c.user_id = auth.uid() or public.role_rank(public.member_role(c.user_id, c.company, 'clientes')) >= 2)
  ));

create policy "member attachments update" on public.client_attachments
  for update to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = client_attachments.client_id
      and (c.user_id = auth.uid() or public.role_rank(public.member_role(c.user_id, c.company, 'clientes')) >= 2)
  ))
  with check (exists (
    select 1 from public.clients c
    where c.id = client_attachments.client_id
      and (c.user_id = auth.uid() or public.role_rank(public.member_role(c.user_id, c.company, 'clientes')) >= 2)
  ));

create policy "member attachments delete" on public.client_attachments
  for delete to authenticated
  using (exists (
    select 1 from public.clients c
    where c.id = client_attachments.client_id
      and (c.user_id = auth.uid() or public.member_role(c.user_id, c.company, 'clientes') = 'admin')
  ));