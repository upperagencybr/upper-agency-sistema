-- "own rows" let any signed-in user attach a row to ANY client_id as long as user_id was
-- themselves, so an outsider could inject fake attachment entries into another workspace's
-- client page. Scope it to the caller's own workspace (client owner or member), still allowing
-- a user to clean up their own rows whose client no longer exists.
drop policy "own rows" on public.client_attachments;

create policy "own rows" on public.client_attachments
  for all to authenticated
  using (
    user_id = auth.uid()
    and (
      not exists (select 1 from public.clients c where c.id = client_attachments.client_id)
      or exists (select 1 from public.clients c
                 where c.id = client_attachments.client_id
                   and (c.user_id = auth.uid()
                        or public.member_role(c.user_id, c.company, 'clientes') is not null))
    )
  )
  with check (
    user_id = auth.uid()
    and (
      not exists (select 1 from public.clients c where c.id = client_attachments.client_id)
      or exists (select 1 from public.clients c
                 where c.id = client_attachments.client_id
                   and (c.user_id = auth.uid()
                        or public.member_role(c.user_id, c.company, 'clientes') is not null))
    )
  );