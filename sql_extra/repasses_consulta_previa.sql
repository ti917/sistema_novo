-- SÓ LEITURA (não altera nada). Rode no SQL Editor do Supabase e me mande o resultado
-- (clique em "Export" > CSV, ou tire print). Serve para eu gravar o repasse com os tipos certos.

-- 1) Colunas das tabelas de lançamentos
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('financeiro_lancamentos', 'financeiro_centros_custo', 'secretaria_lancamentos')
order by table_name, ordinal_position;
