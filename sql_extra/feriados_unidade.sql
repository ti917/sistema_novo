-- Feriados estaduais/municipais/por unidade (ADITIVO - nao altera nem apaga nada existente)
create table if not exists public.feriados_unidade (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  nome text not null,
  escopo text not null check (escopo in ('estadual','municipal','unidade')),
  uf text,
  cidade text,
  unidade text,
  recorrente boolean not null default true,
  criado_por text,
  created_at timestamptz not null default now()
);
alter table public.feriados_unidade enable row level security;
drop policy if exists "feriados_unidade_all" on public.feriados_unidade;
create policy "feriados_unidade_all" on public.feriados_unidade
  for all to authenticated using (true) with check (true);
