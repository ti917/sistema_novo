-- Arquivar casos de Afastamento (INSS) de colaboradores desligados (ADITIVO - nao apaga nada)
alter table public.ausencias add column if not exists inss_arquivado_em timestamptz;
alter table public.ausencias add column if not exists inss_arquivado_por text;
