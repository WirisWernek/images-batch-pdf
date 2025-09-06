#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Classe principal do CLI para conversão de imagens em EPUB
 */
class ImageToEpubConverter {
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
      throw new Error('Uso: node epub-converter.js <caminho-da-pasta> <nome-do-arquivo-epub> OU node epub-converter.js <arquivo-csv>');
    }

    // Se há apenas um argumento, assume que é um arquivo CSV
    if (args.length === 3) {
      return { csvFile: args[2], mode: 'csv' };
    }

    // Se há dois argumentos, assume modo pasta + nome
    const folderPath = args[2];
    const outputName = args[3];

    if (!outputName) {
      throw new Error('Nome do arquivo EPUB é obrigatório');
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
   * Gera um UUID único para o EPUB
   * @returns {string} UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Cria a estrutura base do EPUB
   * @param {string} tempDir - Diretório temporário
   * @param {string} title - Título do livro
   * @param {string} uuid - UUID único
   */
  async createEpubStructure(tempDir, title, uuid) {
    // Cria estrutura de pastas
    await fsPromises.mkdir(path.join(tempDir, 'META-INF'), { recursive: true });
    await fsPromises.mkdir(path.join(tempDir, 'OEBPS', 'images'), { recursive: true });
    await fsPromises.mkdir(path.join(tempDir, 'OEBPS', 'text'), { recursive: true });

    // Arquivo mimetype
    await fsPromises.writeFile(
      path.join(tempDir, 'mimetype'),
      'application/epub+zip',
      { flag: 'w' }
    );

    // META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    
    await fsPromises.writeFile(
      path.join(tempDir, 'META-INF', 'container.xml'),
      containerXml
    );
  }

  /**
   * Copia imagens para o EPUB e retorna lista de arquivos
   * @param {string[]} imagePaths - Caminhos das imagens
   * @param {string} tempDir - Diretório temporário
   * @returns {Promise<Array>} Lista de informações das imagens
   */
  async copyImagesToEpub(imagePaths, tempDir) {
    const imageList = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const ext = path.extname(imagePath).toLowerCase();
      const newFileName = `image_${String(i + 1).padStart(3, '0')}${ext}`;
      const destPath = path.join(tempDir, 'OEBPS', 'images', newFileName);
      
      // Copia a imagem
      await fsPromises.copyFile(imagePath, destPath);
      
      // Determina o media type
      let mediaType = 'image/jpeg';
      switch (ext) {
        case '.png': mediaType = 'image/png'; break;
        case '.gif': mediaType = 'image/gif'; break;
        case '.bmp': mediaType = 'image/bmp'; break;
        case '.webp': mediaType = 'image/webp'; break;
      }
      
      imageList.push({
        filename: newFileName,
        id: `img${i + 1}`,
        mediaType: mediaType,
        pageNumber: i + 1
      });
    }
    
    return imageList;
  }

  /**
   * Cria arquivos HTML para cada imagem
   * @param {Array} imageList - Lista de imagens
   * @param {string} tempDir - Diretório temporário
   */
  async createHtmlPages(imageList, tempDir) {
    for (const image of imageList) {
      const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Página ${image.pageNumber}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <div>
    <img src="../images/${image.filename}" alt="Página ${image.pageNumber}"/>
  </div>
</body>
</html>`;
      
      const htmlFileName = `page_${String(image.pageNumber).padStart(3, '0')}.xhtml`;
      await fsPromises.writeFile(
        path.join(tempDir, 'OEBPS', 'text', htmlFileName),
        htmlContent
      );
      
      image.htmlFile = htmlFileName;
    }
  }

  /**
   * Cria o arquivo content.opf (manifest do EPUB)
   * @param {Array} imageList - Lista de imagens
   * @param {string} tempDir - Diretório temporário
   * @param {string} title - Título do livro
   * @param {string} uuid - UUID único
   */
  async createContentOpf(imageList, tempDir, title, uuid) {
    const now = new Date().toISOString().split('T')[0];
    
    let manifest = '';
    let spine = '';
    
    // Adiciona itens ao manifest e spine
    for (const image of imageList) {
      manifest += `    <item id="${image.id}" href="images/${image.filename}" media-type="${image.mediaType}"/>\n`;
      manifest += `    <item id="page${image.pageNumber}" href="text/${image.htmlFile}" media-type="application/xhtml+xml"/>\n`;
      spine += `    <itemref idref="page${image.pageNumber}"/>\n`;
    }

    const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package version="2.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId" opf:scheme="UUID">${uuid}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:language>pt-BR</dc:language>
    <dc:creator opf:file-as="Images Batch EPUB" opf:role="aut">Images Batch EPUB</dc:creator>
    <dc:date opf:event="creation">${now}</dc:date>
    <dc:publisher>Images Batch EPUB Converter</dc:publisher>
    <dc:rights>Todos os direitos reservados</dc:rights>
    <meta name="cover" content="img1"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifest}  </manifest>
  <spine toc="ncx">
${spine}  </spine>
</package>`;

    await fsPromises.writeFile(
      path.join(tempDir, 'OEBPS', 'content.opf'),
      contentOpf
    );
  }

  /**
   * Cria o arquivo toc.ncx (índice de navegação)
   * @param {Array} imageList - Lista de imagens
   * @param {string} tempDir - Diretório temporário
   * @param {string} title - Título do livro
   * @param {string} uuid - UUID único
   */
  async createTocNcx(imageList, tempDir, title, uuid) {
    let navPoints = '';
    
    for (const image of imageList) {
      navPoints += `    <navPoint id="navpoint-${image.pageNumber}" playOrder="${image.pageNumber}">
      <navLabel>
        <text>Página ${image.pageNumber}</text>
      </navLabel>
      <content src="text/${image.htmlFile}"/>
    </navPoint>
`;
    }

    const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${title}</text>
  </docTitle>
  <navMap>
${navPoints}  </navMap>
</ncx>`;

    await fsPromises.writeFile(
      path.join(tempDir, 'OEBPS', 'toc.ncx'),
      tocNcx
    );
  }

  /**
   * Compacta a estrutura EPUB em um arquivo .epub
   * @param {string} tempDir - Diretório temporário
   * @param {string} outputPath - Caminho de saída
   */
  async createEpubFile(tempDir, outputPath) {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      // Primeiro, cria o arquivo com o mimetype sem compressão
      const zip1 = spawn('zip', ['-0Xq', outputPath, 'mimetype'], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      zip1.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Erro ao criar arquivo EPUB (mimetype): código ${code}`));
          return;
        }
        
        // Depois adiciona o resto dos arquivos com compressão
        const zip2 = spawn('zip', ['-Xr9Dq', outputPath, '.'], {
          cwd: tempDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        zip2.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Erro ao criar arquivo EPUB (conteúdo): código ${code}`));
          } else {
            resolve();
          }
        });
        
        zip2.on('error', reject);
      });
      
      zip1.on('error', reject);
    });
  }

  /**
   * Cria um documento EPUB com as imagens
   * @param {string[]} imagePaths - Lista de caminhos completos das imagens
   * @param {string} outputPath - Caminho de saída do EPUB
   * @param {string} title - Título do livro
   */
  async createEpub(imagePaths, outputPath, title) {
    const tempDir = path.join(__dirname, 'temp_epub_' + Date.now());
    
    try {
      // Cria estrutura temporária
      await fsPromises.mkdir(tempDir, { recursive: true });
      
      const uuid = this.generateUUID();
      
      console.log('   📁 Criando estrutura EPUB...');
      await this.createEpubStructure(tempDir, title, uuid);
      
      console.log('   🖼️ Copiando imagens...');
      const imageList = await this.copyImagesToEpub(imagePaths, tempDir);
      
      console.log('   📄 Criando páginas HTML...');
      await this.createHtmlPages(imageList, tempDir);
      
      console.log('   📋 Criando manifest...');
      await this.createContentOpf(imageList, tempDir, title, uuid);
      
      console.log('   🗂️ Criando índice...');
      await this.createTocNcx(imageList, tempDir, title, uuid);
      
      console.log('   📦 Compactando EPUB...');
      await this.createEpubFile(tempDir, outputPath);
      
    } finally {
      // Limpa diretório temporário
      try {
        await fsPromises.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Aviso: Não foi possível remover diretório temporário: ${tempDir}`);
      }
    }
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
        const outputFileName = nome.endsWith('.epub') ? `epub/${nome}` : `epub/${nome}.epub`;
        const outputPath = path.resolve(outputFileName);
        
        // Garante que a pasta epub existe
        await fsPromises.mkdir('epub', { recursive: true });
        
        // Cria o EPUB
        console.log(`   📚 Criando EPUB: ${outputFileName}`);
        await this.createEpub(imagePaths, outputPath, nome);
        console.log(`   ✅ EPUB criado: ${outputPath}`);
        
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
      console.log('📚 Iniciando conversão de imagens para EPUB...\n');
      
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
        console.log(`📚 Arquivo de saída: ${outputName}\n`);
        
        // Valida se a pasta existe
        await this.validateFolder(folderPath);
        
        // Lê arquivos de imagem da pasta
        console.log('📖 Lendo arquivos da pasta...');
        const imageFiles = await this.readImageFiles(folderPath);
        console.log(`Encontrados ${imageFiles.length} arquivo(s) de imagem`);
        
        // Ordena arquivos numericamente
        const sortedFiles = this.sortFilesNumericamente(imageFiles);
        
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
        const outputFileName = outputName.endsWith('.epub') ? outputName : `${outputName}.epub`;
        const outputPath = path.resolve('epub', outputFileName);
        
        // Garante que a pasta epub existe
        await fsPromises.mkdir('epub', { recursive: true });
        
        // Cria o EPUB
        console.log('\n📚 Criando EPUB...');
        await this.createEpub(imagePaths, outputPath, outputName);
        
        console.log('\n✅ Conversão concluída com sucesso!');
        console.log(`📚 Arquivo salvo em: ${outputPath}`);
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
📚 Conversor de Imagens para EPUB

