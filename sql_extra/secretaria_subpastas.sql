-- Secretaria: SUBPASTAS dentro de um Centro de Custo (ex.: centro "FELIPE" > subpasta por pessoa/assunto).
-- 100% ADITIVO: só adiciona colunas NOVAS nas tabelas da Secretaria. Não mexe em RH/Financeiro/Comercial
-- nem nos dados existentes. Pode rodar mais de uma vez sem problema (IF NOT EXISTS).
alter table public.secretaria_centros_custo add column if not exists subpastas jsonb not null default '[]'::jsonb;
alter table public.secretaria_lancamentos   add column if not exists subpasta_id text;
alter table public.secretaria_contas_fixas  add column if not exists subpasta_id text;
create index if not exists idx_secretaria_lanc_subpasta on public.secretaria_lancamentos (centro_custo_id, subpasta_id);
