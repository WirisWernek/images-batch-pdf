#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Classe para conversão de múltiplas pastas de imagens em um único EPUB
 */
class MergeEpubConverter {
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
      throw new Error('Uso: node gen-lote-epub.js <arquivo-csv> <nome-do-arquivo-epub>');
    }

    const csvFile = args[2];
    const outputName = args[3];

    if (!outputName) {
      throw new Error('Nome do arquivo EPUB de saída é obrigatório');
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
   * @param {Array} allImages - Array com informações das imagens
   * @param {string} tempDir - Diretório temporário
   * @returns {Promise<Array>} Lista de informações das imagens no EPUB
   */
  async copyImagesToEpub(allImages, tempDir) {
    const imageList = [];
    
    for (let i = 0; i < allImages.length; i++) {
      const imageInfo = allImages[i];
      const ext = path.extname(imageInfo.path).toLowerCase();
      const newFileName = `image_${String(i + 1).padStart(4, '0')}${ext}`;
      const destPath = path.join(tempDir, 'OEBPS', 'images', newFileName);
      
      // Copia a imagem
      await fsPromises.copyFile(imageInfo.path, destPath);
      
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
        pageNumber: i + 1,
        originalInfo: imageInfo
      });
      
      // Log de progresso a cada 25 imagens ou para a última
      if ((i + 1) % 25 === 0 || i === allImages.length - 1) {
        console.log(`   📄 Copiadas ${i + 1}/${allImages.length} imagens`);
      }
    }
    
    return imageList;
  }

  /**
   * Cria arquivos HTML para cada imagem
   * @param {Array} imageList - Lista de imagens
   * @param {string} tempDir - Diretório temporário
   */
  async createHtmlPages(imageList, tempDir) {
    for (let i = 0; i < imageList.length; i++) {
      const image = imageList[i];
      const folderInfo = image.originalInfo;
      
      // Título da página incluindo informação da pasta original
      const pageTitle = `${folderInfo.folderName} - Página ${folderInfo.imageIndex}`;
      
      const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${pageTitle}</title>
  <style type="text/css">
    body { 
      margin: 0; 
      padding: 0; 
      text-align: center; 
      background-color: #fff;
    }
    .page-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    img { 
      max-width: 100%; 
      max-height: 100vh;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <img src="../images/${image.filename}" alt="${pageTitle}"/>
  </div>
</body>
</html>`;
      
      const htmlFileName = `page_${String(image.pageNumber).padStart(4, '0')}.xhtml`;
      await fsPromises.writeFile(
        path.join(tempDir, 'OEBPS', 'text', htmlFileName),
        htmlContent
      );
      
      image.htmlFile = htmlFileName;
      
      // Log de progresso a cada 50 páginas ou para a última
      if ((i + 1) % 50 === 0 || i === imageList.length - 1) {
        console.log(`   📝 Criadas ${i + 1}/${imageList.length} páginas HTML`);
      }
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
    <dc:creator opf:file-as="Merge EPUB Converter" opf:role="aut">Merge EPUB Converter</dc:creator>
    <dc:date opf:event="creation">${now}</dc:date>
    <dc:publisher>Images Batch EPUB Converter</dc:publisher>
    <dc:rights>Todos os direitos reservados</dc:rights>
    <dc:description>EPUB gerado a partir de múltiplas pastas de imagens</dc:description>
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
    let currentFolder = '';
    let folderNavPoint = 1;
    let pageOrder = 1;
    
    for (const image of imageList) {
      const folderInfo = image.originalInfo;
      
      // Se mudou de pasta, cria um novo ponto de navegação para a pasta
      if (folderInfo.folderName !== currentFolder) {
        currentFolder = folderInfo.folderName;
        
        navPoints += `    <navPoint id="folder-${folderNavPoint}" playOrder="${pageOrder}">
      <navLabel>
        <text>${folderInfo.folderName}</text>
      </navLabel>
      <content src="text/${image.htmlFile}"/>
`;
        
        // Adiciona sub-navegação para as páginas da pasta
        const folderImages = imageList.filter(img => img.originalInfo.folderName === currentFolder);
        
        for (let i = 0; i < folderImages.length; i++) {
          const folderImg = folderImages[i];
          pageOrder++;
          
          navPoints += `      <navPoint id="page-${folderImg.pageNumber}" playOrder="${pageOrder}">
        <navLabel>
          <text>Página ${folderImg.originalInfo.imageIndex}</text>
        </navLabel>
        <content src="text/${folderImg.htmlFile}"/>
      </navPoint>
`;
        }
        
        navPoints += `    </navPoint>
`;
        
        folderNavPoint++;
        pageOrder++; // Incrementa para a próxima pasta
      }
    }

    const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="${imageList.length}"/>
    <meta name="dtb:maxPageNumber" content="${imageList.length}"/>
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
   * Cria um documento EPUB unificado com todas as imagens coletadas
   * @param {Array} allImages - Array com informações de todas as imagens
   * @param {string} outputPath - Caminho de saída do EPUB
   * @param {string} title - Título do livro
   */
  async createMergedEpub(allImages, outputPath, title) {
    const tempDir = path.join(__dirname, 'temp_epub_merge_' + Date.now());
    
    try {
      // Cria estrutura temporária
      await fsPromises.mkdir(tempDir, { recursive: true });
      
      const uuid = this.generateUUID();
      
      console.log('\n📚 Criando EPUB unificado...');
      console.log('   📁 Criando estrutura EPUB...');
      await this.createEpubStructure(tempDir, title, uuid);
      
      console.log('   🖼️ Copiando imagens...');
      const imageList = await this.copyImagesToEpub(allImages, tempDir);
      
      console.log('   📄 Criando páginas HTML...');
      await this.createHtmlPages(imageList, tempDir);
      
      console.log('   📋 Criando manifest...');
      await this.createContentOpf(imageList, tempDir, title, uuid);
      
      console.log('   🗂️ Criando índice de navegação...');
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
    
    console.log(`\n   📚 Arquivo de saída: ${outputPath}`);
    
    // Estimativa do tamanho do arquivo
    const totalPages = allImages.length;
    console.log(`   📄 Total de páginas no EPUB: ${totalPages}`);
  }

  /**
   * Função principal que executa todo o processo
   * @param {string[]} args - Argumentos da linha de comando
   */
  async run(args) {
    try {
      console.log('📚 Iniciando fusão de imagens de múltiplas pastas em EPUB único...\n');
      
      // Valida argumentos
      const { csvFile, outputName } = this.validateArguments(args);
      
      console.log(`📄 Arquivo CSV: ${csvFile}`);
      console.log(`📚 Arquivo de saída: ${outputName}\n`);
      
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
      const outputFileName = outputName.endsWith('.epub') ? outputName : `${outputName}.epub`;
      const outputPath = path.resolve('epub', outputFileName);
      
      // Garante que a pasta 'epub' existe
      await fsPromises.mkdir('epub', { recursive: true });
      
      // Cria o EPUB unificado
      await this.createMergedEpub(allImages, outputPath, outputName);
      
      // Exibe estatísticas
      this.displayStatistics(allImages, entries, outputPath);
      
      console.log('\n✅ Fusão de EPUB concluída com sucesso!');
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
📚 Conversor de Múltiplas Pastas para EPUB Único

Descrição:
  Este script lê um arquivo CSV contendo múltiplas pastas com imagens
  e gera um único arquivo EPUB com todas as imagens organizadas em sequência.

Uso:
  node gen-lote-epub.js <arquivo-csv> <nome-do-arquivo-epub>

Argumentos:
  arquivo-csv          Caminho para arquivo CSV com as pastas (formato do analizer.js)
  nome-do-arquivo-epub Nome do arquivo EPUB único de saída (com ou sem extensão .epub)

Formato do CSV:
  O arquivo CSV deve estar no formato gerado pelo analizer.js:
  nome;caminho
  
  Exemplo:
  nome;caminho
  Capítulo 1;/caminho/para/capitulo1
  Capítulo 2;/caminho/para/capitulo2
  Capítulo 3;/caminho/para/capitulo3

Exemplos:
  # Usando CSV gerado pelo analizer
  node gen-lote-epub.js csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv manga-completo
  
  # Especificando nome com extensão
  node gen-lote-epub.js meu-arquivo.csv historia-completa.epub

Funcionamento:
  1. Lê o arquivo CSV especificado
  2. Percorre todas as pastas listadas no CSV
  3. Coleta todas as imagens de todas as pastas
  4. Ordena as imagens numericamente dentro de cada pasta
  5. Cria um único EPUB com todas as imagens organizadas por capítulos
  6. Mantém a ordem: Pasta1 (imgs 1,2,3...), Pasta2 (imgs 1,2,3...), etc.
  7. Gera índice de navegação organizado por pastas

Estrutura do EPUB:
  - Cada pasta original vira um "capítulo" no índice
  - Cada imagem vira uma página no EPUB
  - Páginas incluem título com nome da pasta e número da página
  - Navegação hierárquica: Pasta > Páginas
  - Compatível com leitores de e-book padrão

Formatos de imagem suportados:
  JPG, JPEG, PNG, GIF, BMP, WEBP

Observações:
  - As imagens devem estar nomeadas numericamente (1.jpg, 2.png, etc.)
  - Cada imagem ocupará uma página completa no EPUB
  - A qualidade e formato das imagens são preservados
  - Se uma pasta não contém imagens, ela é ignorada
  - O arquivo é salvo na pasta 'epub/' do projeto
  - Requer o comando 'zip' instalado no sistema
  - Exibe estatísticas detalhadas ao final do processamento
  
Vantagens do EPUB:
  - Menor tamanho de arquivo comparado ao PDF
  - Melhor para leitura em dispositivos móveis
  - Suporte a índice de navegação
  - Compatível com a maioria dos leitores de e-book
  - Permite zoom e ajustes de visualização
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
  
  const converter = new MergeEpubConverter();
  converter.run(args);
}

module.exports = MergeEpubConverter;
