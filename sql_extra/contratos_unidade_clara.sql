-- =====================================================================
-- CONTRATOS (Comercial) ligados às UNIDADES + leitura da Clara (27/11/2026)
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- O que faz (só ACRESCENTA — nada existente é apagado ou alterado):
--   1) contratos_arquivos ganha 3 colunas NOVAS e opcionais:
--        unidade_oficial_id  (a unidade do RH a que o contrato pertence)
--        unidade_nome        (nome da unidade; se for unidade nova, o nome digitado pelo Comercial)
--        tipo_documento      (contrato_novo / aditivo / renovacao / distrato / outro)
--      Os contratos que já existem ficam com essas colunas vazias e continuam iguais.
--   2) Cria a tabela NOVA contratos_lotacao_sugestoes: o que a Clara leu do contrato, pendente
--      para o RH conferir depois (unidade nova a criar / lotação a aplicar). NÃO muda nenhuma
--      unidade nem lotação sozinha.
--
-- PRA DESFAZER (só o que foi criado aqui):
--   alter table public.contratos_arquivos drop column if exists unidade_oficial_id, drop column if exists unidade_nome, drop column if exists tipo_documento;
--   drop table if exists public.contratos_lotacao_sugestoes;
-- =====================================================================

alter table public.contratos_arquivos add column if not exists unidade_oficial_id uuid;
alter table public.contratos_arquivos add column if not exists unidade_nome text;
alter table public.contratos_arquivos add column if not exists tipo_documento text;

create table if not exists public.contratos_lotacao_sugestoes (
  id uuid primary key default gen_random_uuid(),
  arquivo_id uuid,                 -- id do arquivo em contratos_arquivos (sem FK de propósito: não trava nada)
  pasta_id uuid,                   -- pasta do contrato
  unidade_oficial_id uuid,         -- unidade do RH a que a sugestão se refere (null = unidade nova ainda não criada)
  unidade_nome text,               -- nome da unidade (escolhido/corrigido pelo Comercial)
  nome_arquivo text,
  dados jsonb not null,            -- exatamente o que a Clara leu (tipo, vigência, postos, alertas)
  lotacao_atual jsonb,             -- limites_cargos da unidade no momento da leitura (para mostrar o "antes")
  status text not null default 'pendente' check (status in ('pendente','aplicada','descartada')),
  lotacao_anterior jsonb,          -- cópia ANTES de aplicar (para desfazer)
  criado_em timestamptz not null default now(),
  criado_por text,
  decidido_em timestamptz,
  decidido_por text
);
create index if not exists idx_ctr_lot_sug_status on public.contratos_lotacao_sugestoes (status, criado_em desc);
create index if not exists idx_ctr_lot_sug_unidade on public.contratos_lotacao_sugestoes (unidade_oficial_id);
alter table public.contratos_lotacao_sugestoes enable row level security;

drop policy if exists "ctr_lot_sug_select" on public.contratos_lotacao_sugestoes;
drop policy if exists "ctr_lot_sug_insert" on public.contratos_lotacao_sugestoes;
drop policy if exists "ctr_lot_sug_update" on public.contratos_lotacao_sugestoes;
create policy "ctr_lot_sug_select" on public.contratos_lotacao_sugestoes for select to authenticated using (true);
create policy "ctr_lot_sug_insert" on public.contratos_lotacao_sugestoes for insert to authenticated with check (true);
create policy "ctr_lot_sug_update" on public.contratos_lotacao_sugestoes for update to authenticated using (true) with check (true);
-- (sem policy de DELETE: sugestão nunca é apagada, só marcada como descartada)

-- Conferência (só leitura): deve mostrar as 3 colunas novas e a tabela vazia
-- select column_name from information_schema.columns where table_name='contratos_arquivos' and column_name in ('unidade_oficial_id','unidade_nome','tipo_documento');
-- select count(*) from public.contratos_lotacao_sugestoes;
