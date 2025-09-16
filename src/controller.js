#!/usr/bin/env node

const { analyzeFolders } = require('./facade/csv');
const { processEpub } = require('./facade/epub');
const { processPdf } = require('./facade/pdf');

/**
 * Controller principal para processamento de comandos CLI
 * Responsável por processar argumentos e chamar as facades apropriadas
 */
class Controller {
  constructor() {
    this.supportedActions = ['create', 'analyze'];
    this.supportedTypes = ['pdf', 'epub'];
  }

  /**
   * Processa argumentos da linha de comando
   * @param {string[]} args - Argumentos do processo
   * @returns {Object} Objeto com parâmetros processados
   */
  parseArguments(args) {
    const params = {
      action: null,
      type: null,
      input: null,
      output: null,
      single: false
    };

    args.forEach(arg => {
      if (arg.startsWith('--action=')) {
        params.action = arg.split('=')[1];
      } else if (arg.startsWith('--type=')) {
        params.type = arg.split('=')[1];
      } else if (arg.startsWith('--input=')) {
        params.input = arg.split('=')[1];
      } else if (arg.startsWith('--output=')) {
        params.output = arg.split('=')[1];
      } else if (arg.startsWith('--single=')) {
        params.single = arg.split('=')[1] === 'true';
      }
    });

    return params;
  }

  /**
   * Valida parâmetros obrigatórios
   * @param {Object} params - Parâmetros processados
   */
  validateParameters(params) {
    const errors = [];

    if (!params.action) {
      errors.push('Parâmetro --action é obrigatório');
    } else if (!this.supportedActions.includes(params.action)) {
      errors.push(`Ação '${params.action}' não suportada. Use: ${this.supportedActions.join(', ')}`);
    }

    if (!params.input) {
      errors.push('Parâmetro --input é obrigatório');
    }

    if (params.action === 'create') {
      if (!params.type) {
        errors.push('Parâmetro --type é obrigatório para ação create');
      } else if (!this.supportedTypes.includes(params.type)) {
        errors.push(`Tipo '${params.type}' não suportado. Use: ${this.supportedTypes.join(', ')}`);
      }

      if (!params.output) {
        errors.push('Parâmetro --output é obrigatório para ação create');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Erros de validação:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }

  /**
   * Processa ação de análise de pastas
   * @param {Object} params - Parâmetros do comando
   */
  async processAnalyze(params) {
    console.log('🔍 Iniciando análise de pastas...\n');
    
    const result = await analyzeFolders({
      folderPath: params.input,
      outputName: params.output || null
    });

    console.log('\n✅ Análise concluída com sucesso!');
    console.log(`📄 Arquivo CSV gerado: ${result.csvPath}`);
    
    return result;
  }

  /**
   * Processa ação de criação de documentos
   * @param {Object} params - Parâmetros do comando
   */
  async processCreate(params) {
    console.log(`📝 Iniciando criação de ${params.type.toUpperCase()}${params.single ? ' único' : ' múltiplo'}...\n`);
    
    let result;
    
    if (params.type === 'pdf') {
      result = await processPdf({
        inputPath: params.input,
        outputPath: params.output,
        single: params.single
      });
    } else if (params.type === 'epub') {
      result = await processEpub({
        inputPath: params.input,
        outputPath: params.output,
        single: params.single
      });
    }

    console.log(`\n✅ Criação de ${params.type.toUpperCase()} concluída com sucesso!`);
    console.log(`📁 Arquivos salvos em: ${params.output}`);
    
    return result;
  }

  /**
   * Método principal de execução
   * @param {string[]} args - Argumentos da linha de comando
   */
  async run(args) {
    try {
      // Processa argumentos
      const params = this.parseArguments(args);
      
      // Valida parâmetros
      this.validateParameters(params);
      
      console.log('🚀 Sistema de Processamento de Imagens');
      console.log('='.repeat(50));
      console.log(`Ação: ${params.action}`);
      if (params.type) console.log(`Tipo: ${params.type}`);
      console.log(`Input: ${params.input}`);
      if (params.output) console.log(`Output: ${params.output}`);
      if (params.action === 'create') console.log(`Modo: ${params.single ? 'Arquivo único' : 'Múltiplos arquivos'}`);
      console.log('='.repeat(50));

      // Executa ação apropriada
      let result;
      if (params.action === 'analyze') {
        result = await this.processAnalyze(params);
      } else if (params.action === 'create') {
        result = await this.processCreate(params);
      }

      return result;

    } catch (error) {
      console.error('\n❌ Erro:', error.message);
      this.showHelp();
      process.exit(1);
    }
  }

  /**
   * Exibe ajuda do sistema
   */
  showHelp() {
    console.log(`
📖 Sistema de Processamento de Imagens - Controlador Principal

Uso:
  node src/controller.js --action=<acao> [opções]

Ações disponíveis:

  analyze - Analisa uma pasta e gera arquivo CSV
    --action=analyze --input=<pasta_origem> [--output=<nome_csv>]
    
    Exemplo:
    node src/controller.js --action=analyze --input=./manga/volumes
    node src/controller.js --action=analyze --input=./fotos --output=album-familia

  create - Cria documentos PDF ou EPUB
    --action=create --type=<tipo> --input=<csv_ou_pasta> --output=<destino> [--single=<true|false>]
    
    Tipos: pdf, epub
    Single: true = arquivo único, false = múltiplos arquivos (padrão)
    
    Exemplos:
    # EPUB único a partir de CSV
    node src/controller.js --action=create --type=epub --input=./csv/volumes.csv --output=./output/ --single=true
    
    # Múltiplos PDFs a partir de CSV
    node src/controller.js --action=create --type=pdf --input=./csv/volumes.csv --output=./output/ --single=false
    
    # PDF de uma pasta específica
    node src/controller.js --action=create --type=pdf --input=./images/volume1 --output=./output/ --single=true

Parâmetros:
  --action     Ação a ser executada (analyze, create)
  --type       Tipo de documento (pdf, epub) - apenas para create
  --input      Caminho de origem (pasta ou arquivo CSV)
  --output     Caminho de destino
  --single     Gerar arquivo único (true) ou múltiplos (false)

Observações:
  - Formatos de imagem suportados: JPG, JPEG, PNG, GIF, BMP, WEBP
  - As imagens devem estar numeradas sequencialmente (1.jpg, 2.png, etc.)
  - Para --single=true com CSV, todas as pastas são mescladas em um único arquivo
  - Para --single=false com CSV, cada pasta gera um arquivo separado
    `);
  }
}

// Execução do script
if (require.main === module) {
  const args = process.argv;
  
  // Verifica se é pedido de ajuda
  if (args.includes('--help') || args.includes('-h')) {
    const controller = new Controller();
    controller.showHelp();
    process.exit(0);
  }
  
  const controller = new Controller();
  controller.run(args);
}

module.exports = { Controller };
