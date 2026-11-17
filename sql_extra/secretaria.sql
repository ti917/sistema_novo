-- =====================================================================
-- MÓDULO SECRETARIA (secretaria.html)  —  rodar UMA vez no SQL Editor do Supabase
--
-- É 100% ADITIVO: não apaga, não altera e não move nenhum dado existente.
--  * Cria tabelas NOVAS só da secretaria (centros de custo que ELA criar).
--  * O centro "CONTAS PARTICULARES DANIELA" continua nas tabelas atuais do
--    Financeiro (financeiro_lancamentos / financeiro_contas_fixas). Aqui só
--    damos permissão de acesso ao perfil "Secretaria" NESSE centro (id fixo).
--  * Quem tem acesso: Super Admin OU quem tiver Acesso aos Sistemas =
--    "Somente Secretaria" (permissoes.sistemas_permitidos = 'Secretaria').
-- Pode rodar de novo sem problema (usa IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

-- 1) Função que diz se o usuário logado é da Secretaria (ou Super Admin)
create or replace function public.fn_secretaria_tem_acesso()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and ( p.id = 'fa338e33-18c9-467e-bf3e-34880fd9324e'::uuid
            or coalesce(p.permissoes->>'sistemas_permitidos','') = 'Secretaria' )
  );
$$;
grant execute on function public.fn_secretaria_tem_acesso() to authenticated;

-- 2) Tabelas novas (centros de custo próprios da secretaria)
create table if not exists public.secretaria_centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome_unidade text not null,
  descricao text,
  criado_por text,
  created_at timestamptz not null default now()
);

create table if not exists public.secretaria_lancamentos (
  id uuid primary key default gen_random_uuid(),
  centro_custo_id uuid not null,
  grupo_id text,
  tipo text not null default 'Despesa',
  categoria text,
  fornecedor_nome text,
  descricao text,
  data_vencimento date,
  data_pagamento date,
  mes_referencia text,
  valor_parcela numeric not null default 0,
  juros numeric not null default 0,
  parcela_atual int not null default 1,
  total_parcelas int not null default 1,
  valor_total numeric not null default 0,
  status text not null default 'Pendente',
  anexos jsonb not null default '[]'::jsonb,
  forma_pagamento text,
  pix_chave text,
  numero_nf text,
  observacoes text,
  conta_fixa_id uuid,
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz
);
create index if not exists idx_sec_lanc_centro on public.secretaria_lancamentos (centro_custo_id, data_vencimento);
create index if not exists idx_sec_lanc_fixa on public.secretaria_lancamentos (conta_fixa_id);

create table if not exists public.secretaria_contas_fixas (
  id uuid primary key default gen_random_uuid(),
  centro_custo_id uuid not null,
  tipo text not null default 'Despesa',
  categoria text,
  fornecedor_nome text,
  descricao text,
  valor_padrao numeric not null default 0,
  dia_vencimento int not null default 10,
  ativo boolean not null default true,
  permanente boolean not null default true,
  data_inicio_vigencia date,
  data_fim_vigencia date,
  meses_pulados jsonb not null default '[]'::jsonb,
  criado_por text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sec_fixas_centro on public.secretaria_contas_fixas (centro_custo_id);

create table if not exists public.secretaria_fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  observacoes text,
  criado_por text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_sec_fornecedores_nome on public.secretaria_fornecedores (upper(nome));

create table if not exists public.secretaria_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'Despesa',
  criado_por text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_sec_categorias_nome on public.secretaria_categorias (upper(nome), tipo);

-- 3) Segurança (RLS): só Secretaria / Super Admin enxerga e mexe nas tabelas novas
do $$
declare t text;
begin
  foreach t in array array['secretaria_centros_custo','secretaria_lancamentos','secretaria_contas_fixas','secretaria_fornecedores','secretaria_categorias']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'secretaria_acesso_total', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.fn_secretaria_tem_acesso()) with check (public.fn_secretaria_tem_acesso())', 'secretaria_acesso_total', t);
  end loop;
end $$;

-- 4) Centro "CONTAS PARTICULARES DANIELA" (continua nas tabelas do Financeiro).
--    Permissões EXTRAS (somem se a política for apagada) restritas a esse centro:
--    id = 88f86646-a366-4f0d-81ed-f0231174654e
drop policy if exists secretaria_particulares_lanc on public.financeiro_lancamentos;
create policy secretaria_particulares_lanc on public.financeiro_lancamentos
  for all to authenticated
  using (centro_custo_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso())
  with check (centro_custo_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_particulares_fixas on public.financeiro_contas_fixas;
create policy secretaria_particulares_fixas on public.financeiro_contas_fixas
  for all to authenticated
  using (centro_custo_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso())
  with check (centro_custo_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_particulares_cc on public.financeiro_centros_custo;
create policy secretaria_particulares_cc on public.financeiro_centros_custo
  for select to authenticated
  using (id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso());

-- 5) Lista de fornecedores e categorias do Financeiro: SOMENTE LEITURA pra Secretaria
drop policy if exists secretaria_le_fornecedores on public.financeiro_fornecedores;
create policy secretaria_le_fornecedores on public.financeiro_fornecedores
  for select to authenticated using (public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_le_categorias on public.financeiro_categorias;
create policy secretaria_le_categorias on public.financeiro_categorias
  for select to authenticated using (public.fn_secretaria_tem_acesso());

-- 6) Anexos: bucket novo privado pros anexos novos + leitura (só leitura) dos anexos
--    JÁ existentes do centro CONTAS PARTICULARES, que estão no bucket do Financeiro
insert into storage.buckets (id, name, public)
values ('anexos_secretaria', 'anexos_secretaria', false)
on conflict (id) do nothing;

drop policy if exists secretaria_anexos_select on storage.objects;
create policy secretaria_anexos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos_secretaria' and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_anexos_insert on storage.objects;
create policy secretaria_anexos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos_secretaria' and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_anexos_update on storage.objects;
create policy secretaria_anexos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'anexos_secretaria' and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_anexos_delete on storage.objects;
create policy secretaria_anexos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos_secretaria' and public.fn_secretaria_tem_acesso());

drop policy if exists secretaria_anexos_antigos_select on storage.objects;
create policy secretaria_anexos_antigos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos_financeiro'
    and public.fn_secretaria_tem_acesso()
    and exists (
      select 1 from public.financeiro_lancamentos l
      where l.centro_custo_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid
        and l.anexos ? storage.objects.name
    )
  );
