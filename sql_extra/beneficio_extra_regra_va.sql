-- Regra opcional de falta/atestado por Benefício Extra do Vale Alimentação.
-- Só adiciona uma coluna (nula por padrão): nada existente muda. Rodar uma vez no SQL Editor do Supabase.
ALTER TABLE public.config_beneficios_extras_atribuicoes
  ADD COLUMN IF NOT EXISTS regra_va jsonb;
