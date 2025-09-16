const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { isValidImageFile } = require('../service/validate');
const { sortFilesNumerically, sortImagesByFolderAndIndex } = require('../service/order');

/**
 * Infraestrutura para operações de PDF
 * Interage diretamente com o sistema de arquivos para geração de PDFs
 */

/**
 * Coleta imagens de uma pasta específica
 * @param {string} folderPath - Caminho da pasta
 * @returns {Promise<string[]>} Array de caminhos completos das imagens
 */
const collectImagesFromFolder = async (folderPath) => {
  try {
    const files = await fsPromises.readdir(folderPath);
    
    const imageFiles = files.filter(file => isValidImageFile(file));
    
    if (imageFiles.length === 0) {
      console.warn(`⚠️ Nenhuma imagem encontrada em: ${folderPath}`);
      return [];
    }
    
    // Ordena arquivos numericamente
    const sortedFiles = sortFilesNumerically(imageFiles);
    
    // Retorna caminhos completos
    return sortedFiles.map(file => path.join(folderPath, file));
  } catch (error) {
    throw new Error(`Erro ao ler pasta ${folderPath}: ${error.message}`);
  }
};

/**
 * Coleta imagens de múltiplas pastas baseado em entradas CSV
 * @param {Array} entries - Array de entradas do CSV
 * @returns {Promise<Array>} Array com objetos contendo informações das imagens
 */
const collectImagesFromMultipleFolders = async (entries) => {
  const allImages = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { nome, caminho } = entry;
    
    console.log(`📁 Coletando imagens da pasta ${i + 1}/${entries.length}: ${nome}`);
    
    try {
      const imageFiles = await collectImagesFromFolder(caminho);
      
      if (imageFiles.length === 0) {
        console.warn(`⚠️ Pasta ${nome} não contém imagens válidas`);
        continue;
      }
      
      // Cria objetos com informações das imagens
      const imagesInfo = imageFiles.map((imagePath, index) => ({
        path: imagePath,
        filename: path.basename(imagePath),
        folderName: nome,
        folderIndex: i + 1,
        imageIndex: index + 1,
        totalInFolder: imageFiles.length
      }));
      
      allImages.push(...imagesInfo);
      console.log(`   ✅ ${imageFiles.length} imagem(ns) coletadas`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar pasta ${nome}: ${error.message}`);
    }
  }
  
  if (allImages.length === 0) {
    throw new Error('Nenhuma imagem foi encontrada em todas as pastas especificadas');
  }
  
  // Ordena por pasta e depois por índice da imagem
  return sortImagesByFolderAndIndex(allImages);
};

/**
 * Cria um documento PDF simples com uma lista de imagens
 * @param {string[]} imagePaths - Array de caminhos das imagens
 * @param {string} outputPath - Caminho de saída do PDF
 * @returns {Promise<void>}
 */
const createPdfDocument = async (imagePaths, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        autoFirstPage: false,
        margin: 0 
      });
      
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Processa cada imagem
      imagePaths.forEach((imagePath, index) => {
        try {
          // Adiciona nova página
          doc.addPage();
          
          // Adiciona imagem à página (ajusta para caber na página)
          doc.image(imagePath, 0, 0, {
            fit: [doc.page.width, doc.page.height],
            align: 'center',
            valign: 'center'
          });
          
        } catch (error) {
          console.warn(`⚠️ Erro ao processar imagem ${imagePath}: ${error.message}`);
        }
      });

      doc.end();
      
      stream.on('finish', () => {
        resolve();
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(new Error(`Erro ao criar PDF: ${error.message}`));
    }
  });
};

/**
 * Cria um documento PDF mesclado com informações das pastas
 * @param {Array} allImages - Array com informações de todas as imagens
 * @param {string} outputPath - Caminho de saída do PDF
 * @param {string} title - Título do documento
 * @returns {Promise<void>}
 */
const createMergedPdfDocument = async (allImages, outputPath, title) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        autoFirstPage: false,
        margin: 0
      });
      
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      let currentFolder = '';
      
      // Processa cada imagem
      allImages.forEach((imageInfo, index) => {
        try {
          // Adiciona separador entre pastas (se necessário)
          if (imageInfo.folderName !== currentFolder) {
            currentFolder = imageInfo.folderName;
            
            // Adiciona página de título para nova pasta (opcional)
            // Comentado para manter compatibilidade com comportamento original
            /*
            doc.addPage();
            doc.fontSize(20).text(`${currentFolder}`, 50, 50);
            */
          }
          
          // Adiciona nova página para a imagem
          doc.addPage();
          
          // Adiciona imagem à página
          doc.image(imageInfo.path, 0, 0, {
            fit: [doc.page.width, doc.page.height],
            align: 'center',
            valign: 'center'
          });
          
        } catch (error) {
          console.warn(`⚠️ Erro ao processar imagem ${imageInfo.path}: ${error.message}`);
        }
      });

      doc.end();
      
      stream.on('finish', () => {
        resolve();
      });
      
      stream.on('error', reject);
      
    } catch (error) {
      reject(new Error(`Erro ao criar PDF mesclado: ${error.message}`));
    }
  });
};

module.exports = {
  collectImagesFromFolder,
  collectImagesFromMultipleFolders,
  createPdfDocument,
  createMergedPdfDocument
};
