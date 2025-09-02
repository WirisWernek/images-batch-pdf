# 📄 Images Batch PDF

Um conjunto de ferramentas em Node.js que permite analisar pastas de um diretório e converter suas imagens em arquivos PDF de forma automatizada. O sistema funciona em duas etapas: primeiro analisa e cataloga as pastas, depois converte as imagens de cada pasta em PDFs individuais.

## 🎯 O que o projeto faz?

Este projeto oferece uma solução completa para converter múltiplas pastas contendo imagens em arquivos PDF separados. É especialmente útil quando você tem uma estrutura de pastas onde cada pasta representa um documento ou conjunto de imagens que devem ser convertidos em PDFs individuais.

### Fluxo de trabalho:
1. **Análise**: O script `analizer.js` examina um diretório e lista todas as pastas filhas
2. **Catalogação**: Cria um arquivo CSV com a lista de pastas encontradas
3. **Conversão**: O script `proccess.js` lê o CSV e converte as imagens de cada pasta em PDFs

## 🚀 Características

- � **Análise automática de pastas**: Examina diretórios e cataloga pastas filhas
- 📊 **Geração de CSV**: Cria arquivos de controle para processamento em lote
- �️ **Conversão de imagens**: Transforma imagens numeradas em PDFs
- 📋 **Processamento em lote**: Converte múltiplas pastas de uma só vez
- 🔄 **Quatro modos de operação**: Análise, conversão individual, conversão em lote e fusão em PDF único
- ✅ **Ordenação inteligente**: Organiza imagens numericamente (1, 2, 3, ..., 10, 11)
- 🎯 **Preservação de qualidade**: Mantém a qualidade original das imagens

## 📦 Como instalar e começar

### 1. Clonar o projeto

```bash
# Clona o repositório
git clone https://github.com/WirisWernek/images-batch-pdf.git
cd images-batch-pdf

# Ou baixe e extraia o arquivo ZIP do GitHub
```

### 2. Instalar dependências

```bash
# Instala as bibliotecas necessárias
npm install
```

### 3. Criar pastas necessárias

```bash
# Cria as pastas onde os arquivos serão salvos
mkdir -p csv pdf
```

## 🛠️ Como usar - Quatro modos de operação

### Modo 1: 📊 Análise de Pastas (`analizer.js`)

**O que faz**: Examina um diretório e cria um arquivo CSV listando todas as pastas filhas encontradas.

**Quando usar**: Quando você tem um diretório com várias pastas e quer preparar uma lista para conversão em lote.

```bash
# Comando básico
npm run analize /caminho/para/diretorio

# Exemplo prático
npm run analize /home/usuario/documentos/escaneados
```

**O que acontece**:
1. O script examina o diretório informado
2. Lista todas as pastas filhas (ignora arquivos)
3. Gera um arquivo CSV na pasta `csv/` com nome único (UUID)
4. O CSV contém: nome da pasta e caminho completo

**Exemplo de saída no terminal**:
```
Analisando pasta: /home/usuario/documentos/escaneados
Encontradas 3 pasta(s)
Arquivo CSV gerado com sucesso!
Caminho completo: /home/usuario/projeto/csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv
```

### Modo 2: � Conversão Individual (`proccess.js`)

**O que faz**: Converte as imagens de uma pasta específica em um arquivo PDF.

**Quando usar**: Quando você quer converter apenas uma pasta de imagens em PDF.

```bash
# Comando básico
npm run proccess /caminho/da/pasta nome-do-arquivo

# Exemplo prático
npm run proccess /home/usuario/documentos/pasta1 documento1
```

**Exemplo de saída no terminal**:
```
🚀 Iniciando conversão de imagens para PDF...

📁 Pasta: /home/usuario/documentos/pasta1
📄 Arquivo de saída: documento1

📖 Lendo arquivos da pasta...
Encontrados 5 arquivo(s) de imagem

🔍 Validando arquivos...

📝 Criando PDF...

✅ Conversão concluída com sucesso!
📄 Arquivo salvo em: /home/user/images-batch-pdf/pdf/documento1.pdf
```

### Modo 3: 📋 Conversão em Lote (`proccess.js` + CSV)

**O que faz**: Lê um arquivo CSV (gerado pelo `analizer.js`) e converte todas as pastas listadas em PDFs separados.

**Quando usar**: Quando você quer converter múltiplas pastas de uma só vez, usando o CSV gerado na etapa de análise.

```bash
# Usando o CSV gerado pelo analizer
npm run proccess csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv
```

