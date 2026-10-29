-- Recuperacao do XML completo das notas antigas (sefaz-sync, 29/10/2026).
--
-- Guarda quando o script pediu o XML completo de uma nota pela chave
-- (consulta consChNFe da SEFAZ), pra nao pedir a mesma nota de novo antes de
-- 24h - a SEFAZ so' deixa 20 consultas por chave por hora por CNPJ.
--
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
ALTER TABLE public.nfecloud_documentos
    ADD COLUMN IF NOT EXISTS xml_completo_tentado_em timestamptz;
