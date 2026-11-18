-- Secretaria: CNPJ e endereço opcionais nos centros de custo (igual ao Financeiro).
-- Só ADICIONA colunas na tabela nova da Secretaria. Não mexe em nenhuma tabela do RH/Financeiro/Comercial.
alter table public.secretaria_centros_custo add column if not exists cnpj text;
alter table public.secretaria_centros_custo add column if not exists endereco text;
