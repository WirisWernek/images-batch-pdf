#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Classe principal do CLI para conversão de imagens em PDF
 */
class ImageToPdfConverter {
  constructor() {
    this.supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  }

  /**
   * Valida os argumentos da linha de comando
   * @param {string[]} args - Argumentos da linha de comando
   * @returns {Object} Objeto com folderPath e outputName validados
   */
  validateArguments(args) {
    if (args.length < 4) {
      throw new Error('Uso: node script.js <caminho-da-pasta> <nome-do-arquivo-pdf>');
    }

    const folderPath = args[2];
    const outputName = args[3];

    if (!outputName) {
      throw new Error('Nome do arquivo PDF é obrigatório');
    }

    return { folderPath, outputName };
  }

  /**
   * Verifica se a pasta existe e é acessível
   * @param {string} folderPath - Caminho da pasta
   */
  async validateFolder(folderPath) {
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
  }

  /**
   * Lê o conteúdo da pasta e retorna apenas arquivos de imagem
   * @param {string} folderPath - Caminho da pasta
   * @returns {Promise<string[]>} Lista de nomes de arquivos de imagem
   */
  async readImageFiles(folderPath) {
    try {
      const files = await fsPromises.readdir(folderPath);
      
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.supportedExtensions.includes(ext);
      });

      if (imageFiles.length === 0) {
        throw new Error('Nenhum arquivo de imagem encontrado na pasta');
      }

      return imageFiles;
    } catch (error) {
      throw new Error(`Erro ao ler pasta: ${error.message}`);
    }
  }

  /**
   * Ordena os arquivos numericamente (1, 2, 3, ..., 10, 11, etc.)
   * @param {string[]} files - Lista de nomes de arquivos
   * @returns {string[]} Lista ordenada numericamente
   */
  sortFilesNumerically(files) {
    return files.sort((a, b) => {
      const numA = parseInt(path.basename(a, path.extname(a)));
      const numB = parseInt(path.basename(b, path.extname(b)));
      
      // Se não conseguir extrair número, mantém ordem alfabética
      if (isNaN(numA) || isNaN(numB)) {
        return a.localeCompare(b);
      }
      
      return numA - numB;
    });
  }

  /**
   * Obtém as dimensões de uma imagem
   * @param {string} imagePath - Caminho completo da imagem
   * @returns {Promise<Object>} Objeto com width e height
   */
  async getImageDimensions(imagePath) {
    // Para uma implementação mais robusta, você poderia usar uma biblioteca como 'image-size'
    // Por simplicidade, vamos usar dimensões padrão baseadas no tipo comum de imagem
    try {
      const stats = await fsPromises.stat(imagePath);
      if (stats.size === 0) {
        throw new Error(`Arquivo de imagem vazio: ${imagePath}`);
      }
      
      // Retorna dimensões padrão - em uma implementação real, 
      // use uma biblioteca como 'image-size' para obter dimensões reais
      return { width: 595, height: 842 }; // A4 em pontos
    } catch (error) {
      throw new Error(`Erro ao processar imagem ${imagePath}: ${error.message}`);
    }
  }

  /**
   * Cria um documento PDF com as imagens
   * @param {string[]} imagePaths - Lista de caminhos completos das imagens
   * @param {string} outputPath - Caminho de saída do PDF
   */
  async createPdf(imagePaths, outputPath) {
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
            // Adiciona nova página para cada imagem
            doc.addPage();
            
            // Adiciona a imagem ocupando toda a página
            doc.image(imagePath, 0, 0, {
              fit: [doc.page.width, doc.page.height],
              align: 'center',
              valign: 'center'
            });
            
            console.log(`Processada imagem ${index + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);
          } catch (error) {
            console.warn(`Aviso: Erro ao processar ${imagePath}: ${error.message}`);
          }
        });

        doc.end();
        
        stream.on('finish', () => {
          console.log(`PDF criado com sucesso: ${outputPath}`);
          resolve();
        });
        
        stream.on('error', reject);
        
      } catch (error) {
        reject(new Error(`Erro ao criar PDF: ${error.message}`));
      }
    });
  }

  /**
   * Função principal que executa todo o processo
   * @param {string[]} args - Argumentos da linha de comando
   */
  async run(args) {
    try {
      console.log('🚀 Iniciando conversão de imagens para PDF...\n');
      
      // Valida argumentos
      const { folderPath, outputName } = this.validateArguments(args);
      console.log(`📁 Pasta: ${folderPath}`);
      console.log(`📄 Arquivo de saída: ${outputName}\n`);
      
      // Valida se a pasta existe
      await this.validateFolder(folderPath);
      
      // Lê arquivos de imagem da pasta
      console.log('📖 Lendo arquivos da pasta...');
      const imageFiles = await this.readImageFiles(folderPath);
      console.log(`Encontrados ${imageFiles.length} arquivo(s) de imagem`);
      
      // Ordena arquivos numericamente
      const sortedFiles = this.sortFilesNumerically(imageFiles);
      console.log('📋 Arquivos ordenados:');
      sortedFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      
      // Cria caminhos completos
      const imagePaths = sortedFiles.map(file => path.join(folderPath, file));
      
      // Valida se todos os arquivos existem
      console.log('\n🔍 Validando arquivos...');
      for (const imagePath of imagePaths) {
        try {
          await fsPromises.access(imagePath);
        } catch (error) {
          throw new Error(`Arquivo não encontrado: ${imagePath}`);
        }
      }
      
      // Define nome do arquivo de saída
      const outputFileName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      const outputPath = path.resolve(outputFileName);
      
      // Cria o PDF
      console.log('\n📝 Criando PDF...');
      await this.createPdf(imagePaths, outputPath);
      
      console.log('\n✅ Conversão concluída com sucesso!');
      console.log(`📄 Arquivo salvo em: ${outputPath}`);
      
    } catch (error) {
      console.error('\n❌ Erro:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Função de ajuda
 */
function showHelp() {
  console.log(`
📖 Conversor de Imagens para PDF

Uso:
  node script.js <caminho-da-pasta> <nome-do-arquivo-pdf>

Argumentos:
  caminho-da-pasta     Caminho para a pasta contendo as imagens
  nome-do-arquivo-pdf  Nome do arquivo PDF de saída (com ou sem extensão .pdf)

Exemplos:
  node script.js ./imagens meu-documento
  node script.js /home/user/fotos album-familia.pdf
  node script.js "C:\\Users\\Nome\\Pictures" relatorio

Formatos suportados:
  JPG, JPEG, PNG, GIF, BMP, WEBP

Observações:
  - As imagens devem estar nomeadas numericamente (1.jpg, 2.png, etc.)
  - Cada imagem ocupará uma página completa no PDF
  - A qualidade e formato das imagens são preservados
  `);
}

// Execução do script
if (require.main === module) {
  const args = process.argv;
  
  // Verifica se é pedido de ajuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const converter = new ImageToPdfConverter();
  converter.run(args);
}