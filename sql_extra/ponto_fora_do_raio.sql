-- Opção por colaborador: pode bater ponto fora do raio da unidade?
-- Padrão = false (não permite). Só guarda a configuração: quem aplica é o app/Clara.
ALTER TABLE public.config_ponto_whatsapp
  ADD COLUMN IF NOT EXISTS permite_fora_raio boolean NOT NULL DEFAULT false;
