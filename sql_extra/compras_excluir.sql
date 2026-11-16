-- Permite o Financeiro EXCLUIR pedidos de compra (itens e valores do pedido saem junto, por cascade).
-- Só mexe em compras_pedidos; não toca RH, Financeiro (notas, lançamentos) nem Comercial.
drop policy if exists compras_pedidos_delete_fin on public.compras_pedidos;
create policy compras_pedidos_delete_fin on public.compras_pedidos for delete to authenticated
using (public.eh_usuario_financeiro());
