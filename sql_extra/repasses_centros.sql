-- =====================================================================
-- REPASSES ENTRE CENTROS DE CUSTO (Financeiro <-> Secretaria)
-- Rodar UMA vez no SQL Editor do Supabase.
--
-- 100% ADITIVO e SEGURO PARA O RH/FINANCEIRO/SECRETARIA JÁ EM USO:
--  * NÃO altera nenhuma tabela existente (nenhuma coluna nova, nenhum gatilho).
--  * Cria 1 tabela NOVA (financeiro_repasses) e funções NOVAS (fn_repasse_*).
--  * Não apaga, não move e não reescreve nenhum lançamento já existente.
--  * Cada repasse cria SEMPRE os dois lados de uma vez, dentro da mesma
--    transação: ou grava os dois (despesa na origem + receita no destino)
--    ou não grava nada. Nunca fica "pela metade".
--  * Estornar/Corrigir também atuam nos dois lados de uma vez.
--  * Pode rodar de novo sem problema (IF NOT EXISTS / CREATE OR REPLACE).
-- Depende de public.fn_secretaria_tem_acesso(), criada pelo secretaria.sql.
-- =====================================================================

-- 1) Quem tem acesso ao Financeiro (mesma regra do financeiro.html)
create or replace function public.fn_repasse_acesso_financeiro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and ( p.id = 'fa338e33-18c9-467e-bf3e-34880fd9324e'::uuid
            or coalesce(p.permissoes->>'sistemas_permitidos','RH') in ('Financeiro','RH_Financeiro','Comercial_Financeiro','Todos') )
  );
$$;
grant execute on function public.fn_repasse_acesso_financeiro() to authenticated;

-- 2) Tabela de repasses (o "recibo" de cada repasse; guarda tudo para auditoria)
create table if not exists public.financeiro_repasses (
  id uuid primary key default gen_random_uuid(),
  origem_tabela text not null check (origem_tabela in ('financeiro_lancamentos','secretaria_lancamentos')),
  origem_centro_id uuid not null,
  origem_centro_nome text,
  origem_lancamento_id uuid,
  destino_tabela text not null check (destino_tabela in ('financeiro_lancamentos','secretaria_lancamentos')),
  destino_centro_id uuid not null,
  destino_centro_nome text,
  destino_lancamento_id uuid,
  valor numeric not null check (valor > 0),
  data_repasse date not null,
  observacao text,
  status text not null default 'Ativo' check (status in ('Ativo','Estornado')),
  criado_por text,
  criado_em timestamptz not null default now(),
  corrigido_por text,
  corrigido_em timestamptz,
  valor_original numeric,
  estornado_por text,
  estornado_em timestamptz,
  motivo_estorno text
);
create index if not exists idx_repasses_origem  on public.financeiro_repasses (origem_centro_id, data_repasse);
create index if not exists idx_repasses_destino on public.financeiro_repasses (destino_centro_id, data_repasse);

-- 3) Segurança: só LEITURA direta (e só do que cada lado deve ver); a escrita é feita APENAS pelas funções abaixo
alter table public.financeiro_repasses enable row level security;
drop policy if exists repasses_leitura on public.financeiro_repasses;
create policy repasses_leitura on public.financeiro_repasses
  for select to authenticated
  using (
    ( public.fn_repasse_acesso_financeiro()
      and ( (origem_tabela  = 'financeiro_lancamentos' and origem_centro_id  <> '88f86646-a366-4f0d-81ed-f0231174654e'::uuid)
         or (destino_tabela = 'financeiro_lancamentos' and destino_centro_id <> '88f86646-a366-4f0d-81ed-f0231174654e'::uuid) ) )
    or
    ( public.fn_secretaria_tem_acesso()
      and ( origem_tabela = 'secretaria_lancamentos' or destino_tabela = 'secretaria_lancamentos'
         or origem_centro_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid
         or destino_centro_id = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid ) )
  );

