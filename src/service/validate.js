const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

/**
 * Service para validação de dados e arquivos
 * Contém regras de negócio relacionadas à validação
 */

/**
 * Extensões de arquivo de imagem suportadas
 */
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

/**
 * Valida se um caminho de pasta existe e é acessível
 * @param {string} folderPath - Caminho da pasta
 * @throws {Error} Se a pasta não existir ou não for válida
 */
const validateFolderPath = async (folderPath) => {
  try {
    const stats = await fsPromises.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`O caminho especificado não é uma pasta: ${folderPath}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Pasta não encontrada: ${folderPath}`);
    }
    throw error;
  }
};

/**
 * Valida se um arquivo existe
 * @param {string} filePath - Caminho do arquivo
 * @throws {Error} Se o arquivo não existir
 */
const validateFilePath = async (filePath) => {
  try {
    const stats = await fsPromises.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`O caminho especificado não é um arquivo: ${filePath}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }
    throw error;
  }
};

/**
 * Valida entrada (pode ser arquivo CSV ou pasta)
 * @param {string} inputPath - Caminho de entrada
 * @returns {Promise<string>} Tipo de entrada ('csv' ou 'folder')
 */
const validateInput = async (inputPath) => {
  try {
    const stats = await fsPromises.stat(inputPath);
    
    if (stats.isFile()) {
      if (path.extname(inputPath).toLowerCase() === '.csv') {
        return 'csv';
      } else {
        throw new Error(`Arquivo deve ser CSV: ${inputPath}`);
      }
    } else if (stats.isDirectory()) {
      return 'folder';
    } else {
      throw new Error(`Caminho inválido: ${inputPath}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Caminho não encontrado: ${inputPath}`);
    }
    throw error;
  }
};

/**
 * Valida se um arquivo é uma imagem suportada
 * @param {string} fileName - Nome do arquivo
 * @returns {boolean} Se o arquivo é uma imagem suportada
 */
const isValidImageFile = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
};

/**
 * Valida se uma pasta contém imagens
 * @param {string} folderPath - Caminho da pasta
 * @returns {Promise<boolean>} Se a pasta contém imagens
 */
const folderHasImages = async (folderPath) => {
  try {
    const files = await fsPromises.readdir(folderPath);
    return files.some(file => isValidImageFile(file));
  } catch (error) {
    return false;
  }
};

/**
 * Valida argumentos obrigatórios
 * @param {Object} args - Objeto com argumentos
 * @param {string[]} requiredFields - Campos obrigatórios
 * @throws {Error} Se algum campo obrigatório estiver ausente
 */
const validateRequiredArgs = (args, requiredFields) => {
  const missing = requiredFields.filter(field => !args[field]);
  
  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
  }
};

/**
 * Valida se uma pasta de saída pode ser criada
 * @param {string} outputPath - Caminho de saída
 */
const validateOutputPath = async (outputPath) => {
  const dir = path.dirname(outputPath);
  
  try {
    await fsPromises.mkdir(dir, { recursive: true });
  } catch (error) {
    throw new Error(`Não foi possível criar diretório de saída: ${dir}`);
  }
};

module.exports = {
  validateFolderPath,
  validateFilePath,
  validateInput,
  isValidImageFile,
  folderHasImages,
  validateRequiredArgs,
  validateOutputPath,
  SUPPORTED_IMAGE_EXTENSIONS
};
