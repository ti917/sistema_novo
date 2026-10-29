-- Cursor (ultimo NSU lido) da sincronizacao de NFS-e pela API nacional do ADN
-- (scripts/nfse-sync, 29/10/2026). Uma linha por CNPJ. So' o script (chave de servico)
-- mexe aqui; com RLS ligado e sem nenhuma regra, usuario comum nao le nem altera.
--
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
create table if not exists public.nfse_nsu_controle (
    cnpj text primary key,
    ultimo_nsu bigint not null default 0,
    atualizado_em timestamptz not null default now()
);
alter table public.nfse_nsu_controle enable row level security;
