const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Função para executar scripts Node.js
function executeScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, scriptName);
        
        // Verifica se o script existe
        if (!fs.existsSync(scriptPath)) {
            reject(new Error(`Script ${scriptName} não encontrado`));
            return;
        }

        const process = spawn('node', [scriptPath, ...args], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            error += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    output: output.trim(),
                    error: null
                });
            } else {
                reject(new Error(error || `Processo finalizado com código ${code}`));
            }
        });

        process.on('error', (err) => {
            reject(new Error(`Erro ao executar o processo: ${err.message}`));
        });
    });
}

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para executar funções
app.post('/api/execute', async (req, res) => {
    try {
        const { function: functionName, params } = req.body;
        
        if (!functionName) {
            return res.status(400).json({
                success: false,
                error: 'Nome da função é obrigatório'
            });
        }

        let result;
        
        switch (functionName) {
            case 'analyze':
                if (!params.path) {
                    return res.status(400).json({
                        success: false,
                        error: 'Caminho do diretório é obrigatório'
                    });
                }
                result = await executeScript('analizer.js', [params.path]);
                break;

            case 'pdf-single':
                if (!params.path) {
                    return res.status(400).json({
                        success: false,
                        error: 'Caminho da pasta é obrigatório'
                    });
                }
                const pdfArgs = [params.path];
                if (params.name) {
                    pdfArgs.push(params.name);
                }
                result = await executeScript('gen-pdf.js', pdfArgs);
                break;

            case 'pdf-batch':
                if (!params.csvPath) {
                    return res.status(400).json({
                        success: false,
                        error: 'Arquivo CSV é obrigatório'
                    });
                }
                result = await executeScript('gen-lote-pdf.js', [params.csvPath]);
                break;

            case 'epub-single':
                if (!params.path) {
                    return res.status(400).json({
                        success: false,
                        error: 'Caminho da pasta é obrigatório'
                    });
                }
                const epubArgs = [params.path];
                if (params.name) {
                    epubArgs.push(params.name);
                }
                result = await executeScript('gen-epub.js', epubArgs);
                break;

            case 'epub-batch':
                if (!params.csvPath) {
                    return res.status(400).json({
                        success: false,
                        error: 'Arquivo CSV é obrigatório'
                    });
                }
                result = await executeScript('gen-lote-epub.js', [params.csvPath]);
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Função não reconhecida'
                });
        }

        res.json(result);

    } catch (error) {
        console.error('Erro ao executar função:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para listar arquivos CSV disponíveis
app.get('/api/csv-files', (req, res) => {
    try {
        const csvDir = path.join(__dirname, 'csv');
        
        if (!fs.existsSync(csvDir)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(csvDir)
            .filter(file => file.endsWith('.csv'))
            .map(file => ({
                name: file,
                path: path.join(csvDir, file),
                relativePath: `./csv/${file}`,
                size: fs.statSync(path.join(csvDir, file)).size,
                modified: fs.statSync(path.join(csvDir, file)).mtime
            }));

        res.json({ files });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para listar PDFs gerados
app.get('/api/pdf-files', (req, res) => {
    try {
        const pdfDir = path.join(__dirname, 'pdf');
        
        if (!fs.existsSync(pdfDir)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(pdfDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => ({
                name: file,
                path: path.join(pdfDir, file),
                relativePath: `./pdf/${file}`,
                size: fs.statSync(path.join(pdfDir, file)).size,
                modified: fs.statSync(path.join(pdfDir, file)).mtime
            }));

        res.json({ files });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para listar EPUBs gerados
app.get('/api/epub-files', (req, res) => {
    try {
        const epubDir = path.join(__dirname, 'epub');
        
        if (!fs.existsSync(epubDir)) {
            return res.json({ files: [] });
        }

        const files = fs.readdirSync(epubDir)
            .filter(file => file.endsWith('.epub'))
            .map(file => ({
                name: file,
                path: path.join(epubDir, file),
                relativePath: `./epub/${file}`,
                size: fs.statSync(path.join(epubDir, file)).size,
                modified: fs.statSync(path.join(epubDir, file)).mtime
            }));

        res.json({ files });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para detectar caminhos comuns do sistema
app.get('/api/common-paths', (req, res) => {
    try {
        const os = require('os');
        const homeDir = os.homedir();
        const username = os.userInfo().username;
        
        const commonPaths = [
            `${homeDir}/Downloads`,
            `${homeDir}/Documents`,
            `${homeDir}/Documentos`,
            `${homeDir}/Desktop`,
            `${homeDir}/Área de Trabalho`,
            `${homeDir}/Pictures`,
            `${homeDir}/Imagens`,
            `${homeDir}/manga`,
            `${homeDir}/ebooks`,
            `/home/${username}/Downloads`,
            `/home/${username}/Documents`,
            `/home/${username}/Documentos`,
            `/home/${username}/manga`,
            `/home/${username}/ebooks`
        ];

        // Filtra apenas os caminhos que existem
        const existingPaths = commonPaths.filter(pathStr => {
            try {
                return fs.existsSync(pathStr);
            } catch {
                return false;
            }
        });

        res.json({
            success: true,
            paths: existingPaths,
            homeDir: homeDir,
            username: username
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro no servidor:', error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📄 Interface disponível em: http://localhost:${PORT}`);
    console.log(`🔗 API endpoints disponíveis:`);
    console.log(`   - POST /api/execute - Executar funções`);
    console.log(`   - GET /api/csv-files - Listar arquivos CSV`);
    console.log(`   - GET /api/pdf-files - Listar arquivos PDF`);
    console.log(`   - GET /api/epub-files - Listar arquivos EPUB`);
    console.log(`\n✨ Para usar: abra seu navegador e acesse http://localhost:${PORT}`);
});

module.exports = app;
