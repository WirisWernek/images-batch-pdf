const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Infraestrutura para operações de CSV
 * Interage diretamente com o sistema de arquivos para leitura e escrita de CSV
 */

/**
 * Gera um UUID baseado no timestamp atual e no caminho da pasta
 * @param {string} folderPath - Caminho da pasta
 * @returns {string} UUID gerado
 */
const generateUUID = (folderPath) => {
  const timestamp = Date.now().toString();
  const pathHash = crypto.createHash('md5').update(folderPath).digest('hex');
  const combined = timestamp + pathHash;
  const hash = crypto.createHash('sha1').update(combined).digest('hex');
  
  // Formata como UUID v4
  return [
    hash.substr(0, 8),
    hash.substr(8, 4),
    '4' + hash.substr(13, 3),
    ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + hash.substr(17, 3),
    hash.substr(20, 12)
  ].join('-');
};

/**
 * Lista apenas as pastas filhas imediatas de um diretório
 * @param {string} targetPath - Caminho do diretório a ser analisado
 * @returns {Promise<Array>} Array de objetos com nome e caminho das pastas
 */
const listDirectoriesInPath = async (targetPath) => {
  try {
    const items = await fsPromises.readdir(targetPath);
    const folders = [];

    for (const item of items) {
      const fullPath = path.join(targetPath, item);
      const itemStats = await fsPromises.stat(fullPath);
      
      // Verifica se é um diretório (ignora arquivos)
      if (itemStats.isDirectory()) {
        folders.push({
          nome: item,
          caminho: fullPath
        });
      }
    }

    return folders;
  } catch (error) {
    throw new Error(`Erro ao listar pastas: ${error.message}`);
  }
};

/**
 * Escreve dados no formato CSV
 * @param {Array} folders - Array de pastas com nome e caminho
 * @param {string} outputPath - Caminho onde salvar o CSV
 * @returns {Promise<string>} Caminho completo do arquivo gerado
 */
const writeCsvData = async (folders, outputPath) => {
  try {
    // Garante que o diretório existe
    const dir = path.dirname(outputPath);
    await fsPromises.mkdir(dir, { recursive: true });

    // Cabeçalho do CSV
    let csvContent = 'nome;caminho\n';
    
    // Adiciona cada pasta ao CSV
    for (const folder of folders) {
      // Escapa ponto e vírgula nos dados se necessário
      const nome = folder.nome.replace(/;/g, ',');
      const caminho = folder.caminho.replace(/;/g, ',');
      csvContent += `${nome};${caminho}\n`;
    }

    await fsPromises.writeFile(outputPath, csvContent, 'utf8');
    return path.resolve(outputPath);
  } catch (error) {
    throw new Error(`Erro ao gerar CSV: ${error.message}`);
  }
};

/**
 * Lê e processa um arquivo CSV
 * @param {string} csvPath - Caminho para o arquivo CSV
 * @returns {Promise<Array>} Array de objetos com nome e caminho
 */
const readCsvData = async (csvPath) => {
  try {
    const content = await fsPromises.readFile(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('Arquivo CSV está vazio');
    }

    const entries = [];
    
    // Processa cada linha (pula cabeçalho se existir)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Se a primeira linha contém "nome" e "caminho", pula (cabeçalho)
      if (i === 0 && line.toLowerCase().includes('nome') && line.toLowerCase().includes('caminho')) {
        continue;
      }
      
      // Divide por ponto e vírgula, mas considera aspas
      const columns = parseCsvLine(line);
      
      if (columns.length < 2) {
        console.warn(`⚠️ Linha inválida no CSV (linha ${i + 1}): ${line}`);
        continue;
      }
      
      const nome = columns[0].trim();
      const caminho = columns[1].trim();
      
      if (!nome || !caminho) {
        console.warn(`⚠️ Dados vazios no CSV (linha ${i + 1}): ${line}`);
        continue;
      }
      
      entries.push({ nome, caminho });
    }
    
    return entries;
  } catch (error) {
    throw new Error(`Erro ao ler arquivo CSV: ${error.message}`);
  }
};

/**
 * Faz parse de uma linha CSV considerando aspas e usando ponto e vírgula como separador
 * @param {string} line - Linha do CSV
 * @returns {string[]} Array com as colunas
 */
const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

module.exports = {
  generateUUID,
  listDirectoriesInPath,
  writeCsvData,
  readCsvData,
  parseCsvLine
};
