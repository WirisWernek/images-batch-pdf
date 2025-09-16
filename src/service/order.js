const path = require('path');

/**
 * Service para ordenação de dados
 * Contém regras de negócio relacionadas à ordenação
 */

/**
 * Ordena arquivos numericamente (1, 2, 3, ..., 10, 11, etc.)
 * @param {string[]} files - Lista de nomes de arquivos
 * @returns {string[]} Lista ordenada numericamente
 */
const sortFilesNumerically = (files) => {
  return files.sort((a, b) => {
    const numA = parseInt(path.basename(a, path.extname(a)));
    const numB = parseInt(path.basename(b, path.extname(b)));
    
    // Se não conseguir extrair número, mantém ordem alfabética
    if (isNaN(numA) || isNaN(numB)) {
      return a.localeCompare(b);
    }
    
    return numA - numB;
  });
};

/**
 * Ordena objetos com informações de imagem por pasta e depois por índice
 * @param {Array} images - Array de objetos com informações de imagem
 * @returns {Array} Array ordenado
 */
const sortImagesByFolderAndIndex = (images) => {
  return images.sort((a, b) => {
    // Primeiro ordena por índice da pasta
    if (a.folderIndex !== b.folderIndex) {
      return a.folderIndex - b.folderIndex;
    }
    
    // Depois ordena por índice da imagem dentro da pasta
    return a.imageIndex - b.imageIndex;
  });
};

/**
 * Ordena entradas de CSV por nome ou ordem especificada
 * @param {Array} entries - Array de entradas do CSV
 * @param {string} [sortBy='name'] - Campo para ordenação ('name', 'path')
 * @returns {Array} Array ordenado
 */
const sortCsvEntries = (entries, sortBy = 'name') => {
  return entries.sort((a, b) => {
    const fieldA = a[sortBy] || '';
    const fieldB = b[sortBy] || '';
    
    return fieldA.localeCompare(fieldB);
  });
};

/**
 * Ordena pastas por nome de forma natural (considera números)
 * @param {Array} folders - Array de objetos com informações de pastas
 * @returns {Array} Array ordenado
 */
const sortFoldersNaturally = (folders) => {
  return folders.sort((a, b) => {
    return a.nome.localeCompare(b.nome, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
};

/**
 * Extrai número de um nome de arquivo para ordenação
 * @param {string} fileName - Nome do arquivo
 * @returns {number} Número extraído ou Infinity se não encontrar
 */
const extractNumberFromFileName = (fileName) => {
  const baseName = path.basename(fileName, path.extname(fileName));
  const number = parseInt(baseName);
  return isNaN(number) ? Infinity : number;
};

module.exports = {
  sortFilesNumerically,
  sortImagesByFolderAndIndex,
  sortCsvEntries,
  sortFoldersNaturally,
  extractNumberFromFileName
};
