-- Transferência de estoque entre unidades (Financeiro > Almoxarifado > Estoque das Unidades)
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema (é idempotente).
--
-- Como funciona: cada transferência grava, de uma vez só (tudo ou nada):
--   1 SAÍDA na unidade de origem  (estoque_saidas)
--   1 ENTRADA na unidade de destino (estoque_entradas)
--   1 registro no histórico (estoque_transferencias) com quem fez, quando e o motivo.
-- O saldo de cada unidade continua sendo calculado pela mesma conta de sempre (entradas - saídas),
-- então nenhuma nota e nenhum lançamento antigo é alterado.
--
-- PRA DESFAZER TUDO: drop function public.fn_transferir_estoque(text,text,text,text,text,numeric,numeric,text,text);
--                    (e, se quiser, drop table public.estoque_transferencias; as colunas transferencia_id podem ficar)

-- 1) Histórico
CREATE TABLE IF NOT EXISTS public.estoque_transferencias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_origem     text NOT NULL,
  unidade_destino    text NOT NULL,
  produto            text NOT NULL,
  categoria          text,
  medida             text NOT NULL,
  quantidade         numeric NOT NULL CHECK (quantidade > 0),
  valor_unitario     numeric,
  motivo             text NOT NULL,
  transferido_por    text NOT NULL,
  transferido_por_id uuid,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  CHECK (unidade_origem <> unidade_destino)
);
CREATE INDEX IF NOT EXISTS estoque_transferencias_criado_idx ON public.estoque_transferencias (criado_em DESC);

ALTER TABLE public.estoque_transferencias ENABLE ROW LEVEL SECURITY;
-- Só leitura para usuários logados; quem grava é a função abaixo (security definer).
DROP POLICY IF EXISTS et_select ON public.estoque_transferencias;
CREATE POLICY et_select ON public.estoque_transferencias FOR SELECT TO authenticated USING (true);

-- 2) Liga a saída/entrada à transferência que as criou
ALTER TABLE public.estoque_saidas   ADD COLUMN IF NOT EXISTS transferencia_id uuid;
ALTER TABLE public.estoque_entradas ADD COLUMN IF NOT EXISTS transferencia_id uuid;

-- A saída de uma transferência não tem colaborador: garante que essas colunas aceitam vazio
-- (se já aceitavam, não muda nada).
DO $$ BEGIN
  BEGIN ALTER TABLE public.estoque_saidas ALTER COLUMN colaborador_id DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.estoque_saidas ALTER COLUMN nome_colaborador DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- 3) Trava: linhas criadas por transferência não podem ser editadas/apagadas isoladamente
--    (senão um lado some e o saldo fica errado). Para corrigir, faz-se uma transferência de volta.
CREATE OR REPLACE FUNCTION public.fn_bloqueia_mov_transferencia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.transferencia_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este movimento veio de uma transferência entre unidades e não pode ser alterado nem excluído. Para corrigir, faça uma transferência de volta.';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bloqueia_saida_transf ON public.estoque_saidas;
CREATE TRIGGER trg_bloqueia_saida_transf BEFORE UPDATE OR DELETE ON public.estoque_saidas
  FOR EACH ROW EXECUTE FUNCTION public.fn_bloqueia_mov_transferencia();
DROP TRIGGER IF EXISTS trg_bloqueia_entrada_transf ON public.estoque_entradas;
CREATE TRIGGER trg_bloqueia_entrada_transf BEFORE UPDATE OR DELETE ON public.estoque_entradas
  FOR EACH ROW EXECUTE FUNCTION public.fn_bloqueia_mov_transferencia();

-- 4) A transferência em si (atômica: se qualquer passo falhar, nada é gravado)
CREATE OR REPLACE FUNCTION public.fn_transferir_estoque(
  p_origem text, p_destino text, p_produto text, p_categoria text, p_medida text,
  p_quantidade numeric, p_valor_unitario numeric, p_motivo text, p_usuario text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id    uuid := gen_random_uuid();
  v_ent   numeric;
  v_sai   numeric;
  v_hoje  date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_vt    numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para transferir estoque.';
  END IF;
  IF coalesce(trim(p_origem),'') = '' OR coalesce(trim(p_destino),'') = '' THEN RAISE EXCEPTION 'Informe a unidade de origem e a de destino.'; END IF;
  IF p_origem = p_destino THEN RAISE EXCEPTION 'A unidade de destino precisa ser diferente da origem.'; END IF;
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'A quantidade precisa ser maior que zero.'; END IF;
  IF length(trim(coalesce(p_motivo,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo da transferência.'; END IF;

  -- evita duas transferências simultâneas do mesmo produto estourarem o saldo
  PERFORM pg_advisory_xact_lock(hashtext('transf|' || p_origem || '|' || p_produto || '|' || p_medida));

  SELECT coalesce(sum(quantidade),0) INTO v_ent FROM public.estoque_entradas WHERE unidade = p_origem AND produto = p_produto AND medida = p_medida;
  SELECT coalesce(sum(quantidade),0) INTO v_sai FROM public.estoque_saidas   WHERE unidade = p_origem AND produto = p_produto AND medida = p_medida;
  IF p_quantidade > (v_ent - v_sai) THEN
    RAISE EXCEPTION 'Saldo insuficiente em %: disponível %, pedido %.', p_origem, (v_ent - v_sai), p_quantidade;
  END IF;

  v_vt := CASE WHEN p_valor_unitario IS NULL THEN NULL ELSE round(p_quantidade * p_valor_unitario, 2) END;

  INSERT INTO public.estoque_transferencias (id, unidade_origem, unidade_destino, produto, categoria, medida, quantidade, valor_unitario, motivo, transferido_por, transferido_por_id)
  VALUES (v_id, p_origem, p_destino, p_produto, p_categoria, p_medida, p_quantidade, p_valor_unitario, trim(p_motivo), coalesce(nullif(trim(p_usuario),''),'Sistema'), auth.uid());

  INSERT INTO public.estoque_saidas (unidade, colaborador_id, nome_colaborador, produto, data_saida, quantidade, medida, registrado_por, transferencia_id)
  VALUES (p_origem, NULL, 'TRANSFERÊNCIA → ' || p_destino, p_produto, v_hoje, p_quantidade, p_medida, coalesce(nullif(trim(p_usuario),''),'Sistema'), v_id);

  INSERT INTO public.estoque_entradas (unidade, produto, categoria, data_entrada, quantidade, medida, valor_unitario, valor_total, registrado_por, transferencia_id)
  VALUES (p_destino, p_produto, p_categoria, v_hoje, p_quantidade, p_medida, p_valor_unitario, v_vt, coalesce(nullif(trim(p_usuario),''),'Sistema'), v_id);

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.fn_transferir_estoque(text,text,text,text,text,numeric,numeric,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_transferir_estoque(text,text,text,text,text,numeric,numeric,text,text) TO authenticated;
