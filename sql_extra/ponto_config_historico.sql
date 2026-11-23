-- Histórico (só acrescenta) das mudanças na configuração de ponto de cada pessoa:
-- quem alterou, quando, e de -> para (método, data que começou a bater ponto, fora do raio).
-- Rodar UMA vez no SQL Editor do Supabase. Sem isso a configuração continua salvando normalmente,
-- só não guarda o histórico.
ALTER TABLE public.config_ponto_whatsapp ADD COLUMN IF NOT EXISTS historico_config jsonb NOT NULL DEFAULT '[]'::jsonb;
