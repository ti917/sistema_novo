-- Situacao da nota na SEFAZ (sefaz-sync, 29/10/2026).
--
-- O resumo da nota (resNFe) chega uma vez so' e nunca e' atualizado. Se o
-- fornecedor cancelar a nota depois, a SEFAZ manda um EVENTO de cancelamento
-- separado (ou responde 653 na consulta por chave). O script grava
-- 'cancelada' aqui quando isso acontece, e o financeiro mostra o selo
-- vermelho "Cancelada" na coluna Situacao SEFAZ.
--
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
ALTER TABLE public.nfecloud_documentos
    ADD COLUMN IF NOT EXISTS situacao_sefaz text;
