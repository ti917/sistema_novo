-- Motivo da recusa em Férias, Ausências e Troca de Turno (o gestor passa a ver por que foi recusado)
-- Seguro: só ACRESCENTA colunas, não altera nenhum dado existente.
ALTER TABLE solicitacoes_ferias ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE solicitacoes_ferias ADD COLUMN IF NOT EXISTS recusado_por text;
ALTER TABLE ausencias ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE ausencias ADD COLUMN IF NOT EXISTS recusado_por text;
ALTER TABLE trocas_turno ADD COLUMN IF NOT EXISTS motivo_recusa text;
ALTER TABLE trocas_turno ADD COLUMN IF NOT EXISTS recusado_por text;
