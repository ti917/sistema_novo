-- Vaga publicada com "TODAS AS UNIDADES": no site, o cargo passa a valer pra TODAS as cidades/estados
-- das unidades ativas da empresa (inclusive unidades criadas depois). Sem repetir cidade/UF.
-- Só troca a função que alimenta o formulário "Trabalhe Conosco"; não mexe em dados. Pode rodar mais de uma vez.

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
                SELECT regexp_match(split_part(coalesce(u.endereco,''), ' - CEP:', 1), '([^,/]+)/([A-Za-z]{2})\s*$') AS m
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
