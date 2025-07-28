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
 * @returns {string} Caminho completo do arquivo CSV gerado
 */
function main(folderPath) {
    try {
        console.log(`Analisando pasta: ${folderPath}`);
        
        // Lista as pastas filhas imediatas
        const folders = listImmediateFolders(folderPath);
        console.log(`Encontradas ${folders.length} pasta(s)`);

        // Gera nome do arquivo CSV com UUID
        const uuid = generateUUID(folderPath);
        const csvFileName = `${uuid}.csv`;
        const csvPath = path.join(process.cwd(),'csv', csvFileName);

        // Gera o arquivo CSV
        const fullCsvPath = generateCSV(folders, csvPath);
        
        console.log(`Arquivo CSV gerado com sucesso!`);
        console.log(`Caminho completo: ${fullCsvPath}`);
        
        return fullCsvPath;
    } catch (error) {
        console.error(`Erro: ${error.message}`);
        process.exit(1);
    }
}

// Execução do script
if (require.main === module) {
    // Verifica se o caminho foi fornecido como argumento
    const targetPath = process.argv[2];
    
    if (!targetPath) {
        console.error('Uso: node script.js <caminho_da_pasta>');
        console.error('Exemplo: node script.js /home/usuario/documentos');
        process.exit(1);
    }

    // Executa a função principal
    main(targetPath);
}

module.exports = {
    main,
    listImmediateFolders,
    generateCSV,
    generateUUID
};