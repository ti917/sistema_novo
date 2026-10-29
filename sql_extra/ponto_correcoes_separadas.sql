-- =========================================================================
-- PONTO — correções em campo separado (Portaria 671/2021, art. 74, II e IV; Súmula 338 TST)
-- -------------------------------------------------------------------------
-- A batida original (entrada_hora, ida_refeicao_hora, volta_refeicao_hora, saida_hora e
-- seus _lat/_lng/_foto) NÃO é mais alterada pelo sistema. Qualquer ajuste do RH é uma
-- CORREÇÃO pontual, com justificativa obrigatória, gravada em `correcoes`:
--   { "entrada": { "hora": "<ISO>", "justificativa": "...", "por": "Nome", "em": "<ISO>",
--                  "batida_original": "<ISO ou null>" }, "ida_refeicao": {...}, ... }
-- e registrada em `historico_edicoes` (trilha de auditoria, só acrescenta).
-- Rode UMA vez no SQL Editor do Supabase.
-- =========================================================================
ALTER TABLE pontos_diarios_whatsapp ADD COLUMN IF NOT EXISTS correcoes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE pontos_diarios_whatsapp ADD COLUMN IF NOT EXISTS historico_edicoes jsonb DEFAULT '[]'::jsonb;

-- OPCIONAL (descomente só depois de testar com o app/Clara): impede que QUALQUER cliente altere a batida original depois de gravada.
-- Só a coluna `correcoes` e `historico_edicoes` continuam editáveis. Se a Clara/o app precisar
-- GRAVAR a batida (campo ainda vazio), o trigger libera: só bloqueia trocar um valor já existente.
-- CREATE OR REPLACE FUNCTION proteger_batida_original_ponto() RETURNS trigger AS $$
-- BEGIN
--   IF (OLD.entrada_hora        IS NOT NULL AND NEW.entrada_hora        IS DISTINCT FROM OLD.entrada_hora)
--   OR (OLD.ida_refeicao_hora   IS NOT NULL AND NEW.ida_refeicao_hora   IS DISTINCT FROM OLD.ida_refeicao_hora)
--   OR (OLD.volta_refeicao_hora IS NOT NULL AND NEW.volta_refeicao_hora IS DISTINCT FROM OLD.volta_refeicao_hora)
--   OR (OLD.saida_hora          IS NOT NULL AND NEW.saida_hora          IS DISTINCT FROM OLD.saida_hora) THEN
--     RAISE EXCEPTION 'A batida original do ponto não pode ser alterada (Portaria 671). Lance uma correção justificada.';
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS trg_proteger_batida_original_ponto ON pontos_diarios_whatsapp;
-- CREATE TRIGGER trg_proteger_batida_original_ponto
--   BEFORE UPDATE ON pontos_diarios_whatsapp
--   FOR EACH ROW EXECUTE FUNCTION proteger_batida_original_ponto();
