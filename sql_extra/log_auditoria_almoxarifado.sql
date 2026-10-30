-- Liga o Almoxarifado, os Insumos e o status das Notas Recebidas ao log de auditoria
-- do Financeiro (30/10/2026). Reaproveita a funcao fn_soulfin_log() que ja grava o
-- log das outras 6 tabelas; so' ensina ela a descrever essas tabelas e a nao guardar
-- o XML gigante da nota dentro do log. Rodar uma vez no SQL Editor do Supabase.
-- PRA DESFAZER: drop trigger trg_logfin_<tabela> on <tabela>; (as 3 abaixo).

create or replace function public.fn_soulfin_log()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  j_antes    jsonb;
  j_depois   jsonb;
  v_id       text;
  v_desc     text;
  v_empresa  text;
  v_v_antes  numeric;
  v_v_depois numeric;
  v_campos   text[];
begin
  if (tg_op = 'DELETE') then
    j_antes := to_jsonb(old); j_depois := null;
  elsif (tg_op = 'UPDATE') then
    j_antes := to_jsonb(old); j_depois := to_jsonb(new);
  else
    j_antes := null;          j_depois := to_jsonb(new);
  end if;

  v_id := coalesce(j_depois ->> 'id', j_antes ->> 'id');

  v_desc := coalesce(
    j_depois ->> 'descricao',            j_antes ->> 'descricao',
    j_depois ->> 'nome_unidade',         j_antes ->> 'nome_unidade',
    j_depois ->> 'nome_empresa_cliente', j_antes ->> 'nome_empresa_cliente',
    j_depois ->> 'nome',                 j_antes ->> 'nome',
    case when tg_table_name = 'almoxarifado_notas' then
      'NF ' || coalesce(j_depois ->> 'numero_nf', j_antes ->> 'numero_nf', 's/n') || ' - ' || coalesce(j_depois ->> 'fornecedor', j_antes ->> 'fornecedor', '')
    end,
    case when tg_table_name = 'nfecloud_documentos' then
      'NF recebida ' || coalesce(j_depois ->> 'numero', j_antes ->> 'numero', 's/n') || ' - ' || coalesce(j_depois ->> 'emitente_nome', j_antes ->> 'emitente_nome', '')
    end,
    '(sem descrição)'
  );

  v_empresa := coalesce(j_depois ->> 'empresa', j_antes ->> 'empresa');

  v_v_antes := nullif(coalesce(
    j_antes ->> 'valor_parcela', j_antes ->> 'valor_total',
    j_antes ->> 'valor_bruto',   j_antes ->> 'valor_padrao'), '')::numeric;

  v_v_depois := nullif(coalesce(
    j_depois ->> 'valor_parcela', j_depois ->> 'valor_total',
    j_depois ->> 'valor_bruto',   j_depois ->> 'valor_padrao'), '')::numeric;

  if (tg_op = 'UPDATE') then
    v_campos := array(
      select key from jsonb_each_text(j_depois)
      where key not in ('atualizado_em','created_at','criado_em')
        and coalesce(j_antes ->> key, '~~') is distinct from coalesce(j_depois ->> key, '~~')
    );
    if (v_campos is null or array_length(v_campos,1) is null) then
      return coalesce(new, old);
    end if;
  end if;

  -- XML da nota e' grande e ja esta guardado na propria nota: nao duplica no log
  if j_antes is not null then j_antes := j_antes - 'xml_raw' - 'xml_completo'; end if;
  if j_depois is not null then j_depois := j_depois - 'xml_raw' - 'xml_completo'; end if;

  insert into public.financeiro_log_alteracoes (
    tabela, registro_id, acao, usuario_id, usuario_nome, empresa,
    descricao_registro, valor_antes, valor_depois, campos_alterados,
    dados_antes, dados_depois
  ) values (
    tg_table_name, v_id, tg_op,
    auth.uid(), public.fn_soulfin_usuario_nome(), v_empresa,
    left(v_desc, 400), v_v_antes, v_v_depois, v_campos,
    j_antes, j_depois
  );

  return coalesce(new, old);

exception when others then
  raise warning 'Falha ao gravar log financeiro: %', sqlerrm;
  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_logfin_almoxarifado_notas on public.almoxarifado_notas;
create trigger trg_logfin_almoxarifado_notas
  after insert or update or delete on public.almoxarifado_notas
  for each row execute function public.fn_soulfin_log();

drop trigger if exists trg_logfin_financeiro_insumos on public.financeiro_insumos;
create trigger trg_logfin_financeiro_insumos
  after insert or update or delete on public.financeiro_insumos
  for each row execute function public.fn_soulfin_log();

-- Notas recebidas: so' quando mudam o STATUS (Pendente / Lançada / Ignorada); a
-- sincronizacao da SEFAZ (que insere/atualiza centenas de notas) nao entra no log.
drop trigger if exists trg_logfin_nfecloud_documentos on public.nfecloud_documentos;
create trigger trg_logfin_nfecloud_documentos
  after update of status_revisao on public.nfecloud_documentos
  for each row execute function public.fn_soulfin_log();
