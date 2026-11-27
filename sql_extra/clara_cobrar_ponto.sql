-- ============================================================================
-- Clara cobra ponto esquecido — SQL ADITIVO (não apaga nem altera dados existentes)
-- Para DESFAZER (só se quiser):
--   drop table if exists public.ponto_lembretes_clara;
--   alter table public.config_ponto_whatsapp drop column if exists lembrete_ponto_clara;
-- ============================================================================

-- 1) Liga/desliga por pessoa. Começa DESLIGADO para todo mundo.
alter table public.config_ponto_whatsapp
  add column if not exists lembrete_ponto_clara boolean not null default false;

-- 2) Registro do que a Clara já avisou (impede mandar duas vezes o mesmo aviso)
create table if not exists public.ponto_lembretes_clara (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null,
  data date not null,
  tipo text not null,            -- lembrete_entrada | lembrete_ida_refeicao | lembrete_volta_refeicao | lembrete_saida | resumo
  mensagem text,
  resultado text,                -- enviando | enviado | falhou: ...
  wamid text,
  criado_em timestamptz not null default now(),
  unique (colaborador_id, data, tipo)
);

alter table public.ponto_lembretes_clara enable row level security;

-- Só leitura para usuários logados (a função grava com a chave de serviço). Sem delete.
drop policy if exists ponto_lembretes_clara_select on public.ponto_lembretes_clara;
create policy ponto_lembretes_clara_select on public.ponto_lembretes_clara
  for select to authenticated using (true);
