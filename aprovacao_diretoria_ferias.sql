-- Aprovação prévia da Diretoria nas férias (rode uma vez no SQL Editor do Supabase)
alter table public.solicitacoes_ferias add column if not exists aprovacao_diretoria jsonb;
