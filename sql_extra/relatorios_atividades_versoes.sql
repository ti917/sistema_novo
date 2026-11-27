-- =====================================================================
-- Relatório de Atividades: HISTÓRICO DE VERSÕES
-- 100% aditivo: cria UMA tabela nova. Não altera nem apaga nada de relatorios_atividades.
-- O gestor só lê e grava versões dos PRÓPRIOS relatórios (não altera nem apaga versões); Admin só lê.
-- Para desfazer (só se quiser):  drop table if exists public.relatorios_atividades_versoes;
-- =====================================================================
create table if not exists public.relatorios_atividades_versoes (
  id            uuid primary key default gen_random_uuid(),
  relatorio_id  uuid not null,
  gestor_id     uuid not null,
  titulo        text,
  conteudo_html text,
  imagens       jsonb not null default '[]'::jsonb,
  tamanho_texto integer not null default 0,
  motivo        text,
  criado_em     timestamptz not null default now()
);

create index if not exists rel_atv_versoes_idx on public.relatorios_atividades_versoes (relatorio_id, criado_em desc);

alter table public.relatorios_atividades_versoes enable row level security;

drop policy if exists rav_gestor_select on public.relatorios_atividades_versoes;
create policy rav_gestor_select on public.relatorios_atividades_versoes for select to authenticated
  using (gestor_id = auth.uid());

drop policy if exists rav_gestor_insert on public.relatorios_atividades_versoes;
create policy rav_gestor_insert on public.relatorios_atividades_versoes for insert to authenticated
  with check (gestor_id = auth.uid());

drop policy if exists rav_admin_select on public.relatorios_atividades_versoes;
create policy rav_admin_select on public.relatorios_atividades_versoes for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'));
