-- Separa as notas RECEBIDAS das ENVIADAS (emitidas pela empresa) na tabela
-- nfecloud_documentos (30/10/2026). Rodar UMA vez no SQL Editor do Supabase.
alter table public.nfecloud_documentos add column if not exists direcao text not null default 'recebida';
create index if not exists nfecloud_documentos_direcao_idx on public.nfecloud_documentos (direcao);

-- DEPOIS que o codigo novo estiver publicado e a coluna acima existir, rode este para a
-- sincronizacao de NFS-e reler o historico desde o comeco e guardar as emitidas que antes
-- eram descartadas (as recebidas sao regravadas iguais, sem mexer em status nem ciencia):
-- update public.nfse_nsu_controle set ultimo_nsu = 0;
