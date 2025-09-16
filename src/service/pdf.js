const { processCsvFile, validateCsvEntries } = require('./csv');
const { collectImagesFromFolder, collectImagesFromMultipleFolders } = require('../infra/pdf');
const { createPdfDocument, createMergedPdfDocument } = require('../infra/pdf');
const { validateOutputPath } = require('./validate');
const path = require('path');

/**
 * Service para operações de PDF
 * Contém regras de negócio relacionadas à geração de PDFs
 */

/**
 * Cria um único arquivo PDF com todas as imagens
 * @param {Object} options - Opções de criação
 * @param {string} options.inputPath - Caminho de entrada
 * @param {string} options.inputType - Tipo de entrada ('csv' ou 'folder')
 * @param {string} options.outputPath - Caminho de saída
 * @returns {Promise<Object>} Resultado da criação
 */
const createSinglePdf = async (options) => {
  const { inputPath, inputType, outputPath } = options;

  let allImages = [];
  let filesCount = 1;

  if (inputType === 'csv') {
    // Processa múltiplas pastas do CSV
    const entries = await processCsvFile(inputPath);
    const validEntries = validateCsvEntries(entries);
    
    allImages = await collectImagesFromMultipleFolders(validEntries);
    
    // Nome do arquivo baseado no CSV
    const csvBaseName = path.basename(inputPath, '.csv');
    const outputFileName = `${csvBaseName}.pdf`;
    const fullOutputPath = path.join(outputPath, outputFileName);
    
    await validateOutputPath(fullOutputPath);
    await createMergedPdfDocument(allImages, fullOutputPath, csvBaseName);
    
  } else if (inputType === 'folder') {
    // Processa uma única pasta
    const folderName = path.basename(inputPath);
    allImages = await collectImagesFromFolder(inputPath);
    
    const outputFileName = `${folderName}.pdf`;
    const fullOutputPath = path.join(outputPath, outputFileName);
    
    await validateOutputPath(fullOutputPath);
    
    // Cria array com informações das imagens para compatibilidade
    const imagesWithInfo = allImages.map((imagePath, index) => ({
      path: imagePath,
      filename: path.basename(imagePath),
      folderName: folderName,
      folderIndex: 1,
      imageIndex: index + 1,
      totalInFolder: allImages.length
    }));
    
    await createMergedPdfDocument(imagesWithInfo, fullOutputPath, folderName);
  }

  return {
    filesCount,
    totalImages: allImages.length,
    outputPath
  };
};

/**
 * Cria múltiplos arquivos PDF, um para cada pasta
 * @param {Object} options - Opções de criação
 * @param {string} options.inputPath - Caminho de entrada
 * @param {string} options.inputType - Tipo de entrada ('csv' ou 'folder')
 * @param {string} options.outputPath - Caminho de saída
 * @returns {Promise<Object>} Resultado da criação
 */
const createMultiplePdfs = async (options) => {
  const { inputPath, inputType, outputPath } = options;

  let filesCount = 0;
  let totalImages = 0;

  if (inputType === 'csv') {
    // Processa múltiplas pastas do CSV
    const entries = await processCsvFile(inputPath);
    const validEntries = validateCsvEntries(entries);
    
    for (const entry of validEntries) {
      try {
        console.log(`📁 Processando: ${entry.nome}`);
        
        const images = await collectImagesFromFolder(entry.caminho);
        
        if (images.length === 0) {
          console.warn(`⚠️ Pasta ${entry.nome} não contém imagens válidas`);
          continue;
        }
        
        const outputFileName = `${entry.nome}.pdf`;
        const fullOutputPath = path.join(outputPath, outputFileName);
        
        await validateOutputPath(fullOutputPath);
        await createPdfDocument(images, fullOutputPath);
        
        filesCount++;
        totalImages += images.length;
        
        console.log(`✅ PDF criado: ${outputFileName} (${images.length} imagens)`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${entry.nome}: ${error.message}`);
      }
    }
    
  } else if (inputType === 'folder') {
    // Processa uma única pasta (mesmo resultado que single para folder)
    const folderName = path.basename(inputPath);
    const images = await collectImagesFromFolder(inputPath);
    
    const outputFileName = `${folderName}.pdf`;
    const fullOutputPath = path.join(outputPath, outputFileName);
    
    await validateOutputPath(fullOutputPath);
    await createPdfDocument(images, fullOutputPath);
    
    filesCount = 1;
    totalImages = images.length;
  }

  return {
    filesCount,
    totalImages,
    outputPath
  };
};

module.exports = {
  createSinglePdf,
  createMultiplePdfs
};