**Exemplo de saída no terminal**:
```
🚀 Iniciando conversão de imagens para PDF...

📄 Arquivo CSV: csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv

📋 Processando 3 entrada(s) do CSV...

📁 Processando 1/3
   🖼️ Encontradas 8 imagem(ns)
   📝 Criando PDF: pdf/Pasta1.pdf
   ✅ PDF criado: /home/user/images-batch-pdf/pdf/Pasta1.pdf

📁 Processando 2/3
   🖼️ Encontradas 12 imagem(ns)
   📝 Criando PDF: pdf/Pasta2.pdf
   ✅ PDF criado: /home/user/images-batch-pdf/pdf/Pasta2.pdf

📁 Processando 3/3
   🖼️ Encontradas 6 imagem(ns)
   📝 Criando PDF: pdf/Pasta3.pdf
   ✅ PDF criado: /home/usuario/projeto/pdf/Pasta3.pdf

🎉 Processamento do CSV concluído!
```

### Modo 4: 🔗 Fusão em PDF Único (`merge-pdf.js`)

**O que faz**: Lê um arquivo CSV (gerado pelo `analizer.js`) e combina todas as imagens de todas as pastas em um único arquivo PDF.

**Quando usar**: Quando você quer criar um único documento PDF contendo todas as imagens de múltiplas pastas em sequência.

```bash
# Usando o CSV gerado pelo analizer
npm run merge csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv documento-completo

# Especificando nome com extensão
npm run merge meu-arquivo.csv relatorio-unificado.pdf
```

**Exemplo de saída no terminal**:
```
🔗 Iniciando fusão de imagens de múltiplas pastas em PDF único...

📄 Arquivo CSV: csv/aa96cdc2-f222-4b49-9b68-c6e5f311e364.csv
📄 Arquivo de saída: documento-completo

📋 Coletando imagens de 3 pasta(s)...

📁 Processando pasta 1/3: Pasta1
   🖼️ Encontradas 8 imagem(ns)
   ✅ 8 imagem(ns) adicionadas

📁 Processando pasta 2/3: Pasta2
   🖼️ Encontradas 12 imagem(ns)
   ✅ 12 imagem(ns) adicionadas

📁 Processando pasta 3/3: Pasta3
   🖼️ Encontradas 6 imagem(ns)
   ✅ 6 imagem(ns) adicionadas

🎯 Total de imagens coletadas: 26

📝 Criando PDF unificado...
   📄 Processadas 10/26 imagens
   📄 Processadas 20/26 imagens
   📄 Processadas 26/26 imagens

📊 Estatísticas do processamento:
   📂 Pastas processadas: 3
   🖼️ Total de imagens: 26

   📈 Imagens por pasta:
     • Pasta1: 8 imagem(ns)
     • Pasta2: 12 imagem(ns)
     • Pasta3: 6 imagem(ns)

   📄 Arquivo de saída: /home/user/projeto/pdf/documento-completo.pdf

✅ Fusão de PDFs concluída com sucesso!
🎉 Arquivo unificado salvo em: /home/user/projeto/pdf/documento-completo.pdf
```

## 🔗 Como os modos se conectam

O sistema oferece **4 modos diferentes** que podem ser usados conforme sua necessidade:

### 📊 **Modo 1 - Análise** (`analizer.js`)
- **Entrada**: Um diretório com várias pastas
- **Saída**: Arquivo CSV listando todas as pastas encontradas
- **Uso**: Preparação para processamento em lote

### 🔀 **Modo 2 - Conversão Individual** (`proccess.js`)
- **Entrada**: Uma pasta específica + nome do arquivo
- **Saída**: Um PDF com as imagens dessa pasta
- **Uso**: Converter apenas uma pasta por vez

### 📋 **Modo 3 - Conversão em Lote** (`proccess.js` + CSV)
- **Entrada**: Arquivo CSV (do Modo 1)
- **Saída**: Múltiplos PDFs (um para cada pasta do CSV)
- **Uso**: Converter várias pastas em PDFs separados

### 🔗 **Modo 4 - Fusão Unificada** (`merge-pdf.js` + CSV)
- **Entrada**: Arquivo CSV (do Modo 1)
- **Saída**: Um único PDF com todas as imagens de todas as pastas
- **Uso**: Criar um documento único com tudo junto

### 🎯 **Comparação dos Modos de Conversão**

| Modo | Entrada | Resultado | Exemplo de Uso |
|------|---------|-----------|----------------|
| **Individual** | 1 pasta | 1 PDF | Converter apenas "Contrato_Casa" |
| **Lote** | CSV com 3 pastas | 3 PDFs separados | "Contrato_Casa.pdf", "Documento_Carro.pdf", "Certidao.pdf" |
| **Fusão** | CSV com 3 pastas | 1 PDF unificado | "Documentos_Completos.pdf" (todas as imagens juntas) |

### Fluxo completo de trabalho:

1. **Passo 1 - Análise**: 
   ```bash
   npm run analize /home/usuario/documentos/escaneados
   ```
   - Resultado: Arquivo CSV em `csv/[uuid].csv`

2. **Passo 2 - Conversão em Lote**:
   ```bash
   npm run proccess csv/[uuid].csv
   ```
   - Resultado: Vários PDFs em `pdf/`

### Exemplo prático completo:

