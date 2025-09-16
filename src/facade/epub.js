const { createSingleEpub, createMultipleEpubs } = require('../service/epub');
const { validateInput } = require('../service/validate');

/**
 * Facade para operações relacionadas ao EPUB
 * Agrega regras de processamento e orquestra chamadas aos services
 */

/**
 * Processa criação de arquivos EPUB baseado nos parâmetros
 * @param {Object} options - Opções de processamento
 * @param {string} options.inputPath - Caminho de entrada (CSV ou pasta)
 * @param {string} options.outputPath - Caminho de saída
 * @param {boolean} options.single - Se deve gerar arquivo único ou múltiplos
 * @returns {Promise<Object>} Resultado do processamento
 */
const processEpub = async (options) => {
  const { inputPath, outputPath, single } = options;

  console.log(`📚 Processando EPUB - Modo: ${single ? 'Arquivo único' : 'Múltiplos arquivos'}`);

  // Valida entrada
  const inputType = await validateInput(inputPath);
  
  let result;
  
  if (single) {
    // Modo arquivo único
    console.log('🔗 Gerando EPUB único com todas as imagens...');
    result = await createSingleEpub({
      inputPath,
      inputType,
      outputPath
    });
  } else {
    // Modo múltiplos arquivos
    console.log('📄 Gerando múltiplos arquivos EPUB...');
    result = await createMultipleEpubs({
      inputPath,
      inputType,
      outputPath
    });
  }

  console.log(`📊 Processamento concluído:`);
  console.log(`   📂 Arquivos gerados: ${result.filesCount}`);
  console.log(`   🖼️ Total de imagens: ${result.totalImages}`);

  return result;
};

module.exports = {
  processEpub
};