-- 4) Auxiliar: este usuário pode mexer nesse centro? (Financeiro nos centros do Financeiro; Secretaria nos dela e nas Contas Particulares)
create or replace function public.fn_repasse_pode_centro(p_tabela text, p_centro uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_tabela = 'secretaria_lancamentos' then public.fn_secretaria_tem_acesso()
    when p_centro = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid then public.fn_secretaria_tem_acesso()
    else public.fn_repasse_acesso_financeiro()
  end;
$$;
grant execute on function public.fn_repasse_pode_centro(text, uuid) to authenticated;

-- 5) Lista de destinos possíveis (só id + nome; ninguém vê lançamentos do outro lado)
create or replace function public.fn_repasse_destinos()
returns table (id uuid, nome text, tabela text, empresa text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.fn_repasse_acesso_financeiro() or public.fn_secretaria_tem_acesso()) then
    raise exception 'Sem permissão para repasses.';
  end if;
  return query
    select c.id, c.nome_unidade::text, 'financeiro_lancamentos'::text, c.empresa::text
      from public.financeiro_centros_custo c
    union all
    select s.id, s.nome_unidade::text, 'secretaria_lancamentos'::text, null::text
      from public.secretaria_centros_custo s
    order by 2;
end;
$$;
grant execute on function public.fn_repasse_destinos() to authenticated;

-- 6) Auxiliar interno: nome do centro
create or replace function public.fn_repasse_nome_centro(p_tabela text, p_centro uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare v text;
begin
  if p_tabela = 'secretaria_lancamentos' then
    select nome_unidade::text into v from public.secretaria_centros_custo where id = p_centro;
  else
    select nome_unidade::text into v from public.financeiro_centros_custo where id = p_centro;
  end if;
  return v;
end;
$$;

-- 7) Auxiliar interno: grava UM lançamento (despesa ou receita) no centro/tabela indicados
create or replace function public.fn_repasse_gravar_lancamento(
  p_tabela text, p_centro uuid, p_tipo text, p_categoria text, p_fornecedor text,
  p_descricao text, p_valor numeric, p_data date, p_usuario text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_emp text; v_grupo text; v_mes text;
begin
  v_grupo := 'REP-' || replace(gen_random_uuid()::text, '-', '');
  v_mes := to_char(p_data, 'MM/YYYY');
  if p_tabela = 'secretaria_lancamentos' then
    insert into public.secretaria_lancamentos
      (grupo_id, centro_custo_id, tipo, categoria, fornecedor_nome, descricao, data_vencimento, data_pagamento,
       mes_referencia, valor_parcela, juros, parcela_atual, total_parcelas, valor_total, status, anexos, criado_por)
    values
      (v_grupo, p_centro, p_tipo, p_categoria, p_fornecedor, p_descricao, p_data, p_data,
       v_mes, p_valor, 0, 1, 1, p_valor, 'Pago', '[]'::jsonb, p_usuario)
    returning id into v_id;
  else
    -- o centro das Contas Particulares sempre grava empresa = null (igual à Secretaria); os demais herdam a empresa do centro
    if p_centro = '88f86646-a366-4f0d-81ed-f0231174654e'::uuid then v_emp := null;
    else select empresa::text into v_emp from public.financeiro_centros_custo where id = p_centro;
    end if;
    insert into public.financeiro_lancamentos
      (grupo_id, centro_custo_id, tipo, categoria, fornecedor_nome, descricao, data_vencimento, data_pagamento,
       mes_referencia, valor_parcela, juros, parcela_atual, total_parcelas, valor_total, status, anexos, empresa, criado_por)
    values
      (v_grupo, p_centro, p_tipo, p_categoria, p_fornecedor, p_descricao, p_data, p_data,
       v_mes, p_valor, 0, 1, 1, p_valor, 'Pago', '[]'::jsonb, v_emp, p_usuario)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- 8) REPASSAR: despesa na origem + receita no destino, juntas (mesma transação)
