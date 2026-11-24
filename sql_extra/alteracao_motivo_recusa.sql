-- Motivo da recusa de uma Alteração Cadastral (o gestor passa a ver por que foi negada)
-- Seguro: só ACRESCENTA colunas, não mexe em nenhum dado existente.
ALTER TABLE solicitacoes_alteracao ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE solicitacoes_alteracao ADD COLUMN IF NOT EXISTS recusado_por text;
