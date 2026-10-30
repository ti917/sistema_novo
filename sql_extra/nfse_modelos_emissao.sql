-- Modelos (com nome) para a tela "Emitir nova nota" (30/10/2026).
-- Rodar UMA vez no SQL Editor do Supabase. So' cria uma tabela nova.
-- Cada nome de modelo e' unico e pertence a um CNPJ de cliente (tomador).
create table if not exists public.nfse_modelos_emissao (
    nome text primary key,
    cliente_cnpj text not null,
    cliente_nome text,
    local_prestacao text,
    cod_servico text,
    descricao text,
    taxas jsonb,
    iss_retido boolean not null default false,
    pis_cofins_retido boolean not null default false,
    valor_padrao numeric,
    criado_por text,
    created_at timestamptz not null default now()
);
alter table public.nfse_modelos_emissao enable row level security;
drop policy if exists nfse_modelos_emissao_ler on public.nfse_modelos_emissao;
drop policy if exists nfse_modelos_emissao_inserir on public.nfse_modelos_emissao;
drop policy if exists nfse_modelos_emissao_alterar on public.nfse_modelos_emissao;
drop policy if exists nfse_modelos_emissao_apagar on public.nfse_modelos_emissao;
create policy nfse_modelos_emissao_ler on public.nfse_modelos_emissao for select to authenticated using (public.eh_usuario_financeiro());
create policy nfse_modelos_emissao_inserir on public.nfse_modelos_emissao for insert to authenticated with check (public.eh_usuario_financeiro());
create policy nfse_modelos_emissao_alterar on public.nfse_modelos_emissao for update to authenticated using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());
create policy nfse_modelos_emissao_apagar on public.nfse_modelos_emissao for delete to authenticated using (public.eh_usuario_financeiro());
