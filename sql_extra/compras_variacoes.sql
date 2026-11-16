-- COMPRAS: tamanhos (variações) do produto e motivo da compra (16/11/2026)
-- Rodar UMA vez no SQL Editor do Supabase, DEPOIS do compras_pedidos.sql. Pode rodar de novo sem problema.
-- Só ACRESCENTA colunas nas tabelas novas de compras (compras_*). Nenhuma tabela do RH/Financeiro é tocada.
-- PRA DESFAZER: alter table public.compras_catalogo drop column variacoes;
--               alter table public.compras_pedido_itens drop column variacao;
--               alter table public.compras_pedidos drop column motivo_compra;

alter table public.compras_catalogo     add column if not exists variacoes     text;  -- ex.: "P, M, G, GG"
alter table public.compras_pedido_itens add column if not exists variacao      text;  -- tamanho escolhido pelo gestor
alter table public.compras_pedidos      add column if not exists motivo_compra text;  -- por que a compra é necessária
