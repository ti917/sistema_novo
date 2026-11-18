-- =====================================================================
-- SECRETARIA: aba "Documentos" (pastas e arquivos: pessoais, empresas e unidades)
-- 100% aditivo: cria 2 tabelas NOVAS + RLS. Não mexe em RH/Financeiro/Comercial
-- nem em nenhuma tabela existente. Pode rodar de novo sem problema.
-- Acesso: mesma função da Secretaria (Super Admin ou "Somente Secretaria").
-- Os arquivos ficam no bucket que a Secretaria já usa (anexos_secretaria).
-- =====================================================================
create table if not exists public.secretaria_doc_pastas (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,                              -- pessoal | empresa | unidade
  empresa text,                                      -- ex.: SOUL GESTÃO (vazio em "pessoal")
  unidade text,                                      -- nome da unidade do RH (só em "unidade")
  pasta_pai_id uuid references public.secretaria_doc_pastas(id) on delete cascade,
  nome text not null,
  criado_por text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sec_doc_pastas_ctx on public.secretaria_doc_pastas (escopo, empresa, unidade, pasta_pai_id);

create table if not exists public.secretaria_doc_arquivos (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  empresa text,
  unidade text,
  pasta_id uuid references public.secretaria_doc_pastas(id) on delete cascade,   -- vazio = raiz
  nome text not null,                                -- título do documento
  tipo text,                                         -- RG, CNH, Cartão CNPJ, Alvará...
  descricao text,
  validade date,                                     -- vencimento do documento (opcional)
  caminho text not null,                             -- caminho no bucket anexos_secretaria
  nome_arquivo text,
  tamanho bigint,
  criado_por text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sec_doc_arq_ctx on public.secretaria_doc_arquivos (escopo, empresa, unidade, pasta_id);

alter table public.secretaria_doc_pastas enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_doc_pastas;
create policy secretaria_acesso_total on public.secretaria_doc_pastas
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());

alter table public.secretaria_doc_arquivos enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_doc_arquivos;
create policy secretaria_acesso_total on public.secretaria_doc_arquivos
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());

-- ---------------------------------------------------------------------
-- Empresas e unidades que a própria Secretaria cadastra (além da SOUL GESTÃO
-- e das unidades que já vêm do RH, que só são LIDAS, nunca alteradas).
-- ---------------------------------------------------------------------
create table if not exists public.secretaria_doc_empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  razao_social text,
  cnpj text,
  criado_por text,
  created_at timestamptz not null default now()
);
create table if not exists public.secretaria_doc_unidades (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  nome text not null,
  criado_por text,
  created_at timestamptz not null default now(),
  unique (empresa, nome)
);
alter table public.secretaria_doc_empresas enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_doc_empresas;
create policy secretaria_acesso_total on public.secretaria_doc_empresas
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());
alter table public.secretaria_doc_unidades enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_doc_unidades;
create policy secretaria_acesso_total on public.secretaria_doc_unidades
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());
