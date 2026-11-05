-- =====================================================================
-- RECRUTAMENTO E SELEÇÃO (substitui o uso do "Banco de Currículos")
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- 1) Colunas novas em banco_curriculos (lido/não lido, entrevista, arquivo)
-- 2) Marca os currículos ANTIGOS no novo fluxo (nada some)
-- 3) RPC pública pro site: lista cargo + cidade/UF das unidades (sem nomes de unidade)
--
-- Pra desfazer: DROP FUNCTION public.rs_vagas_publicas(); e DROP das colunas abaixo.
-- =====================================================================

ALTER TABLE public.banco_curriculos
    ADD COLUMN IF NOT EXISTS lido                  boolean     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS lido_em               timestamptz,
    ADD COLUMN IF NOT EXISTS lido_por              text,
    ADD COLUMN IF NOT EXISTS rs_etapa              text        NOT NULL DEFAULT 'triagem',   -- triagem | entrevista | arquivado | aprovado
    ADD COLUMN IF NOT EXISTS entrevista_em         timestamptz,
    ADD COLUMN IF NOT EXISTS entrevista_agendada_por text,
    ADD COLUMN IF NOT EXISTS entrevista_aviso_visto boolean    NOT NULL DEFAULT true,         -- false = Admin ainda não viu o aviso do topo
    ADD COLUMN IF NOT EXISTS motivo_reprovacao     text,
    ADD COLUMN IF NOT EXISTS arquivado_em          timestamptz,
    ADD COLUMN IF NOT EXISTS arquivado_por         text,
    ADD COLUMN IF NOT EXISTS aprovado_em           timestamptz,
    ADD COLUMN IF NOT EXISTS aprovado_por          text;

-- Currículos antigos: quem já tinha sido mexido (status diferente de "Novo") vira "já visto";
-- Descartado -> Arquivados; Aprovado / Contratado -> sai do R&S (já foi tratado antes).
-- Só mexe em quem ainda está no padrão (rs_etapa = 'triagem' e lido = false), então rodar de novo é seguro.
UPDATE public.banco_curriculos
   SET lido = true, lido_em = COALESCE(lido_em, now())
 WHERE lido = false AND status IS DISTINCT FROM 'Novo';

UPDATE public.banco_curriculos
   SET rs_etapa = 'arquivado',
       arquivado_em = COALESCE(arquivado_em, now()),
       motivo_reprovacao = COALESCE(motivo_reprovacao, 'Descartado antes do novo fluxo de Recrutamento e Seleção')
 WHERE rs_etapa = 'triagem' AND status = 'Descartado';

UPDATE public.banco_curriculos
   SET rs_etapa = 'aprovado'
 WHERE rs_etapa = 'triagem' AND status = 'Aprovado / Contratado';

CREATE INDEX IF NOT EXISTS idx_banco_curriculos_rs ON public.banco_curriculos (rs_etapa, lido);

-- ---------------------------------------------------------------------
-- RPC pro SITE PÚBLICO: devolve só (cargo, cidade, uf) das unidades ativas
-- que têm o cargo cadastrado nos "Limites de Lotação" (limites_cargos).
-- NÃO devolve nome nem endereço da unidade.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rs_vagas_publicas()
RETURNS TABLE (cargo text, cidade text, uf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT DISTINCT
           btrim(k.key)                                                                  AS cargo,
           btrim(m[1])                                                                   AS cidade,
           upper(m[2])                                                                   AS uf
      FROM public.unidades_oficiais u
      CROSS JOIN LATERAL (
            SELECT regexp_match(split_part(coalesce(u.endereco,''), ' - CEP:', 1),
                                '([^,/]+)/([A-Za-z]{2})\s*$') AS m
      ) a
      CROSS JOIN LATERAL jsonb_each_text(
            CASE WHEN u.limites_cargos IS NULL OR btrim(u.limites_cargos::text) = '' THEN '{}'::jsonb
                 ELSE u.limites_cargos::text::jsonb END
      ) k
     WHERE coalesce(u.ativo, true) = true
       AND a.m IS NOT NULL
       AND btrim(k.key) <> ''
       AND coalesce(nullif(regexp_replace(k.value, '[^0-9]', '', 'g'), ''), '1')::int > 0
     ORDER BY 1, 3, 2;
$$;

REVOKE ALL ON FUNCTION public.rs_vagas_publicas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rs_vagas_publicas() TO anon, authenticated;
