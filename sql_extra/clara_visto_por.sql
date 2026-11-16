-- Chat da Clara: guardar QUEM abriu a mensagem do colaborador e QUANDO ("Visto por ...").
-- Só acrescenta 2 colunas vazias na tabela do chat; não altera nem apaga nenhuma mensagem.
alter table public.clara_conversas_log add column if not exists lida_por text;
alter table public.clara_conversas_log add column if not exists lida_em timestamptz;
