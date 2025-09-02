#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Classe para conversão de múltiplas pastas de imagens em um único PDF
 */
class MergePdfConverter {
  constructor() {
    this.supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  }

  /**
   * Valida os argumentos da linha de comando
   * @param {string[]} args - Argumentos da linha de comando
   * @returns {Object} Objeto com dados validados
   */
  validateArguments(args) {
    if (args.length < 4) {
      throw new Error('Uso: node merge-pdf.js <arquivo-csv> <nome-do-arquivo-pdf>');
    }

    const csvFile = args[2];
    const outputName = args[3];

    if (!outputName) {
      throw new Error('Nome do arquivo PDF de saída é obrigatório');
    }

    return { csvFile, outputName };
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
        
        // Divide por ponto e vírgula
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
   * Faz parse de uma linha CSV considerando aspas e usando ponto e vírgula como separador
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
   * Coleta todas as imagens de todas as pastas listadas no CSV
   * @param {Array} entries - Array de objetos com nome e caminho
   * @returns {Promise<Array>} Array com objetos contendo informações das imagens
   */
  async collectAllImages(entries) {
    console.log(`📋 Coletando imagens de ${entries.length} pasta(s)...\n`);
    
    const allImages = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { nome, caminho } = entry;
      
      console.log(`📁 Processando pasta ${i + 1}/${entries.length}: ${nome}`);
      
      try {
        // Valida se a pasta existe
        await this.validateFolder(caminho);
        
        // Lê arquivos de imagem da pasta
        const imageFiles = await this.readImageFiles(caminho);
        
        if (imageFiles.length === 0) {
          console.warn(`   ⚠️ Nenhuma imagem encontrada em: ${caminho}`);
          continue;
        }
        
        console.log(`   🖼️ Encontradas ${imageFiles.length} imagem(ns)`);
        
        // Ordena arquivos numericamente
        const sortedFiles = this.sortFilesNumerically(imageFiles);
        
        // Cria objetos com informações das imagens
        const imagesInfo = sortedFiles.map((file, index) => ({
          path: path.join(caminho, file),
          filename: file,
          folderName: nome,
          folderIndex: i + 1,
          imageIndex: index + 1,
          totalInFolder: sortedFiles.length
        }));
        
        // Valida se todos os arquivos existem
        for (const imageInfo of imagesInfo) {
          try {
            await fsPromises.access(imageInfo.path);
          } catch (error) {
            throw new Error(`Arquivo não encontrado: ${imageInfo.path}`);
          }
        }
        
        allImages.push(...imagesInfo);
        console.log(`   ✅ ${imagesInfo.length} imagem(ns) adicionadas`);
        
      } catch (error) {
        console.error(`   ❌ Erro ao processar pasta ${nome}: ${error.message}`);
        // Continue com a próxima pasta em caso de erro
      }
    }
    
    if (allImages.length === 0) {
      throw new Error('Nenhuma imagem foi encontrada em todas as pastas especificadas');
    }
    
    console.log(`\n🎯 Total de imagens coletadas: ${allImages.length}`);
    return allImages;
  }

