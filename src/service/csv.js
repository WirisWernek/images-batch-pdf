const { readCsvData, writeCsvData } = require('../infra/csv');
const { generateUUID } = require('../infra/csv');
const { listDirectoriesInPath } = require('../infra/csv');
const { sortFoldersNaturally } = require('./order');
const path = require('path');

/**
 * Service para operações de CSV
 * Contém regras de negócio relacionadas ao processamento de CSV
 */

/**
 * Analisa estrutura de uma pasta e gera arquivo CSV
 * @param {Object} options - Opções de análise
 * @param {string} options.folderPath - Caminho da pasta a ser analisada
 * @param {string} [options.outputName] - Nome personalizado para o CSV
 * @returns {Promise<Object>} Resultado da análise
 */
const analyzeFolderStructure = async (options) => {
  const { folderPath, outputName } = options;

  // Lista pastas filhas imediatas
  const folders = await listDirectoriesInPath(folderPath);
  
  // Ordena pastas naturalmente
  const sortedFolders = sortFoldersNaturally(folders);

  // Determina nome do arquivo CSV
  let csvFileName;
  if (outputName) {
    csvFileName = outputName.endsWith('.csv') ? outputName : `${outputName}.csv`;
  } else {
    const uuid = generateUUID(folderPath);
    csvFileName = `${uuid}.csv`;
  }

  // Define caminho completo do CSV
  const csvDir = path.join(process.cwd(), 'csv');
  const csvPath = path.join(csvDir, csvFileName);

  // Gera arquivo CSV
  await writeCsvData(sortedFolders, csvPath);

  // Retorna informações do resultado
  return {
    csvPath,
    csvFileName,
    foldersCount: sortedFolders.length,
    folders: sortedFolders
  };
};

/**
 * Lê e processa arquivo CSV
 * @param {string} csvPath - Caminho do arquivo CSV
 * @returns {Promise<Array>} Array de entradas do CSV
 */
const processCsvFile = async (csvPath) => {
  const entries = await readCsvData(csvPath);
  
  if (entries.length === 0) {
    throw new Error('Nenhuma entrada válida encontrada no arquivo CSV');
  }

  return entries;
};

/**
 * Valida entradas do CSV
 * @param {Array} entries - Array de entradas
 * @returns {Array} Entradas validadas
 */
const validateCsvEntries = (entries) => {
  const validEntries = entries.filter(entry => {
    return entry.nome && entry.caminho && 
           typeof entry.nome === 'string' && 
           typeof entry.caminho === 'string';
  });

  if (validEntries.length === 0) {
    throw new Error('Nenhuma entrada válida no CSV');
  }

  if (validEntries.length < entries.length) {
    console.warn(`⚠️ ${entries.length - validEntries.length} entrada(s) inválida(s) ignorada(s)`);
  }

  return validEntries;
};

module.exports = {
  analyzeFolderStructure,
  processCsvFile,
  validateCsvEntries
};
