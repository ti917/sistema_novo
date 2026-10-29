-- Horario da ultima consulta a SEFAZ (sefaz-sync, 29/10/2026).
--
-- O financeiro.html usa isso pra mostrar "Proxima atualizacao automatica em
-- X min": a proxima consulta sai 65 min depois da ultima. Devolve SO' o
-- horario (nada de NSU nem CNPJ) e so' pra usuario logado.
--
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema.
create or replace function public.sefaz_ultima_consulta()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
    select max(atualizado_em) from public.sefaz_nsu_controle;
$$;

revoke all on function public.sefaz_ultima_consulta() from public, anon;
grant execute on function public.sefaz_ultima_consulta() to authenticated;
