-- =====================================================================
-- PEDIDOS DE SELEÇÃO (Gestor pede candidatos ao RH e acompanha o andamento)
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
--
-- O Gestor só enxerga os pedidos DELE. O Admin enxerga e altera todos.
-- O andamento (recebido > selecionando > entrevista > aprovado > concluído) muda sozinho
-- quando o RH abre currículo / agenda entrevista / aprova no Recrutamento e Seleção.
--
-- Pra desfazer: DROP TABLE public.pedidos_selecao;
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pedidos_selecao (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    criado_em     timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    gestor_id     uuid        NOT NULL DEFAULT auth.uid(),
    gestor_nome   text,
    empresa       text,
    unidade       text        NOT NULL,
    cidade_uf     text,
    cargo         text        NOT NULL,
    quantidade    integer     NOT NULL CHECK (quantidade > 0),
    data_inicio   date        NOT NULL,
    observacao    text,
    etapa         text        NOT NULL DEFAULT 'recebido'
                  CHECK (etapa IN ('recebido','selecionando','entrevista','aprovado','concluido','cancelado')),
    entrevista_em timestamptz,
    historico     jsonb       NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pedidos_selecao_gestor ON public.pedidos_selecao (gestor_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_selecao_etapa  ON public.pedidos_selecao (etapa);

ALTER TABLE public.pedidos_selecao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedidos_selecao_select ON public.pedidos_selecao;
CREATE POLICY pedidos_selecao_select ON public.pedidos_selecao FOR SELECT TO authenticated
USING (
    gestor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.perfil = 'Admin')
);

DROP POLICY IF EXISTS pedidos_selecao_insert ON public.pedidos_selecao;
CREATE POLICY pedidos_selecao_insert ON public.pedidos_selecao FOR INSERT TO authenticated
WITH CHECK (
    gestor_id = auth.uid()
    AND etapa = 'recebido'
    AND EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.perfil IN ('Gestor','Admin'))
);

DROP POLICY IF EXISTS pedidos_selecao_update ON public.pedidos_selecao;
CREATE POLICY pedidos_selecao_update ON public.pedidos_selecao FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.perfil = 'Admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.perfil = 'Admin'));

DROP POLICY IF EXISTS pedidos_selecao_delete ON public.pedidos_selecao;
CREATE POLICY pedidos_selecao_delete ON public.pedidos_selecao FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.perfil = 'Admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_selecao TO authenticated;