  /**
   * Cria um documento PDF com todas as imagens coletadas
   * @param {Array} allImages - Array com informações de todas as imagens
   * @param {string} outputPath - Caminho de saída do PDF
   */
  async createMergedPdf(allImages, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          autoFirstPage: false,
          margin: 0 
        });
        
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        console.log('\n📝 Criando PDF unificado...');
        
        // Processa cada imagem
        allImages.forEach((imageInfo, index) => {
          try {
            // Adiciona nova página para cada imagem
            doc.addPage();
            
            // Adiciona a imagem ocupando toda a página
            doc.image(imageInfo.path, 0, 0, {
              fit: [doc.page.width, doc.page.height],
              align: 'center',
              valign: 'center'
            });
            
            // Log de progresso a cada 10 imagens ou para a última
            if ((index + 1) % 10 === 0 || index === allImages.length - 1) {
              console.log(`   📄 Processadas ${index + 1}/${allImages.length} imagens`);
            }
            
          } catch (error) {
            console.warn(`   ⚠️ Erro ao processar ${imageInfo.path}: ${error.message}`);
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
   * Exibe estatísticas do processamento
   * @param {Array} allImages - Array com informações de todas as imagens
   * @param {Array} entries - Array de entradas do CSV
   * @param {string} outputPath - Caminho do arquivo de saída
   */
  displayStatistics(allImages, entries, outputPath) {
    console.log('\n📊 Estatísticas do processamento:');
    console.log(`   📂 Pastas processadas: ${entries.length}`);
    console.log(`   🖼️ Total de imagens: ${allImages.length}`);
    
    // Estatísticas por pasta
    const folderStats = {};
    allImages.forEach(img => {
      if (!folderStats[img.folderName]) {
        folderStats[img.folderName] = 0;
      }
      folderStats[img.folderName]++;
    });
    
    console.log('\n   📈 Imagens por pasta:');
    Object.entries(folderStats).forEach(([folderName, count]) => {
      console.log(`     • ${folderName}: ${count} imagem(ns)`);
    });
    
    console.log(`\n   📄 Arquivo de saída: ${outputPath}`);
  }

  /**
   * Função principal que executa todo o processo
   * @param {string[]} args - Argumentos da linha de comando
   */
  async run(args) {
    try {
      console.log('🔗 Iniciando fusão de imagens de múltiplas pastas em PDF único...\n');
      
      // Valida argumentos
      const { csvFile, outputName } = this.validateArguments(args);
      
      console.log(`📄 Arquivo CSV: ${csvFile}`);
      console.log(`📄 Arquivo de saída: ${outputName}\n`);
      
      // Valida se o arquivo CSV existe
      try {
        await fsPromises.access(csvFile);
      } catch (error) {
        throw new Error(`Arquivo CSV não encontrado: ${csvFile}`);
      }
      
      // Lê e processa o arquivo CSV
      const entries = await this.readCsvFile(csvFile);
      
      // Coleta todas as imagens de todas as pastas
      const allImages = await this.collectAllImages(entries);
      
      // Define nome do arquivo de saída
      const outputFileName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
      const outputPath = path.resolve('pdf', outputFileName);
      
      // Garante que a pasta 'pdf' existe
      await fsPromises.mkdir('pdf', { recursive: true });
      
      // Cria o PDF unificado
      await this.createMergedPdf(allImages, outputPath);
      
      // Exibe estatísticas
      this.displayStatistics(allImages, entries, outputPath);
      
      console.log('\n✅ Fusão de PDFs concluída com sucesso!');
      console.log(`🎉 Arquivo unificado salvo em: ${outputPath}`);
      
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
📖 Conversor de Múltiplas Pastas para PDF Único

Descrição:
  Este script lê um arquivo CSV contendo múltiplas pastas com imagens
  e gera um único arquivo PDF com todas as imagens em sequência.

Uso:
  node merge-pdf.js <arquivo-csv> <nome-do-arquivo-pdf>

Argumentos:
  arquivo-csv          Caminho para arquivo CSV com as pastas (formato do analizer.js)
  nome-do-arquivo-pdf  Nome do arquivo PDF único de saída (com ou sem extensão .pdf)

Formato do CSV:
  O arquivo CSV deve estar no formato gerado pelo analizer.js:
  nome;caminho
  
  Exemplo:
  nome;caminho
  Pasta1;/caminho/para/pasta1
  Pasta2;/caminho/para/pasta2
  Pasta3;/caminho/para/pasta3

Exemplos:
  # Usando CSV gerado pelo analizer
  node merge-pdf.js csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv documento-completo
  
  # Especificando nome com extensão
  node merge-pdf.js meu-arquivo.csv relatorio-final.pdf

Funcionamento:
  1. Lê o arquivo CSV especificado
  2. Percorre todas as pastas listadas no CSV
  3. Coleta todas as imagens de todas as pastas
  4. Ordena as imagens numericamente dentro de cada pasta
  5. Cria um único PDF com todas as imagens em sequência
  6. Mantém a ordem: Pasta1 (imgs 1,2,3...), Pasta2 (imgs 1,2,3...), etc.

Formatos de imagem suportados:
  JPG, JPEG, PNG, GIF, BMP, WEBP

Observações:
  - As imagens devem estar nomeadas numericamente (1.jpg, 2.png, etc.)
  - Cada imagem ocupará uma página completa no PDF
  - A qualidade e formato das imagens são preservados
  - Se uma pasta não contém imagens, ela é ignorada
  - O arquivo é salvo na pasta 'pdf/' do projeto
  - Exibe estatísticas detalhadas ao final do processamento
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
  
  const converter = new MergePdfConverter();
  converter.run(args);
}

module.exports = MergePdfConverter;
