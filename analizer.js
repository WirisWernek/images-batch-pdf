const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Gera um UUID baseado no timestamp atual e no caminho da pasta
 * @param {string} folderPath - Caminho da pasta
 * @returns {string} UUID gerado
 */
function generateUUID(folderPath) {
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
}

/**
 * Lista apenas as pastas filhas imediatas de um diretório
 * @param {string} targetPath - Caminho do diretório a ser analisado
 * @returns {Array} Array de objetos com nome e caminho das pastas
 */
function listImmediateFolders(targetPath) {
    try {
        if (!fs.existsSync(targetPath)) {
            throw new Error(`Caminho não encontrado: ${targetPath}`);
        }

        const stats = fs.statSync(targetPath);
        if (!stats.isDirectory()) {
            throw new Error(`O caminho informado não é um diretório: ${targetPath}`);
        }

        const items = fs.readdirSync(targetPath);
        const folders = [];

        for (const item of items) {
            const fullPath = path.join(targetPath, item);
            const itemStats = fs.statSync(fullPath);
            
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
}

/**
 * Gera arquivo CSV com a lista de pastas
 * @param {Array} folders - Array de pastas
 * @param {string} outputPath - Caminho onde salvar o CSV
 * @returns {string} Caminho completo do arquivo gerado
 */
function generateCSV(folders, outputPath) {
    try {
        // Cabeçalho do CSV
        let csvContent = 'nome;caminho\n';
        
        // Adiciona cada pasta ao CSV
        for (const folder of folders) {
            // Escapa ponto e vírgula nos dados se necessário
            const nome = folder.nome.replace(/;/g, ',');
            const caminho = folder.caminho.replace(/;/g, ',');
            csvContent += `${nome};${caminho}\n`;
        }

        fs.writeFileSync(outputPath, csvContent, 'utf8');
        return path.resolve(outputPath);
    } catch (error) {
        throw new Error(`Erro ao gerar CSV: ${error.message}`);
    }
}

/**
 * Função principal que executa todo o processo
 * @param {string} folderPath - Caminho da pasta a ser analisada
 * @param {string} [customName] - Nome personalizado para o arquivo CSV (opcional)
 * @returns {string} Caminho completo do arquivo CSV gerado
 */
function main(folderPath, customName = null) {
    try {
        console.log(`Analisando pasta: ${folderPath}`);
        
        // Lista as pastas filhas imediatas
        const folders = listImmediateFolders(folderPath);
        console.log(`Encontradas ${folders.length} pasta(s)`);

        // Determina o nome do arquivo CSV
        let csvFileName;
        if (customName) {
            // Se um nome foi fornecido, usa ele (adiciona .csv se necessário)
            csvFileName = customName.endsWith('.csv') ? customName : `${customName}.csv`;
            console.log(`Usando nome personalizado: ${csvFileName}`);
        } else {
            // Caso contrário, gera UUID
            const uuid = generateUUID(folderPath);
            csvFileName = `${uuid}.csv`;
            console.log(`Usando nome com UUID: ${csvFileName}`);
        }
        
        const csvPath = path.join(process.cwd(),'csv', csvFileName);

        // Gera o arquivo CSV
        const fullCsvPath = generateCSV(folders, csvPath);
        
        console.log(`Arquivo CSV gerado com sucesso!`);
        console.log(`Caminho completo: ${fullCsvPath}`);

        console.log('\n📌 Próximo passo:');
        const baseName = path.basename(csvFileName, '.csv');
        console.log(`npm run proccess ${fullCsvPath} ${baseName}`);
        console.log(`npm run merge ${fullCsvPath} ${baseName}`);

        return fullCsvPath;
    } catch (error) {
        console.error(`Erro: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Função de ajuda
 */
function showHelp() {
    console.log(`
🔍 Analisador de Pastas - Gerador de CSV

Uso:
  node analizer.js <caminho_da_pasta> [nome_do_csv]

Argumentos:
  caminho_da_pasta    Caminho completo da pasta a ser analisada
  nome_do_csv         Nome personalizado para o arquivo CSV (opcional)

Exemplos:
  # Gera CSV com UUID automático
  node analizer.js /home/usuario/manga

  # Gera CSV com nome personalizado
  node analizer.js /home/usuario/manga manga-volumes
  node analizer.js /home/usuario/manga manga-volumes.csv
  node analizer.js "/pasta/com espaços" "Serie Completa"

Funcionalidade:
  - Examina a pasta especificada
  - Lista todas as pastas filhas imediatas (não recursivo)
  - Gera arquivo CSV com formato: nome;caminho
  - Salva na pasta 'csv/' do projeto

Observações:
  - Se nome_do_csv não for informado, gera UUID único
  - A extensão .csv é adicionada automaticamente se omitida
  - Cria a pasta 'csv/' se não existir
  - Ignora arquivos, considera apenas pastas
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
    
    // Verifica se o caminho foi fornecido como argumento
    const targetPath = process.argv[2];
    const customName = process.argv[3]; // Nome personalizado opcional
    
    if (!targetPath) {
        console.error('❌ Erro: Caminho da pasta é obrigatório\n');
        console.error('Uso: node analizer.js <caminho_da_pasta> [nome_do_csv]');
        console.error('Exemplo: node analizer.js /home/usuario/documentos');
        console.error('Exemplo: node analizer.js /home/usuario/documentos manga-volumes');
        console.error('Exemplo: node analizer.js /home/usuario/documentos "Serie Completa.csv"');
        console.error('\nPara mais informações: node analizer.js --help');
        process.exit(1);
    }

    // Executa a função principal
    main(targetPath, customName);
}

module.exports = {
    main,
    listImmediateFolders,
    generateCSV,
    generateUUID
};