-- =====================================================================
-- SECRETARIA: Agenda e Tarefas (tabela NOVA, só da Secretaria)
-- 100% aditivo: cria 1 tabela nova + RLS. Não mexe em RH/Financeiro/Comercial.
-- Acesso: mesma função da Secretaria (Super Admin ou "Somente Secretaria").
-- Pode rodar de novo sem problema.
-- =====================================================================
create table if not exists public.secretaria_agenda (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'Tarefa',            -- Tarefa | Compromisso | Reunião | Lembrete
  titulo text not null,
  descricao text,
  data date,
  hora time,
  hora_fim time,
  prioridade text not null default 'Normal',      -- Baixa | Normal | Alta | Urgente
  status text not null default 'A Fazer',         -- A Fazer | Fazendo | Concluído
  concluido_em timestamptz,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_secretaria_agenda_data on public.secretaria_agenda (data);

alter table public.secretaria_agenda enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_agenda;
create policy secretaria_acesso_total on public.secretaria_agenda
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());
