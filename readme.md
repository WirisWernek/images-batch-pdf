# Images Batch PDF

Ferramenta em Node.js para processar pastas com imagens e gerar arquivos PDF ou EPUB em modo individual, em lote (via CSV) ou consolidado (arquivo unico).

Este README cobre o uso via CLI.

## O que o projeto faz hoje

1. Analisa um diretorio e gera um CSV com as subpastas imediatas.
2. Converte imagens de uma pasta para um PDF.
3. Converte varias pastas (via CSV) para varios PDFs.
4. Consolida varias pastas (via CSV) em um unico PDF.
5. Converte imagens de uma pasta para um EPUB.
6. Converte varias pastas (via CSV) para varios EPUBs.
7. Consolida varias pastas (via CSV) em um unico EPUB.

## Pre-requisitos

- Node.js >= 14
- npm
- Comando `zip` disponivel no sistema (necessario para gerar EPUB)
- Permissao de leitura nas pastas de origem e escrita no projeto

## Instalacao

```bash
npm install
mkdir -p csv pdf epub
```

## Comandos disponiveis

```bash
npm run analize
npm run gen-pdf
npm run gen-lote-pdf
npm run gen-epub
npm run gen-lote-epub
```

## Modos de uso (CLI)

### 1) Analise de pastas

Gera um CSV no formato `nome;caminho` com as subpastas imediatas do diretorio informado.

```bash
# nome automatico
npm run analize /caminho/para/diretorio

# nome customizado
npm run analize /caminho/para/diretorio meu-lote
```

Saida: `csv/<nome>.csv`.

### 2) PDF individual (uma pasta)

```bash
npm run gen-pdf /caminho/da/pasta nome-do-arquivo
```

Saida: `<nome-do-arquivo>.pdf` no diretorio atual do projeto.

### 3) PDF em lote por CSV

```bash
npm run gen-pdf csv/arquivo.csv
```

Saida: um PDF por linha valida do CSV, em `pdf/`.

### 4) PDF consolidado unico por CSV

```bash
npm run gen-lote-pdf csv/arquivo.csv documento-unificado
```

Saida: `pdf/documento-unificado.pdf`.

### 5) EPUB (individual e lote)

```bash
# individual
npm run gen-epub /caminho/da/pasta nome-do-livro

# lote por CSV
npm run gen-epub csv/arquivo.csv
```

Saida:
- Individual: `epub/<nome-do-livro>.epub`
- Lote: um EPUB por linha valida do CSV, em `epub/`

### 6) EPUB consolidado unico por CSV

```bash
npm run gen-lote-epub csv/arquivo.csv livro-unificado
```

Saida: `epub/livro-unificado.epub`.

## Formato do CSV

Cabecalho esperado:

```csv
nome;caminho
```

Exemplo:

```csv
nome;caminho
Pasta1;/caminho/para/Pasta1
"Pasta com espacos";/caminho/para/pasta com espacos
```

## Regras de ordenacao

- Subpastas no `analizer.js`: ordenacao natural com locale `pt-BR`.
- Imagens nos conversores: tenta ordenar numericamente pelo nome-base (`1`, `2`, `10`); se nao for numerico, cai para ordem alfabetica.

## Formatos de imagem suportados

- `.jpg`
- `.jpeg`
- `.png`
- `.gif`
- `.bmp`
- `.webp`

## Limitacoes conhecidas

1. `analizer.js` nao cria automaticamente a pasta `csv/` se ela nao existir.
2. `gen-pdf.js` no modo individual salva no diretorio atual (nao forca `pdf/`).
3. `gen-pdf.js` nao cria automaticamente a pasta `pdf/` no modo lote.
4. A validacao de tipo de imagem e feita por extensao de arquivo.
5. Arquivos de saida podem ser sobrescritos sem confirmacao.
6. CSV com cabecalho e sem entradas validas gera erro de "Nenhuma entrada valida" nos modos por CSV.

## Estrutura esperada

```text
images-batch-pdf/
|-- analizer.js
|-- gen-pdf.js
|-- gen-lote-pdf.js
|-- gen-epub.js
|-- gen-lote-epub.js
|-- package.json
|-- csv/
|-- pdf/
`-- epub/
```

## Exemplo rapido de fluxo

```bash
# 1) analisar diretorio com subpastas
npm run analize /home/usuario/documentos lote-documentos

# 2) gerar um PDF por pasta listada no CSV
npm run gen-pdf csv/lote-documentos.csv

# 3) gerar um PDF unico com todas as imagens
npm run gen-lote-pdf csv/lote-documentos.csv lote-completo
```

## Licenca

MIT.
