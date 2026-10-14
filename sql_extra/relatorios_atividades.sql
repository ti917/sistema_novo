-- Relatório de Atividades (Gestor escreve; Financeiro/Admin lê os enviados)
-- Rodar uma vez no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS public.relatorios_atividades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id      uuid NOT NULL,
  gestor_nome    text,
  titulo         text NOT NULL DEFAULT 'Relatório de Atividades',
  mes_referencia text,                       -- 'AAAA-MM'
  unidade        text,
  conteudo_html  text,                       -- texto do editor
  imagens        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id,url,page,x,y,w,h}]
  status         text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado')),
  pdf_url        text,
  enviado_em     timestamptz,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relatorios_atividades_gestor_idx ON public.relatorios_atividades (gestor_id, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS relatorios_atividades_status_idx ON public.relatorios_atividades (status, enviado_em DESC);

ALTER TABLE public.relatorios_atividades ENABLE ROW LEVEL SECURITY;

-- Gestor: vê e mexe só nos próprios relatórios (enviado não pode ser alterado nem apagado)
DROP POLICY IF EXISTS ra_gestor_select ON public.relatorios_atividades;
CREATE POLICY ra_gestor_select ON public.relatorios_atividades FOR SELECT TO authenticated
  USING (gestor_id = auth.uid());

DROP POLICY IF EXISTS ra_gestor_insert ON public.relatorios_atividades;
CREATE POLICY ra_gestor_insert ON public.relatorios_atividades FOR INSERT TO authenticated
  WITH CHECK (gestor_id = auth.uid());

DROP POLICY IF EXISTS ra_gestor_update ON public.relatorios_atividades;
CREATE POLICY ra_gestor_update ON public.relatorios_atividades FOR UPDATE TO authenticated
  USING (gestor_id = auth.uid() AND status = 'rascunho')
  WITH CHECK (gestor_id = auth.uid());

DROP POLICY IF EXISTS ra_gestor_delete ON public.relatorios_atividades;
CREATE POLICY ra_gestor_delete ON public.relatorios_atividades FOR DELETE TO authenticated
  USING (gestor_id = auth.uid() AND status = 'rascunho');

-- Financeiro e Admin: leem somente os ENVIADOS
DROP POLICY IF EXISTS ra_financeiro_select ON public.relatorios_atividades;
CREATE POLICY ra_financeiro_select ON public.relatorios_atividades FOR SELECT TO authenticated
  USING (
    status = 'enviado' AND EXISTS (
      SELECT 1 FROM public.perfis p
      WHERE p.id = auth.uid()
        AND ( p.perfil = 'Admin'
              OR p.permissoes->>'sistemas_permitidos' IN ('Financeiro','RH_Financeiro','Comercial_Financeiro','Todos') )
    )
  );
