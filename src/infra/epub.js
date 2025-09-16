const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { isValidImageFile } = require('../service/validate');
const { sortFilesNumerically, sortImagesByFolderAndIndex } = require('../service/order');

/**
 * Infraestrutura para operações de EPUB
 * Interage diretamente com o sistema de arquivos para geração de EPUBs
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
    
    console.log(`📚 Coletando imagens da pasta ${i + 1}/${entries.length}: ${nome}`);
    
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
 * Gera um UUID único para o EPUB
 * @returns {string} UUID
 */
const generateEpubUUID = () => {
  return crypto.randomUUID();
};

/**
 * Cria a estrutura base do EPUB
 * @param {string} tempDir - Diretório temporário
 * @param {string} title - Título do livro
 * @param {string} uuid - UUID único
 */
const createEpubStructure = async (tempDir, title, uuid) => {
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
};

/**
 * Copia imagens para o EPUB e retorna lista de arquivos
 * @param {string[]} imagePaths - Caminhos das imagens
 * @param {string} tempDir - Diretório temporário
 * @returns {Promise<Array>} Lista de informações das imagens
 */
const copyImagesToEpub = async (imagePaths, tempDir) => {
  const imageList = [];
  
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const ext = path.extname(imagePath);
    const imageName = `img${i + 1}${ext}`;
    const destPath = path.join(tempDir, 'OEBPS', 'images', imageName);
    
    // Copia imagem
    await fsPromises.copyFile(imagePath, destPath);
    
    imageList.push({
      id: `img${i + 1}`,
      src: `images/${imageName}`,
      mediaType: getImageMediaType(ext),
      htmlId: `page${i + 1}`,
      htmlFile: `text/page${i + 1}.html`,
      title: `Página ${i + 1}`
    });
  }
  
  return imageList;
};

/**
 * Copia imagens com informações de pasta para o EPUB
 * @param {Array} allImages - Array com informações das imagens
 * @param {string} tempDir - Diretório temporário
 * @returns {Promise<Array>} Lista de informações das imagens
 */
const copyImagesWithInfoToEpub = async (allImages, tempDir) => {
  const imageList = [];
  
  for (let i = 0; i < allImages.length; i++) {
    const imageInfo = allImages[i];
    const ext = path.extname(imageInfo.path);
    const imageName = `img${i + 1}${ext}`;
    const destPath = path.join(tempDir, 'OEBPS', 'images', imageName);
    
    // Copia imagem
    await fsPromises.copyFile(imageInfo.path, destPath);
    
    imageList.push({
      id: `img${i + 1}`,
      src: `images/${imageName}`,
      mediaType: getImageMediaType(ext),
      htmlId: `page${i + 1}`,
      htmlFile: `text/page${i + 1}.html`,
      title: `${imageInfo.folderName} - Página ${imageInfo.imageIndex}`,
      folderName: imageInfo.folderName,
      folderIndex: imageInfo.folderIndex
    });
  }
  
  return imageList;
};

/**
 * Obtém o media type correto para cada tipo de imagem
 * @param {string} ext - Extensão do arquivo
 * @returns {string} Media type
 */
const getImageMediaType = (ext) => {
  const extLower = ext.toLowerCase();
  switch (extLower) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
};

/**
 * Cria arquivos HTML para cada imagem
 * @param {Array} imageList - Lista de imagens
 * @param {string} tempDir - Diretório temporário
 */
