# 📋 Resumo das Mudanças - Nova Estrutura de Comandos

## ✅ Arquivos Renomeados

| Nome Antigo         | Nome Novo           | Função                            |
|---------------------|---------------------|-----------------------------------|
| `proccess.js`       | `gen-pdf.js`        | Conversão individual/lote de PDF  |
| `epub-converter.js` | `gen-epub.js`       | Conversão individual/lote de EPUB |
| `merge-pdf.js`      | `gen-lote-pdf.js`   | Fusão de múltiplas pastas em PDF  |
| `merge-epub.js`     | `gen-lote-epub.js`  | Fusão de múltiplas pastas em EPUB |

## 🔧 Comandos NPM Atualizados

| Comando Antigo    | Comando Novo         | Função                            |
|-------------------|----------------------|-----------------------------------|
| `npm run proccess` | `npm run gen-pdf`    | Conversão de imagens para PDF     |
| `npm run epub`     | `npm run gen-epub`   | Conversão de imagens para EPUB    |
| `npm run merge`    | `npm run gen-lote-pdf` | Fusão em PDF único              |
| `npm run merge-epub` | `npm run gen-lote-epub` | Fusão em EPUB único          |

## 📚 Estrutura de Comandos Padronizada

### Análise de Pastas
```bash
npm run analize /caminho/do/diretorio
```

### Conversão Individual
```bash
npm run gen-pdf /pasta/imagens nome-arquivo    # PDF individual
npm run gen-epub /pasta/imagens nome-arquivo   # EPUB individual
```

### Conversão em Lote (CSV)
```bash
npm run gen-pdf csv/arquivo.csv               # Múltiplos PDFs
npm run gen-epub csv/arquivo.csv              # Múltiplos EPUBs
```

### Fusão em Arquivo Único (CSV)
```bash
npm run gen-lote-pdf csv/arquivo.csv nome     # PDF unificado
npm run gen-lote-epub csv/arquivo.csv nome    # EPUB unificado
```

## 🎯 Lógica da Nova Nomenclatura

- **`gen-`**: Prefixo que indica "geração" de arquivos
- **`pdf`/`epub`**: Formato de saída
- **`lote`**: Indica processamento de múltiplas pastas em arquivo único
- **Sem `lote`**: Indica processamento individual ou separado

## ✅ Teste de Funcionamento

Todos os comandos foram testados e estão funcionando corretamente:

- ✅ `npm run gen-pdf` - OK
- ✅ `npm run gen-epub` - OK  
- ✅ `npm run gen-lote-pdf` - OK
- ✅ `npm run gen-lote-epub` - OK (testado com CSV real)

## 📄 Documentação Atualizada

- ✅ Package.json atualizado
- ✅ README.md completamente atualizado
- ✅ Ajuda (--help) de todos os scripts atualizada
- ✅ Todas as referências internas corrigidas

A estrutura agora está mais clara e organizando, facilitando o entendimento de qual comando usar para cada situação específica.
