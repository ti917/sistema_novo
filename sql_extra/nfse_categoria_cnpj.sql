-- Categoria automatica das NFS-e por CNPJ do prestador (30/10/2026).
-- Rodar UMA vez no SQL Editor do Supabase. So' cria uma tabela nova (nao mexe em nada existente).
-- Quem tem acesso ao Financeiro cadastra "CNPJ -> categoria"; toda NFS-e desse CNPJ (as que ja
-- existem e as novas) aparece com a categoria na tela Notas Fiscais.
create table if not exists public.nfse_categoria_cnpj (
    cnpj text primary key,            -- so' digitos
    nome_prestador text,
    categoria text not null,
    criado_por text,
    created_at timestamptz not null default now()
);
alter table public.nfse_categoria_cnpj enable row level security;
drop policy if exists nfse_categoria_cnpj_ler on public.nfse_categoria_cnpj;
drop policy if exists nfse_categoria_cnpj_inserir on public.nfse_categoria_cnpj;
drop policy if exists nfse_categoria_cnpj_alterar on public.nfse_categoria_cnpj;
drop policy if exists nfse_categoria_cnpj_apagar on public.nfse_categoria_cnpj;
create policy nfse_categoria_cnpj_ler on public.nfse_categoria_cnpj for select to authenticated using (public.eh_usuario_financeiro());
create policy nfse_categoria_cnpj_inserir on public.nfse_categoria_cnpj for insert to authenticated with check (public.eh_usuario_financeiro());
create policy nfse_categoria_cnpj_alterar on public.nfse_categoria_cnpj for update to authenticated using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());
create policy nfse_categoria_cnpj_apagar on public.nfse_categoria_cnpj for delete to authenticated using (public.eh_usuario_financeiro());