Imagine que você tem esta estrutura de pastas:
```
/home/usuario/documentos/escaneados/
├── Contrato_Casa/
│   ├── 1.jpg
│   ├── 2.jpg
│   └── 3.jpg
├── Documento_Carro/
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│   └── 4.png
└── Certidao_Nascimento/
    ├── 1.jpg
    └── 2.jpg
```

**Passo 1** - Analise as pastas:
```bash
npm run analize /home/usuario/documentos/escaneados
```

**Resultado**: Cria `csv/xyz123.csv` com:
```csv
nome;caminho
Contrato_Casa;/home/usuario/documentos/escaneados/Contrato_Casa
Documento_Carro;/home/usuario/documentos/escaneados/Documento_Carro
Certidao_Nascimento;/home/usuario/documentos/escaneados/Certidao_Nascimento
```

**Passo 2** - Converta todas em PDF:
```bash
npm run proccess csv/xyz123.csv
```

**Resultado**: Cria 3 PDFs em `pdf/`:
- `pdf/Contrato_Casa.pdf` (com 3 páginas)
- `pdf/Documento_Carro.pdf` (com 4 páginas)  
- `pdf/Certidao_Nascimento.pdf` (com 2 páginas)

## 📁 Estrutura necessária para as imagens

Para que a conversão funcione corretamente, as imagens dentro de cada pasta devem estar nomeadas numericamente:

```
pasta-exemplo/
├── 1.jpg      ← Primeira página
├── 2.png      ← Segunda página  
├── 3.jpeg     ← Terceira página
├── 4.gif      ← Quarta página
└── 10.webp    ← Décima página (ordena corretamente)
```

**Importante**: O sistema ordena as imagens numericamente, então `10.jpg` vem depois de `9.jpg` (não depois de `1.jpg`).

## 🖼️ Formatos de imagem suportados

- **JPG** / **JPEG**
- **PNG** 
- **GIF**
- **BMP**
- **WEBP**

## � Estrutura dos arquivos CSV

O arquivo CSV gerado pelo `analizer.js` tem este formato:

```csv
nome;caminho
Pasta1;/caminho/completo/para/Pasta1
Pasta2;/caminho/completo/para/Pasta2
"Pasta com espaços";/caminho/para/pasta com espaços
```

- **Nome**: Nome da pasta (será usado como nome do PDF)
- **Caminho**: Caminho completo para a pasta contendo as imagens
- **Separador**: Ponto e vírgula (;)
- **Aspas**: Usadas quando o nome contém espaços ou caracteres especiais

## 🛠️ Estrutura do projeto

```
images-batch-pdf/
├── analizer.js           # Script de análise de pastas
├── proccess.js          # Script de conversão para PDF  
├── merge-pdf.js         # Script de fusão em PDF único
├── package.json         # Configurações e dependências
├── readme.md           # Esta documentação
├── .gitignore          # Arquivos ignorados pelo Git
├── csv/                # Pasta onde ficam os arquivos CSV
│   ├── arquivo1.csv
│   └── arquivo2.csv
└── pdf/                # Pasta onde ficam os PDFs gerados
    ├── documento1.pdf
    └── documento2.pdf
```

## ⚠️ Coisas importantes para saber

### Erros comuns e soluções:

1. **"Pasta não encontrada"**
   - Verifique se o caminho está correto
   - Use caminhos absolutos quando possível

2. **"Nenhuma imagem encontrada"**
   - Verifique se a pasta contém arquivos de imagem
   - Confirme se os formatos são suportados

3. **"Erro ao criar PDF"**
   - Verifique se a pasta `pdf/` existe
   - Confirme se você tem permissão de escrita

### Dicas de uso:

- **Caminhos com espaços**: Use aspas: `npm run analize "/pasta com espaços"`
- **Muitas pastas**: O modo CSV é mais eficiente que conversões individuais
- **Organização**: Mantenha os CSVs na pasta `csv/` para facilitar localização
- **Backup**: Os arquivos CSV podem ser reutilizados quantas vezes quiser

## 🚀 Comandos rápidos de referência

```bash
# Instalar dependências
npm install

# Criar pastas necessárias  
mkdir -p csv pdf

# Analisar um diretório
npm run analize /caminho/para/diretorio

# Converter uma pasta específica
npm run proccess /pasta/com/imagens nome-pdf

# Conversão em lote usando CSV
npm run proccess csv/nome-do-arquivo.csv

# Fusão de múltiplas pastas em PDF único
npm run merge csv/nome-do-arquivo.csv documento-unificado
```

## 👨‍💻 Desenvolvido por

**Wiris Wernek**  
GitHub: [@WirisWernek](https://github.com/WirisWernek)

## 📜 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

- Relatar bugs
- Sugerir melhorias
- Submeter pull requests
- Melhorar a documentação

## ⭐ Se este projeto foi útil

Se este projeto te ajudou, considere dar uma ⭐ no repositório!
