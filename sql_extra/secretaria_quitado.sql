-- =====================================================================
-- SECRETARIA: campo "Quitado?" em Veículos e Imóveis
-- 100% aditivo: só acrescenta 1 coluna (padrão "não quitado") nas 2 tabelas da Secretaria.
-- Não altera nem apaga nenhum dado existente. Pode rodar de novo sem problema.
-- Para desfazer (só se quiser):
--   alter table public.secretaria_veiculos drop column if exists quitado;
--   alter table public.secretaria_imoveis  drop column if exists quitado;
-- =====================================================================
alter table public.secretaria_veiculos add column if not exists quitado boolean not null default false;
alter table public.secretaria_imoveis  add column if not exists quitado boolean not null default false;
