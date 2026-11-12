-- Estabilidade no emprego (RH cadastra o período; o sistema avisa nas listas e ao aprovar rescisão).
-- SÓ CRIA uma tabela nova. Não altera nem apaga nada que já existe. Nada é excluído: "encerrar" só desmarca (ativo = false).
create table if not exists public.colaborador_estabilidades (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null,
  tipo text not null,
  data_inicio date not null,
  data_fim date not null,
  observacao text,
  ativo boolean not null default true,
  criado_por text,
  criado_em timestamptz not null default now(),
  encerrado_por text,
  encerrado_em timestamptz
);
create index if not exists idx_colab_estab_colab on public.colaborador_estabilidades (colaborador_id);

alter table public.colaborador_estabilidades enable row level security;

-- Admin e Gestor enxergam (para aparecer o selo e o aviso); só Admin cadastra/encerra; ninguém apaga.
drop policy if exists "estab_select" on public.colaborador_estabilidades;
create policy "estab_select" on public.colaborador_estabilidades for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil in ('Admin','Gestor')));

drop policy if exists "estab_insert" on public.colaborador_estabilidades;
create policy "estab_insert" on public.colaborador_estabilidades for insert to authenticated
  with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'));

drop policy if exists "estab_update" on public.colaborador_estabilidades;
create policy "estab_update" on public.colaborador_estabilidades for update to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'))
  with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'));
