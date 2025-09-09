# 🌐 Interface Web para Images Batch PDF

## 📋 Sobre a Interface

Esta interface web foi criada para facilitar o uso das funcionalidades do projeto Images Batch PDF. Ela oferece uma interface gráfica intuitiva que permite executar todas as funções principais sem usar a linha de comando.

## 🚀 Como Usar

### 1. Instalar Dependências

Primeiro, certifique-se de que todas as dependências estão instaladas:

```bash
npm install
```

### 2. Iniciar o Servidor

Execute o servidor web:

```bash
npm start
# ou
npm run server
# ou
node server.js
```

### 3. Acessar a Interface

Abra seu navegador e acesse:
```
http://localhost:3000
```

## 🎯 Funcionalidades Disponíveis na Interface

### 🔍 Analisar Pastas
- **O que faz**: Examina um diretório e cria um arquivo CSV com todas as pastas filhas
- **Entrada**: Caminho do diretório a ser analisado
- **Saída**: Arquivo CSV na pasta `csv/` com a lista de pastas encontradas

### 📄 Gerar PDF Individual  
- **O que faz**: Converte imagens de uma pasta em um único PDF
- **Entrada**: Caminho da pasta com imagens + nome opcional do PDF
- **Saída**: Arquivo PDF na pasta `pdf/`

### 📚 Gerar PDFs em Lote
- **O que faz**: Processa um CSV e gera múltiplos PDFs
- **Entrada**: Arquivo CSV (gerado pela função "Analisar Pastas")
- **Saída**: Múltiplos arquivos PDF na pasta `pdf/`

### 📖 Gerar EPUB Individual
- **O que faz**: Converte imagens de uma pasta em um único EPUB
- **Entrada**: Caminho da pasta com imagens + nome opcional do EPUB
- **Saída**: Arquivo EPUB na pasta `epub/`

### 📚 Gerar EPUBs em Lote
- **O que faz**: Processa um CSV e gera múltiplos EPUBs
- **Entrada**: Arquivo CSV (gerado pela função "Analisar Pastas")
- **Saída**: Múltiplos arquivos EPUB na pasta `epub/`

## 🛠️ Como Funciona

1. **Selecione uma função**: Clique em um dos cards na interface
2. **Preencha os campos**: Insira os caminhos e parâmetros necessários
3. **Execute**: Clique no botão para executar a função
4. **Veja o resultado**: O output aparecerá na seção de resultado

## 📁 Estrutura de Arquivos

```
/
├── server.js              # Servidor Express.js
├── public/
│   └── index.html        # Interface web
├── csv/                  # Arquivos CSV gerados
├── pdf/                  # Arquivos PDF gerados
├── epub/                 # Arquivos EPUB gerados
└── [scripts originais]   # analizer.js, gen-pdf.js, etc.
```

## 🔧 API Endpoints

A interface utiliza os seguintes endpoints da API:

- `POST /api/execute` - Executa uma função específica
- `GET /api/csv-files` - Lista arquivos CSV disponíveis
- `GET /api/pdf-files` - Lista arquivos PDF gerados
- `GET /api/epub-files` - Lista arquivos EPUB gerados

## 📝 Exemplo de Uso

### Fluxo Completo:

1. **Analisar**: 
   - Função: "Analisar Pastas"
   - Campo: `/home/usuario/manga-volumes/`
   - Resultado: Arquivo CSV em `csv/`

2. **Converter em Lote**:
   - Função: "Gerar PDFs em Lote" 
   - Campo: `./csv/arquivo-gerado.csv`
   - Resultado: Múltiplos PDFs em `pdf/`

## 🎨 Recursos da Interface

- ✅ **Interface Responsiva**: Funciona bem em desktop e mobile
- ✅ **Feedback Visual**: Indicadores de progresso e status
- ✅ **Validação de Campos**: Verifica se os campos obrigatórios estão preenchidos
- ✅ **Output em Tempo Real**: Mostra o resultado dos scripts em tempo real
- ✅ **Design Moderno**: Interface limpa e intuitiva

## 🔒 Segurança

- A interface só executa os scripts Node.js específicos do projeto
- Validação de parâmetros no servidor
- Não permite execução de comandos arbitrários do sistema

## 🐛 Solução de Problemas

### Servidor não inicia:
```bash
# Verifique se o Express está instalado
npm install express

# Verifique se a porta 3000 está livre
netstat -tlnp | grep :3000
```

### Erro ao executar função:
- Verifique se os caminhos informados existem
- Certifique-se de que as pastas `csv/`, `pdf/`, `epub/` existem
- Verifique as permissões de leitura/escrita

### Interface não carrega:
- Verifique se o servidor está rodando em `http://localhost:3000`
- Verifique o console do navegador para erros JavaScript

## 🔄 Integração com Scripts Originais

A interface mantém total compatibilidade com os scripts originais:
- Utiliza os mesmos scripts Node.js existentes
- Mantém a mesma estrutura de pastas
- Preserva todas as funcionalidades originais
- Permite uso híbrido (interface + linha de comando)

---

**Desenvolvido para facilitar o uso do projeto Images Batch PDF** 🚀
