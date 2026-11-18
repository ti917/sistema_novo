-- =====================================================================
-- SECRETARIA: abas "Veículos" e "Terrenos" (2 tabelas NOVAS, só da Secretaria)
-- 100% aditivo: cria 2 tabelas novas + RLS. Não mexe em RH/Financeiro/Comercial
-- nem em nenhuma tabela existente. Pode rodar de novo sem problema.
-- Acesso: mesma função da Secretaria (Super Admin ou "Somente Secretaria").
-- Anexos: ficam no bucket que a Secretaria já usa (anexos_secretaria); aqui
-- só guardamos o caminho + o tipo de cada arquivo (jsonb).
-- =====================================================================

-- ---------------------------- VEÍCULOS -------------------------------
create table if not exists public.secretaria_veiculos (
  id uuid primary key default gen_random_uuid(),
  -- identificação
  tipo text not null default 'Carro',              -- Carro | Moto | Caminhão | Utilitário | Outro
  descricao text not null,                         -- marca/modelo (ex.: Corolla XEi)
  placa text,
  renavam text,
  chassi text,
  cor text,
  ano_fabricacao int,
  ano_modelo int,
  proprietario text,                               -- em nome de quem está o documento
  -- situação
  situacao text not null default 'Em posse',       -- Em posse | À venda | Vendido
  -- compra
  data_compra date,
  valor_compra numeric(14,2),
  comprado_de text,                                -- vendedor anterior
  forma_pagamento_compra text,
  financiado boolean not null default false,
  financiamento_obs text,                          -- banco, parcelas, contrato...
  valor_atual numeric(14,2),                       -- valor de mercado/FIPE de referência
  -- venda
  data_venda date,
  valor_venda numeric(14,2),
  comprador_nome text,
  comprador_documento text,                        -- CPF/CNPJ
  comprador_telefone text,
  comprador_endereco text,
  forma_pagamento_venda text,
  recibo_assinado boolean not null default false,  -- recibo/ATPV assinado e reconhecido
  transferencia_feita boolean not null default false,
  data_transferencia date,                         -- comunicação de venda / transferência no Detran
  -- listas
  vencimentos jsonb not null default '[]'::jsonb,  -- [{id,titulo,data,valor,pago}]
  anexos jsonb not null default '[]'::jsonb,       -- [{caminho,tipo,nome}]
  observacoes text,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_secretaria_veiculos_situacao on public.secretaria_veiculos (situacao);

alter table public.secretaria_veiculos enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_veiculos;
create policy secretaria_acesso_total on public.secretaria_veiculos
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());

-- ---------------------------- TERRENOS / IMÓVEIS ----------------------
create table if not exists public.secretaria_imoveis (
  id uuid primary key default gen_random_uuid(),
  -- identificação
  tipo text not null default 'Terreno',            -- Terreno | Lote | Casa | Sala/Loja | Sítio/Chácara | Outro
  descricao text not null,                         -- apelido (ex.: Terreno Jardim América)
  endereco text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  area_m2 numeric(14,2),
  matricula text,                                  -- nº da matrícula do imóvel
  cartorio text,                                   -- cartório de registro de imóveis
  inscricao_municipal text,                        -- inscrição/cadastro do IPTU
  proprietario text,
  -- situação
  situacao text not null default 'Em posse',       -- Em posse | À venda | Vendido
  -- compra
  data_compra date,
  valor_compra numeric(14,2),
  comprado_de text,
  forma_pagamento_compra text,
  escritura_data date,
  registro_data date,                              -- data do registro da compra na matrícula
  valor_venal numeric(14,2),                       -- valor venal / avaliação
  -- venda
  data_venda date,
  valor_venda numeric(14,2),
  comprador_nome text,
  comprador_documento text,
  comprador_telefone text,
  comprador_endereco text,
  forma_pagamento_venda text,
  corretor text,
  comissao numeric(14,2),
  contrato_assinado boolean not null default false, -- contrato/promessa de compra e venda
  escritura_venda_feita boolean not null default false,
  data_registro_venda date,                        -- registro da transferência na matrícula
  -- listas
  vencimentos jsonb not null default '[]'::jsonb,
  anexos jsonb not null default '[]'::jsonb,
  observacoes text,
  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_secretaria_imoveis_situacao on public.secretaria_imoveis (situacao);

alter table public.secretaria_imoveis enable row level security;
drop policy if exists secretaria_acesso_total on public.secretaria_imoveis;
create policy secretaria_acesso_total on public.secretaria_imoveis
  for all to authenticated
  using (public.fn_secretaria_tem_acesso())
  with check (public.fn_secretaria_tem_acesso());
