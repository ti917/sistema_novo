-- SÓ LEITURA (não altera nada). Rode DEPOIS da consulta 1 e me mande o resultado.
-- Mostra se existe algum gatilho (trigger) nas tabelas de lançamentos e se a função da Secretaria já existe.

select 'trigger' as tipo, event_object_table as tabela, trigger_name as nome, action_timing || ' ' || event_manipulation as detalhe
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('financeiro_lancamentos', 'secretaria_lancamentos', 'financeiro_centros_custo')
union all
select 'funcao', 'public', routine_name, ''
from information_schema.routines
where routine_schema = 'public' and routine_name in ('fn_secretaria_tem_acesso', 'fn_repasse_criar')
order by 1, 2, 3;
