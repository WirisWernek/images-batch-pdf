# 📄 Conversor de Imagens para PDF (CLI)

Um utilitário de linha de comando em Node.js que converte imagens numeradas sequencialmente em um arquivo PDF, preservando a qualidade e formato originais.

## 🚀 Características

- ✅ Converte múltiplas imagens em um único PDF
- 📊 Ordena automaticamente por números crescentes (1, 2, 3, ..., 10, 11, etc.)
- 🖼️ Preserva qualidade e formato das imagens
- 📋 Uma imagem por página no PDF
- 🎯 Suporte a múltiplos formatos de imagem
- 🔧 Arquitetura modular e fácil manutenção

## 📦 Instalação

1. Clone ou baixe o projeto
2. Instale as dependências:

```bash
npm install
```

### Dependências

- **pdfkit**: Para criação de documentos PDF
- **image-size** (opcional): Para obter dimensões reais das imagens

## 🎯 Uso

### Sintaxe básica:
```bash
node index.js <caminho-da-pasta> <nome-do-arquivo-pdf>
```

### Exemplos:

```bash
# Exemplo básico
node index.js ./imagens meu-documento

# Com caminho absoluto
node index.js /home/user/fotos album-familia.pdf

# Windows
node index.js "C:\Users\Nome\Pictures" relatorio

# Ver ajuda
node index.js --help
```

## 📁 Estrutura dos Arquivos

As imagens devem estar nomeadas numericamente:
```
pasta-imagens/
├── 1.jpg
├── 2.png
├── 3.jpeg
├── 4.gif
├── ...
└── 15.webp
```

## 🖼️ Formatos Suportados

- JPG / JPEG
- PNG
- GIF
- BMP
- WEBP

## 🏗️ Arquitetura do Código

O script foi desenvolvido com foco em modularidade e reutilização:

### Classe Principal: `ImageToPdfConverter`

#### Métodos Públicos:
- `run(args)` - Método principal que executa todo o processo
- `validateArguments(args)` - Valida argumentos da linha de comando

#### Métodos de Validação:
- `validateFolder(folderPath)` - Verifica se a pasta existe
- `readImageFiles(folderPath)` - Lê apenas arquivos de imagem
- `sortFilesNumerically(files)` - Ordena arquivos por número

#### Métodos de Processamento:
- `getImageDimensions(imagePath)` - Obtém dimensões da imagem
- `createPdf(imagePaths, outputPath)` - Cria o documento PDF

### Benefícios da Arquitetura:

1. **Reutilização**: Cada função tem responsabilidade única
2. **Manutenção**: Fácil localizar e corrigir problemas
3. **Extensibilidade**: Simples adicionar novos recursos
4. **Testabilidade**: Métodos independentes são fáceis de testar

## 🔧 Exemplo de Uso Programático

```javascript
const { ImageToPdfConverter } = require('./index.js');

const converter = new ImageToPdfConverter();

// Usar métodos individualmente
async function exemploUso() {
  const files = await converter.readImageFiles('./imagens');
  const sortedFiles = converter.sortFilesNumerically(files);
  console.log('Arquivos ordenados:', sortedFiles);
}
```

## 🚀 Instalação Global (Opcional)

Para usar o comando em qualquer lugar do sistema:

```bash
# Instalar globalmente
npm install -g .

# Usar como comando global
img2pdf ./imagens meu-documento
```

## 🛠️ Desenvolvimento

### Estrutura do Projeto:
```
projeto/
├── index.js          # Script principal
├── package.json      # Dependências e configurações
├── README.md         # Documentação
└── examples/         # Exemplos de uso (opcional)
```

### Melhorias Futuras:
- [ ] Adicionar testes automatizados
- [ ] Suporte a configuração de qualidade/compressão
- [ ] Interface gráfica opcional
- [ ] Suporte a watermarks
- [ ] Configuração de margens e layout

## 📝 Logs e Feedback

O script fornece feedback detalhado durante a execução:

```
🚀 Iniciando conversão de imagens para PDF...

📁 Pasta: ./imagens
📄 Arquivo de saída: meu-documento

📖 Lendo arquivos da pasta...
Encontrados 5 arquivo(s) de imagem
📋 Arquivos ordenados:
  1. 1.jpg
  2. 2.png
  3. 3.jpeg
  4. 10.gif
  5. 11.webp

🔍 Validando arquivos...

📝 Criando PDF...
Processada imagem 1/5: 1.jpg
Processada imagem 2/5: 2.png
...

✅ Conversão concluída com sucesso!
📄 Arquivo salvo em: /caminho/completo/meu-documento.pdf
```

## ⚠️ Tratamento de Erros

O script trata vários cenários de erro:
- Pasta não encontrada
- Nenhuma imagem na pasta
- Arquivos corrompidos
- Permissões de escrita
- Argumentos inválidos

## 📜 Licença

MIT License - Sinta-se livre para usar e modificar conforme necessário.