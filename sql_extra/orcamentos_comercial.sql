-- Orçamentos do site passam a ser vistos no sistema COMERCIAL (comercial.html).
-- Libera ler / mudar status / excluir em orcamentos_site para quem tem acesso ao Comercial
-- (permissoes.sistemas_permitidos = Comercial, Ambos, Comercial_Financeiro ou Todos) e para Admin.
-- Não mexe nas políticas que já existem (as novas se somam a elas). Pode rodar mais de uma vez.

alter table public.orcamentos_site enable row level security;

drop policy if exists orc_site_comercial_select on public.orcamentos_site;
drop policy if exists orc_site_comercial_update on public.orcamentos_site;
drop policy if exists orc_site_comercial_delete on public.orcamentos_site;

create policy orc_site_comercial_select on public.orcamentos_site
  for select to authenticated
  using (exists (select 1 from public.perfis p
                 where p.id = auth.uid()
                   and (p.perfil = 'Admin'
                        or p.permissoes->>'sistemas_permitidos' in ('Comercial','Ambos','Comercial_Financeiro','Todos'))));

create policy orc_site_comercial_update on public.orcamentos_site
  for update to authenticated
  using (exists (select 1 from public.perfis p
                 where p.id = auth.uid()
                   and (p.perfil = 'Admin'
                        or p.permissoes->>'sistemas_permitidos' in ('Comercial','Ambos','Comercial_Financeiro','Todos'))))
  with check (true);

create policy orc_site_comercial_delete on public.orcamentos_site
  for delete to authenticated
  using (exists (select 1 from public.perfis p
                 where p.id = auth.uid()
                   and (p.perfil = 'Admin'
                        or p.permissoes->>'sistemas_permitidos' in ('Comercial','Ambos','Comercial_Financeiro','Todos'))));

grant select, update, delete on public.orcamentos_site to authenticated;