Uso:
  node epub-converter.js <caminho-da-pasta> <nome-do-arquivo-epub>
  node epub-converter.js <arquivo-csv>

Argumentos:
  caminho-da-pasta     Caminho para a pasta contendo as imagens
  nome-do-arquivo-epub Nome do arquivo EPUB de saída (com ou sem extensão .epub)
  arquivo-csv          Caminho para arquivo CSV com múltiplas conversões

Formato do CSV:
  O arquivo CSV deve ter duas colunas: nome;caminho
  - nome: Nome do arquivo EPUB a ser gerado
  - caminho: Caminho da pasta contendo as imagens
  
  Exemplo do CSV:
  nome;caminho
  documento1;/pasta/imagens1
  "Relatório Final";/pasta/imagens2
  album-familia.epub;"/pasta/com espaços"

Exemplos:
  # Modo single - uma pasta
  node epub-converter.js ./imagens meu-livro
  node epub-converter.js /home/user/fotos album-familia.epub
  node epub-converter.js "C:\\Users\\Nome\\Pictures" relatorio

  # Modo CSV - múltiplas pastas
  node epub-converter.js ./conversoes.csv
  node epub-converter.js /path/to/batch-conversion.csv

Formatos suportados:
  JPG, JPEG, PNG, GIF, BMP, WEBP

Observações:
  - As imagens devem estar nomeadas numericamente (1.jpg, 2.png, etc.)
  - Cada imagem será uma página do livro EPUB
  - A qualidade e formato das imagens são preservados
  - No modo CSV, se um erro ocorrer em uma conversão, as outras continuam
  - Requer o comando 'zip' instalado no sistema
  - Os arquivos são salvos na pasta 'epub/' do projeto
  
Sobre EPUB:
  - EPUB é um formato padrão de livro eletrônico
  - Compatível com a maioria dos leitores de e-book
  - Permite navegação entre páginas
  - Suporta índice e metadados
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
  
  const converter = new ImageToEpubConverter();
  converter.run(args);
}

module.exports = ImageToEpubConverter;
