-- Lista leve das Notas Fiscais (03/11/2026). Rodar UMA vez no SQL Editor do Supabase.
--
-- Por que: a tela Notas Fiscais trazia o XML completo de TODAS as notas (centenas de KB
-- por nota) só pra mostrar 20 por página. Esta "visão" devolve as mesmas colunas da tabela
-- nfecloud_documentos SEM o XML, e já calcula aqui no banco o que a tela tirava do XML:
-- situação (cSitNFe/cStat), data/hora de emissão, vencimento e se a nota tem XML.
-- O XML de cada nota é buscado só quando você clica em XML / PDF / Lançar.
--
-- Seguro: a visão usa security_invoker, então vale a MESMA regra de acesso (RLS) da tabela
-- (só o Financeiro lê). Se a visão não existir, a tela continua funcionando como antes.
-- PRA DESFAZER: drop view public.nfecloud_documentos_lista;
-- (Precisa de Postgres 15+, que é o padrão do Supabase. Se der erro em "security_invoker",
--  me avise antes de remover essa opção: sem ela a visão ignoraria a regra de acesso.)

do $$
declare
  cols text;
begin
  -- todas as colunas atuais da tabela, menos os dois XML (assim não preciso adivinhar o nome delas)
  select string_agg(format('d.%I', column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'nfecloud_documentos'
    and column_name not in ('xml_raw', 'xml_completo');

  execute format($v$
    create or replace view public.nfecloud_documentos_lista
    with (security_invoker = true) as
    select
      %s,
      (d.xml_completo is not null) as tem_xml_completo,
      (d.xml_raw is not null)      as tem_xml_raw,
      substring(d.xml_raw::text      from '<cSitNFe[^>]*>([^<]*)</cSitNFe>') as c_sit,
      substring(d.xml_completo::text from '<cStat[^>]*>([^<]*)</cStat>')     as c_stat,
      coalesce(
        substring(d.xml_raw::text      from '<dhEmi[^>]*>([^<]*)</dhEmi>'),
        substring(d.xml_completo::text from '<dhEmi[^>]*>([^<]*)</dhEmi>'),
        substring(d.xml_completo::text from '<dhProc[^>]*>([^<]*)</dhProc>')
      ) as dh_emi,
      -- vencimento: 1ª data e quantidade de parcelas do bloco <cobr> do XML completo
      (select min(m[1])
         from regexp_matches(substring(d.xml_completo::text from '<cobr[^>]*>(.*)</cobr>'),
                             '<dVenc>([^<]+)</dVenc>', 'g') as m)            as venc_primeiro,
      (select count(*)::int
         from regexp_matches(substring(d.xml_completo::text from '<cobr[^>]*>(.*)</cobr>'),
                             '<dVenc>([^<]+)</dVenc>', 'g') as m)            as venc_total
    from public.nfecloud_documentos d
  $v$, cols);
end
$$;

grant select on public.nfecloud_documentos_lista to authenticated;
