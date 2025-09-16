const { analyzeFolderStructure } = require('../service/csv');
const { validateFolderPath } = require('../service/validate');

/**
 * Facade para operações relacionadas ao CSV
 * Agrega regras de processamento e orquestra chamadas aos services
 */

/**
 * Analisa uma pasta e gera arquivo CSV com a estrutura de subpastas
 * @param {Object} options - Opções de processamento
 * @param {string} options.folderPath - Caminho da pasta a ser analisada
 * @param {string} [options.outputName] - Nome personalizado para o CSV
 * @returns {Promise<Object>} Resultado com caminho do CSV gerado
 */
const analyzeFolders = async (options) => {
  const { folderPath, outputName } = options;

  console.log(`🔍 Analisando estrutura da pasta: ${folderPath}`);

  // Valida o caminho da pasta
  await validateFolderPath(folderPath);

  // Processa análise da estrutura
  const result = await analyzeFolderStructure({
    folderPath,
    outputName
  });

  console.log(`📋 Encontradas ${result.foldersCount} pasta(s)`);
  console.log(`💾 CSV gerado: ${result.csvPath}`);

  return result;
};

module.exports = {
  analyzeFolders
};
