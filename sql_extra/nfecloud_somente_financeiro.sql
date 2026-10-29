-- Notas fiscais recebidas so' pra quem tem acesso ao Financeiro (29/10/2026).
--
-- Antes as 3 regras da tabela nfecloud_documentos eram "true" pra qualquer
-- usuario logado - inclusive quem so' tem acesso ao RH podia ler, criar e
-- ALTERAR qualquer coluna das notas (XML, valor, vencimento) pela API.
-- Agora exige o mesmo acesso que a tela do financeiro.html exige pra entrar
-- (sistemas_permitidos Financeiro / RH_Financeiro / Comercial_Financeiro /
-- Todos, ou o Super Admin). A sincronizacao da SEFAZ usa a chave de servico
-- e nao e' afetada. Essa tabela so' e' usada no financeiro.html.
--
-- Seguro porque o gatilho fn_trava_perfis_update impede o usuario de
-- alterar as proprias permissoes (conferido em 29/10/2026).
--
-- PRA DESFAZER: trocar public.eh_usuario_financeiro() por true nas 3 regras.

create or replace function public.eh_usuario_financeiro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.perfis p
        where p.id = auth.uid()
          and (p.id = 'fa338e33-18c9-467e-bf3e-34880fd9324e'
               or p.permissoes->>'sistemas_permitidos' in ('Financeiro', 'RH_Financeiro', 'Comercial_Financeiro', 'Todos'))
    );
$$;
revoke all on function public.eh_usuario_financeiro() from public, anon;
grant execute on function public.eh_usuario_financeiro() to authenticated;

alter policy financeiro_pode_ler_nfecloud_documentos on public.nfecloud_documentos
    using (public.eh_usuario_financeiro());
alter policy financeiro_pode_atualizar_status_revisao on public.nfecloud_documentos
    using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());
alter policy financeiro_pode_inserir_nfecloud_documentos on public.nfecloud_documentos
    with check (public.eh_usuario_financeiro());
