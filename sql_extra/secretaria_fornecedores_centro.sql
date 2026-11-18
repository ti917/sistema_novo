-- =====================================================================
-- SECRETARIA: vincular fornecedores a cada centro de custo (igual ao Financeiro)
-- Aditivo: 1 coluna nova na tabela NOVA da Secretaria + 1 permissão de UPDATE
-- só no centro CONTAS PARTICULARES DANIELA (para a secretária poder gravar os vínculos dele).
-- Não apaga nem altera dados existentes. Pode rodar de novo sem problema.
-- =====================================================================
alter table public.secretaria_centros_custo
  add column if not exists fornecedores jsonb not null default '[]'::jsonb;

drop policy if exists secretaria_particulares_update on public.financeiro_centros_custo;
create policy secretaria_particulares_update on public.financeiro_centros_custo
  for update to authenticated
  using (id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso())
  with check (id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid and public.fn_secretaria_tem_acesso());
