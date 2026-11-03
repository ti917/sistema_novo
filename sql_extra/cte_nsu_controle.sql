-- Cursor (ultimo NSU lido) da sincronizacao de CT-e (conhecimento de transporte) pelo
-- webservice CTeDistribuicaoDFe do Ambiente Nacional (scripts/cte-sync, 03/11/2026).
-- Uma linha por CNPJ. So' o script (chave de servico) mexe aqui; com RLS ligado e sem
-- nenhuma regra, usuario comum nao le nem altera.
--
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
create table if not exists public.cte_nsu_controle (
    cnpj text primary key,
    ultimo_nsu text not null default '0',
    atualizado_em timestamptz not null default now()
);
alter table public.cte_nsu_controle enable row level security;