create or replace function public.fn_repasse_criar(
  p_origem_tabela text, p_origem_centro uuid,
  p_destino_tabela text, p_destino_centro uuid,
  p_valor numeric, p_data date, p_obs text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario text; v_no text; v_nd text; v_obs text;
  v_lo uuid; v_ld uuid; v_id uuid;
begin
  if p_origem_tabela not in ('financeiro_lancamentos','secretaria_lancamentos')
     or p_destino_tabela not in ('financeiro_lancamentos','secretaria_lancamentos') then
    raise exception 'Tabela inválida.';
  end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p_data is null then raise exception 'Informe a data do repasse.'; end if;
  if p_origem_centro = p_destino_centro then raise exception 'A origem e o destino não podem ser o mesmo centro de custo.'; end if;
  if not public.fn_repasse_pode_centro(p_origem_tabela, p_origem_centro) then
    raise exception 'Você não tem permissão para repassar a partir deste centro de custo.';
  end if;
  v_no := public.fn_repasse_nome_centro(p_origem_tabela, p_origem_centro);
  v_nd := public.fn_repasse_nome_centro(p_destino_tabela, p_destino_centro);
  if v_no is null then raise exception 'Centro de origem não encontrado.'; end if;
  if v_nd is null then raise exception 'Centro de destino não encontrado.'; end if;
  select coalesce(nome, 'Sistema') into v_usuario from public.perfis where id = auth.uid();
  v_obs := nullif(trim(coalesce(p_obs, '')), '');

  v_lo := public.fn_repasse_gravar_lancamento(p_origem_tabela, p_origem_centro, 'Despesa', 'Repasse entre centros',
            upper(v_nd), 'REPASSE PARA ' || upper(v_nd) || coalesce(' - ' || upper(v_obs), ''), p_valor, p_data, v_usuario);
  v_ld := public.fn_repasse_gravar_lancamento(p_destino_tabela, p_destino_centro, 'Receita', 'Repasse recebido',
            upper(v_no), 'REPASSE RECEBIDO DE ' || upper(v_no) || coalesce(' - ' || upper(v_obs), ''), p_valor, p_data, v_usuario);

  insert into public.financeiro_repasses
    (origem_tabela, origem_centro_id, origem_centro_nome, origem_lancamento_id,
     destino_tabela, destino_centro_id, destino_centro_nome, destino_lancamento_id,
     valor, data_repasse, observacao, criado_por)
  values
    (p_origem_tabela, p_origem_centro, v_no, v_lo,
     p_destino_tabela, p_destino_centro, v_nd, v_ld,
     p_valor, p_data, v_obs, v_usuario)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.fn_repasse_criar(text, uuid, text, uuid, numeric, date, text) to authenticated;

-- 9) CORRIGIR valor/data de um repasse (atualiza os dois lados juntos)
create or replace function public.fn_repasse_corrigir(
  p_repasse uuid, p_valor numeric, p_data date, p_obs text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.financeiro_repasses%rowtype; v_usuario text; v_obs text; v_mes text;
begin
  select * into r from public.financeiro_repasses where id = p_repasse for update;
  if not found then raise exception 'Repasse não encontrado.'; end if;
  if r.status <> 'Ativo' then raise exception 'Este repasse já foi estornado.'; end if;
  if not (public.fn_repasse_pode_centro(r.origem_tabela, r.origem_centro_id)
          or public.fn_repasse_pode_centro(r.destino_tabela, r.destino_centro_id)) then
    raise exception 'Você não tem permissão para alterar este repasse.';
  end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p_data is null then raise exception 'Informe a data do repasse.'; end if;
  select coalesce(nome, 'Sistema') into v_usuario from public.perfis where id = auth.uid();
  v_obs := nullif(trim(coalesce(p_obs, '')), '');
  v_mes := to_char(p_data, 'MM/YYYY');

  if r.origem_tabela = 'secretaria_lancamentos' then
    update public.secretaria_lancamentos set valor_parcela = p_valor, valor_total = p_valor,
      data_vencimento = p_data, data_pagamento = p_data, mes_referencia = v_mes,
      descricao = 'REPASSE PARA ' || upper(r.destino_centro_nome) || coalesce(' - ' || upper(v_obs), ''),
      atualizado_por = v_usuario, atualizado_em = now()
      where id = r.origem_lancamento_id;
  else
    update public.financeiro_lancamentos set valor_parcela = p_valor, valor_total = p_valor,
      data_vencimento = p_data, data_pagamento = p_data, mes_referencia = v_mes,
      descricao = 'REPASSE PARA ' || upper(r.destino_centro_nome) || coalesce(' - ' || upper(v_obs), '')
      where id = r.origem_lancamento_id;
  end if;
  if r.destino_tabela = 'secretaria_lancamentos' then
    update public.secretaria_lancamentos set valor_parcela = p_valor, valor_total = p_valor,
      data_vencimento = p_data, data_pagamento = p_data, mes_referencia = v_mes,
      descricao = 'REPASSE RECEBIDO DE ' || upper(r.origem_centro_nome) || coalesce(' - ' || upper(v_obs), ''),
      atualizado_por = v_usuario, atualizado_em = now()
      where id = r.destino_lancamento_id;
  else
    update public.financeiro_lancamentos set valor_parcela = p_valor, valor_total = p_valor,
      data_vencimento = p_data, data_pagamento = p_data, mes_referencia = v_mes,
      descricao = 'REPASSE RECEBIDO DE ' || upper(r.origem_centro_nome) || coalesce(' - ' || upper(v_obs), '')
      where id = r.destino_lancamento_id;
  end if;

  update public.financeiro_repasses set
    valor_original = coalesce(valor_original, valor), valor = p_valor, data_repasse = p_data, observacao = v_obs,
    corrigido_por = v_usuario, corrigido_em = now()
  where id = p_repasse;
end;
$$;
grant execute on function public.fn_repasse_corrigir(uuid, numeric, date, text) to authenticated;

-- 10) ESTORNAR: o valor volta para a origem (some a despesa da origem e a receita do destino, juntas).
--     O registro do repasse FICA guardado como "Estornado" (quem, quando e por quê), para auditoria.
create or replace function public.fn_repasse_estornar(p_repasse uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r public.financeiro_repasses%rowtype; v_usuario text;
begin
  select * into r from public.financeiro_repasses where id = p_repasse for update;
  if not found then raise exception 'Repasse não encontrado.'; end if;
  if r.status <> 'Ativo' then raise exception 'Este repasse já foi estornado.'; end if;
  if not (public.fn_repasse_pode_centro(r.origem_tabela, r.origem_centro_id)
          or public.fn_repasse_pode_centro(r.destino_tabela, r.destino_centro_id)) then
    raise exception 'Você não tem permissão para estornar este repasse.';
  end if;
  select coalesce(nome, 'Sistema') into v_usuario from public.perfis where id = auth.uid();

  if r.origem_tabela = 'secretaria_lancamentos' then
    delete from public.secretaria_lancamentos where id = r.origem_lancamento_id;
  else
    delete from public.financeiro_lancamentos where id = r.origem_lancamento_id;
  end if;
  if r.destino_tabela = 'secretaria_lancamentos' then
    delete from public.secretaria_lancamentos where id = r.destino_lancamento_id;
  else
    delete from public.financeiro_lancamentos where id = r.destino_lancamento_id;
  end if;

  update public.financeiro_repasses set status = 'Estornado', estornado_por = v_usuario, estornado_em = now(),
    motivo_estorno = nullif(trim(coalesce(p_motivo, '')), '')
  where id = p_repasse;
end;
$$;
grant execute on function public.fn_repasse_estornar(uuid, text) to authenticated;

-- 11) Ninguém chama as funções internas direto (só as fn_repasse_* públicas acima)
revoke all on function public.fn_repasse_nome_centro(text, uuid) from public, anon, authenticated;
revoke all on function public.fn_repasse_gravar_lancamento(text, uuid, text, text, text, text, numeric, date, text) from public, anon, authenticated;