const createHtmlPages = async (imageList, tempDir) => {
  for (const image of imageList) {
    const htmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${image.title}</title>
  <style type="text/css">
    * { margin: 0; padding: 0; border: 0; outline: 0; }
    html, body { 
      width: 100%; 
      height: 100%; 
      margin: 0; 
      padding: 0; 
      border: 0;
      overflow: hidden;
    }
    body { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: transparent;
    }
    img { 
      width: 100vw; 
      height: 100vh; 
      object-fit: contain; 
      border: none; 
      outline: none;
      display: block;
    }
  </style>
</head>
<body>
  <img src="../${image.src}" alt="${image.title}" />
</body>
</html>`;

    await fsPromises.writeFile(
      path.join(tempDir, 'OEBPS', image.htmlFile),
      htmlContent
    );
  }
};

/**
 * Cria o arquivo content.opf (manifest do EPUB)
 * @param {Array} imageList - Lista de imagens
 * @param {string} tempDir - Diretório temporário
 * @param {string} title - Título do livro
 * @param {string} uuid - UUID único
 */
const createContentOpf = async (imageList, tempDir, title, uuid) => {
  const now = new Date().toISOString().split('T')[0];
  
  let manifest = '';
  let spine = '';
  
  // Adiciona itens ao manifest e spine
  for (const image of imageList) {
    manifest += `    <item id="${image.id}" href="${image.src}" media-type="${image.mediaType}"/>\n`;
    manifest += `    <item id="${image.htmlId}" href="${image.htmlFile}" media-type="application/xhtml+xml"/>\n`;
    spine += `    <itemref idref="${image.htmlId}"/>\n`;
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
};

/**
 * Cria o arquivo toc.ncx (índice de navegação) simples
 * @param {Array} imageList - Lista de imagens
 * @param {string} tempDir - Diretório temporário
 * @param {string} title - Título do livro
 * @param {string} uuid - UUID único
 */
const createSimpleTocNcx = async (imageList, tempDir, title, uuid) => {
  let navPoints = '';
  
  for (const image of imageList) {
    navPoints += `    <navPoint id="${image.htmlId}" playOrder="${imageList.indexOf(image) + 1}">
      <navLabel><text>${image.title}</text></navLabel>
      <content src="${image.htmlFile}"/>
    </navPoint>\n`;
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
};

/**
 * Cria o arquivo toc.ncx (índice de navegação) hierárquico para múltiplas pastas
 * @param {Array} imageList - Lista de imagens
 * @param {string} tempDir - Diretório temporário
 * @param {string} title - Título do livro
 * @param {string} uuid - UUID único
 */
const createHierarchicalTocNcx = async (imageList, tempDir, title, uuid) => {
  let navPoints = '';
  let currentFolder = '';
  let folderNavPoint = 1;
  let pageOrder = 1;
  
  for (const image of imageList) {
    if (image.folderName !== currentFolder) {
      // Fecha navPoint anterior se existir
      if (currentFolder) {
        navPoints += '    </navPoint>\n';
      }
      
      currentFolder = image.folderName;
      
      // Inicia novo navPoint para a pasta
      navPoints += `    <navPoint id="folder${folderNavPoint}" playOrder="${pageOrder}">
      <navLabel><text>${currentFolder}</text></navLabel>
      <content src="${image.htmlFile}"/>
`;
      folderNavPoint++;
    }
    
    // Adiciona página dentro da pasta
    navPoints += `      <navPoint id="${image.htmlId}" playOrder="${pageOrder}">
        <navLabel><text>${image.title}</text></navLabel>
        <content src="${image.htmlFile}"/>
      </navPoint>
`;
    pageOrder++;
  }
  
  // Fecha último navPoint
  if (currentFolder) {
    navPoints += '    </navPoint>\n';
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
};

/**
 * Compacta a estrutura EPUB em um arquivo .epub usando archiver
 * @param {string} tempDir - Diretório temporário
 * @param {string} outputPath - Caminho de saída
 */
const createEpubFile = async (tempDir, outputPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compressão
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Adiciona o mimetype sem compressão (primeiro arquivo, conforme especificação EPUB)
    archive.file(path.join(tempDir, 'mimetype'), { 
      name: 'mimetype',
      store: true // Sem compressão
    });

    // Adiciona todos os outros arquivos com compressão
    archive.directory(path.join(tempDir, 'META-INF'), 'META-INF');
    archive.directory(path.join(tempDir, 'OEBPS'), 'OEBPS');

    archive.finalize();
  });
};

/**
 * Remove diretório temporário
 * @param {string} tempDir - Caminho do diretório temporário
 */
const cleanupTempDir = async (tempDir) => {
  try {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`⚠️ Erro ao limpar diretório temporário: ${error.message}`);
  }
};

/**
 * Cria um documento EPUB simples
 * @param {string[]} imagePaths - Array de caminhos das imagens
 * @param {string} outputPath - Caminho de saída do EPUB
 * @param {string} title - Título do livro
 */
const createEpubDocument = async (imagePaths, outputPath, title) => {
  const tempDir = path.join(__dirname, '..', '..', 'temp_epub_' + Date.now());
  
  try {
    const uuid = generateEpubUUID();
    
    // Cria estrutura EPUB
    await createEpubStructure(tempDir, title, uuid);
    
    // Copia imagens
    const imageList = await copyImagesToEpub(imagePaths, tempDir);
    
    // Cria páginas HTML
    await createHtmlPages(imageList, tempDir);
    
    // Cria manifest
    await createContentOpf(imageList, tempDir, title, uuid);
    
    // Cria índice de navegação
    await createSimpleTocNcx(imageList, tempDir, title, uuid);
    
    // Gera arquivo EPUB
    await createEpubFile(tempDir, outputPath);
    
  } finally {
    // Limpa diretório temporário
    await cleanupTempDir(tempDir);
  }
};

/**
 * Cria um documento EPUB mesclado com múltiplas pastas
 * @param {Array} allImages - Array com informações de todas as imagens
 * @param {string} outputPath - Caminho de saída do EPUB
 * @param {string} title - Título do livro
 */
const createMergedEpubDocument = async (allImages, outputPath, title) => {
  const tempDir = path.join(__dirname, '..', '..', 'temp_epub_merge_' + Date.now());
  
  try {
    const uuid = generateEpubUUID();
    
    // Cria estrutura EPUB
    await createEpubStructure(tempDir, title, uuid);
    
    // Copia imagens com informações
    const imageList = await copyImagesWithInfoToEpub(allImages, tempDir);
    
    // Cria páginas HTML
    await createHtmlPages(imageList, tempDir);
    
    // Cria manifest
    await createContentOpf(imageList, tempDir, title, uuid);
    
    // Cria índice de navegação hierárquico
    await createHierarchicalTocNcx(imageList, tempDir, title, uuid);
    
    // Gera arquivo EPUB
    await createEpubFile(tempDir, outputPath);
    
  } finally {
    // Limpa diretório temporário
    await cleanupTempDir(tempDir);
  }
};

module.exports = {
  collectImagesFromFolder,
  collectImagesFromMultipleFolders,
  createEpubDocument,
  createMergedEpubDocument
};
