-- Categoria padrão de cada Insumo (usada no preenchimento automático do Almoxarifado
-- pelo XML da NF-e). Rodar uma vez no SQL Editor do Supabase.
alter table public.financeiro_insumos add column if not exists categoria text;
