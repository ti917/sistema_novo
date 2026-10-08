-- =====================================================================
-- SEGURANÇA DE LOGIN (08/10/2026): código por e-mail em aparelho/navegador novo OU IP novo
-- (Admin e Gestor). O código é gerado e conferido NO SERVIDOR (Edge Function "verificar-acesso-login"),
-- nunca passa pelo navegador. Rode este SQL ANTES de publicar a função.
-- Seguro de rodar mais de uma vez.
-- =====================================================================

-- 1) IPs já confirmados em cada aparelho/navegador
ALTER TABLE public.dispositivos_login ADD COLUMN IF NOT EXISTS ips_conhecidos jsonb;

-- 2) Códigos de acesso (só a Edge Function com service role lê/escreve: RLS ligado e SEM policies)
CREATE TABLE IF NOT EXISTS public.codigos_acesso_login (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id uuid NOT NULL,
    fingerprint text NOT NULL,
    codigo_hash text NOT NULL,
    ip text,
    expira_em timestamptz NOT NULL,
    tentativas integer NOT NULL DEFAULT 0,
    usado boolean NOT NULL DEFAULT false,
    criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.codigos_acesso_login ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_codigos_acesso_login_busca
    ON public.codigos_acesso_login (colaborador_id, fingerprint, criado_em DESC);
