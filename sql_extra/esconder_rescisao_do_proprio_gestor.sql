-- =====================================================================
-- ESCONDER A RESCISÃO DO PRÓPRIO GESTOR ATÉ A APROVAÇÃO GLOBAL (14/10/2026)
-- Enquanto o desligamento do colaborador vinculado a um Gestor estiver em
-- "Aguardando Aprovação Global" (e ainda não aprovado), esse Gestor NÃO consegue
-- ler a linha do colaborador na tabela perfis — nem pela API do Supabase.
-- Quando o Gestor Global aprova, o status muda e a linha volta a aparecer normal.
--
-- Como funciona (seguro): é uma regra RESTRITIVA de leitura. Ela só SUBTRAI acesso
-- (soma-se às regras que já existem, não substitui nenhuma). Vale somente para quem
-- tem "Colaborador Vinculado" configurado (permissoes.colaborador_vinculado_id).
-- Admin, RH e os outros Gestores não são afetados.
-- Limite: só o vínculo EXPLÍCITO é coberto (o caso "mesmo nome" não dá pra fazer no banco).
--
-- Seguro de rodar mais de uma vez.
-- Para DESFAZER: rode o bloco "DESFAZER" no final.
-- =====================================================================

-- 1) Função auxiliar (SECURITY DEFINER para não entrar em loop de segurança ao ler perfis)
CREATE OR REPLACE FUNCTION public.rh_vinculo_do_usuario()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NULLIF(p.permissoes ->> 'colaborador_vinculado_id', '')
    FROM public.perfis p
    WHERE p.id::text = auth.uid()::text
    LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.rh_vinculo_do_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rh_vinculo_do_usuario() TO authenticated;

-- 2) Regra restritiva de leitura
DROP POLICY IF EXISTS "esconde_rescisao_do_proprio_gestor" ON public.perfis;
CREATE POLICY "esconde_rescisao_do_proprio_gestor"
ON public.perfis
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
    -- só esconde quando AS DUAS coisas são verdadeiras: status represado E é o colaborador vinculado a quem está lendo.
    -- (IS DISTINCT FROM trata valores vazios/NULL como "diferente", então quem não tem vínculo nunca perde acesso)
    status_aprovacao IS DISTINCT FROM 'Aguardando Aprovação Global'
    OR id::text IS DISTINCT FROM public.rh_vinculo_do_usuario()
);

-- ---------------------------------------------------------------------
-- TESTE (opcional, depois de rodar): entre no sistema como o Gestor vinculado e confira
-- que a rescisão dele não aparece; como Admin/RH tudo continua igual.
--
-- DESFAZER (se algo estranho acontecer):
--   DROP POLICY IF EXISTS "esconde_rescisao_do_proprio_gestor" ON public.perfis;
--   DROP FUNCTION IF EXISTS public.rh_vinculo_do_usuario();
-- ---------------------------------------------------------------------
