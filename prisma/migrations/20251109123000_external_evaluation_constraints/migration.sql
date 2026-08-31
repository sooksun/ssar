-- AddUniqueIndex
CREATE UNIQUE INDEX `ExternalEvaluation_evidenceId_evaluatorName_key`
  ON `ExternalEvaluation`(`evidenceId`, `evaluatorName`);

