-- Estado da conversa "justificar teste" (Clara/WhatsApp). Rodar uma vez no Supabase.
CREATE TABLE IF NOT EXISTS public.justificativa_teste_estado (
  colaborador_id text PRIMARY KEY,
  etapa text NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.justificativa_teste_estado ENABLE ROW LEVEL SECURITY;
-- Sem policies: só a Edge Function (service role) lê e escreve.
