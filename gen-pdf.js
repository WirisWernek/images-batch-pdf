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
   * @returns {Object} Objeto com dados validados
   */
  validateArguments(args) {
    if (args.length < 3) {
      throw new Error('Uso: node gen-pdf.js <caminho-da-pasta> <nome-do-arquivo-pdf> OU node gen-pdf.js <arquivo-csv>');
    }

    // Se há apenas um argumento, assume que é um arquivo CSV
    if (args.length === 3) {
      return { csvFile: args[2], mode: 'csv' };
    }

    // Se há dois argumentos, assume modo pasta + nome
    const folderPath = args[2];
    const outputName = args[3];

    if (!outputName) {
      throw new Error('Nome do arquivo PDF é obrigatório');
    }

    return { folderPath, outputName, mode: 'single' };
  }

  /**
   * Lê e processa um arquivo CSV
   * @param {string} csvPath - Caminho para o arquivo CSV
   * @returns {Promise<Array>} Array de objetos com nome e caminho
   */
  async readCsvFile(csvPath) {
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
        
        // Divide por vírgula, mas considera aspas
        const columns = this.parseCsvLine(line);
        
        if (columns.length < 2) {
          console.warn(`Aviso: Linha ${i + 1} ignorada - formato inválido: ${line}`);
          continue;
        }
        
        const nome = columns[0].trim();
        const caminho = columns[1].trim();
        
        if (!nome || !caminho) {
          console.warn(`Aviso: Linha ${i + 1} ignorada - nome ou caminho vazio`);
          continue;
        }
        
        entries.push({ nome, caminho });
      }
      
      if (entries.length === 0) {
        throw new Error('Nenhuma entrada válida encontrada no arquivo CSV');
      }
      
      return entries;
    } catch (error) {
      throw new Error(`Erro ao ler arquivo CSV: ${error.message}`);
    }
  }

  /**
   * Faz parse de uma linha CSV considerando aspas
   * @param {string} line - Linha do CSV
   * @returns {string[]} Array com as colunas
   */
  parseCsvLine(line) {
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
          } catch (error) {
            console.warn(`Aviso: Erro ao processar ${imagePath}: ${error.message}`);
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
  }

  /**
   * Processa múltiplas pastas a partir de um arquivo CSV
   * @param {Array} entries - Array de objetos com nome e caminho
   */
  async processCsvEntries(entries) {
    console.log(`📋 Processando ${entries.length} entrada(s) do CSV...\n`);
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { nome, caminho } = entry;
      
      console.log(`\n📁 Processando ${i + 1}/${entries.length}`);
      
      try {
        // Valida se a pasta existe
        await this.validateFolder(caminho);
        
        // Lê arquivos de imagem da pasta
        const imageFiles = await this.readImageFiles(caminho);
        console.log(`   🖼️ Encontradas ${imageFiles.length} imagem(ns)`);
        
        // Ordena arquivos numericamente
        const sortedFiles = this.sortFilesNumerically(imageFiles);
        
        // Cria caminhos completos
        const imagePaths = sortedFiles.map(file => path.join(caminho, file));
        
        // Valida se todos os arquivos existem
        for (const imagePath of imagePaths) {
          try {
            await fsPromises.access(imagePath);
          } catch (error) {
            throw new Error(`Arquivo não encontrado: ${imagePath}`);
          }
        }
        
        // Define nome do arquivo de saída
        const outputFileName = nome.endsWith('.pdf') ? `pdf/${nome}` : `pdf/${nome}.pdf`;
        const outputPath = path.resolve(outputFileName);
        
        // Cria o PDF
        console.log(`   📝 Criando PDF: ${outputFileName}`);
        await this.createPdf(imagePaths, outputPath);
        console.log(`   ✅ PDF criado: ${outputPath}`);
        
      } catch (error) {
        console.error(`   ❌ Erro ao processar ${nome}: ${error.message}`);
        // Continue com o próximo arquivo em caso de erro
      }
    }
  }

  /**
   * Função principal que executa todo o processo
   * @param {string[]} args - Argumentos da linha de comando
   */
  async run(args) {
    try {
      console.log('🚀 Iniciando conversão de imagens para PDF...\n');
      
      // Valida argumentos
      const params = this.validateArguments(args);
      
      if (params.mode === 'csv') {
        // Modo CSV - processa múltiplas pastas
        console.log(`📄 Arquivo CSV: ${params.csvFile}\n`);
        
        // Valida se o arquivo CSV existe
        try {
          await fsPromises.access(params.csvFile);
        } catch (error) {
          throw new Error(`Arquivo CSV não encontrado: ${params.csvFile}`);
        }
        
        // Lê e processa o arquivo CSV
        const entries = await this.readCsvFile(params.csvFile);
        await this.processCsvEntries(entries);
        
        console.log('\n🎉 Processamento do CSV concluído!');
        
      } else {
        // Modo single - uma pasta e um arquivo
        const { folderPath, outputName } = params;
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
      }
      
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
  node gen-pdf.js <caminho-da-pasta> <nome-do-arquivo-pdf>
  node gen-pdf.js <arquivo-csv>

Argumentos:
  caminho-da-pasta     Caminho para a pasta contendo as imagens
  nome-do-arquivo-pdf  Nome do arquivo PDF de saída (com ou sem extensão .pdf)
  arquivo-csv          Caminho para arquivo CSV com múltiplas conversões

Formato do CSV:
  O arquivo CSV deve ter duas colunas: nome;caminho
  - nome: Nome do arquivo PDF a ser gerado
  - caminho: Caminho da pasta contendo as imagens
  
  Exemplo do CSV:
  nome;caminho
  documento1;/pasta/imagens1
  "Relatório Final";/pasta/imagens2
  album-familia.pdf;"/pasta/com espaços"

Exemplos:
  # Modo individual - uma pasta
  node gen-pdf.js ./imagens meu-documento
  node gen-pdf.js /home/user/fotos album-familia.pdf
  node gen-pdf.js "C:\\Users\\Nome\\Pictures" relatorio

  # Modo lote - múltiplas pastas via CSV
  node gen-pdf.js ./conversoes.csv
  node gen-pdf.js /path/to/batch-conversion.csv

Formatos suportados:
  JPG, JPEG, PNG, GIF, BMP, WEBP

Observações:
  - As imagens devem estar nomeadas numericamente (1.jpg, 2.png, etc.)
  - Cada imagem ocupará uma página completa no PDF
  - A qualidade e formato das imagens são preservados
  - No modo CSV, se um erro ocorrer em uma conversão, as outras continuam
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