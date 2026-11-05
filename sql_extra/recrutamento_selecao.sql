-- =====================================================================
-- RECRUTAMENTO E SELEÇÃO (substitui o uso do "Banco de Currículos")
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- 1) Colunas novas em banco_curriculos (lido/não lido, entrevista, arquivo)
-- 2) Marca os currículos ANTIGOS no novo fluxo (nada some)
-- 3) RPC pública pro site: lista cargo + cidade/UF das vagas ATIVAS do RH (sem nome de unidade)
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
-- RPC pro SITE PÚBLICO: devolve só (cargo, cidade, uf) das VAGAS ATIVAS publicadas
-- pelo RH em "Gestão de Vagas Abertas" (tabela vagas_site). O candidato só consegue
-- se candidatar a uma vaga que o RH publicou. NÃO devolve unidade/empresa.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rs_vagas_publicas();
CREATE FUNCTION public.rs_vagas_publicas()
RETURNS TABLE (cargo text, cidade text, uf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT t.cargo, t.cidade, t.uf FROM (
        -- Vagas de uma unidade específica (cidade/UF da própria vaga)
        SELECT DISTINCT
               btrim(v.titulo)                                AS cargo,
               COALESCE(btrim(a.m[1]), btrim(v.cidade))       AS cidade,
               COALESCE(upper(a.m[2]), '')                    AS uf
          FROM public.vagas_site v
          CROSS JOIN LATERAL (
                SELECT regexp_match(btrim(coalesce(v.cidade,'')), '^(.*?)\s*[/\-–,]\s*([A-Za-z]{2})$') AS m
          ) a
         WHERE v.ativa = true
           AND btrim(coalesce(v.titulo,'')) <> ''
           AND btrim(coalesce(v.cidade,'')) <> ''
           AND upper(btrim(v.cidade)) <> 'TODAS'

        UNION

        -- Vagas "TODAS AS UNIDADES": uma linha por cidade/UF de cada unidade ativa da mesma empresa
        SELECT DISTINCT
               btrim(v.titulo)                                AS cargo,
               btrim(a.m[1])                                  AS cidade,
               upper(a.m[2])                                  AS uf
          FROM public.vagas_site v
          JOIN public.unidades_oficiais u
            ON u.empresa = v.empresa AND u.ativo = true
          CROSS JOIN LATERAL (
                SELECT regexp_match(split_part(coalesce(u.endereco,''), ' - CEP:', 1), '([^,/]+)\s*[/–-]\s*([A-Za-z]{2})\s*$') AS m
          ) a
         WHERE v.ativa = true
           AND btrim(coalesce(v.titulo,'')) <> ''
           AND upper(btrim(coalesce(v.cidade,''))) = 'TODAS'
           AND a.m IS NOT NULL
    ) t
    ORDER BY 1, 3, 2;
$$;

REVOKE ALL ON FUNCTION public.rs_vagas_publicas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rs_vagas_publicas() TO anon, authenticated;
