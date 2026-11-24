-- Separa os feriados por empresa (ADITIVO - nao apaga nada)
alter table public.feriados_unidade add column if not exists empresa text;
