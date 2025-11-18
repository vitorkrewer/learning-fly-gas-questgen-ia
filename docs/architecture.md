# Arquitetura do Sistema
O QuestGen IA foi projetado com uma arquitetura cliente-servidor, inteiramente contida no ecossistema do Google Apps Script. Isso permite que ele funcione como um aplicativo web autônomo sem a necessidade de um servidor externo.

## Estrutura de Arquivos
O projeto é organizado em uma estrutura de pastas que separa a lógica do back-end, os arquivos de front-end e os arquivos de configuração.


/
├── src/                      # Código do lado do servidor (Back-end)
│   ├── ScriptServices.js     # Orquestrador principal, doGet, e lógica de geração
│   ├── authenticateServices.js # Funções de login e validação de token
│   ├── configServices.js     # Gerencia a criação e leitura dos bancos de dados
│   ├── questionServices.js   # Lógica para editar, excluir e buscar questões
│   ├── exportFiles.js        # Lógica para exportar para Moodle e Google Docs
│   ├── apiServices.js        # Funções para chamar a API do Gemini
│   ├── constants.js          # Constantes globais (nomes de abas, cabeçalhos)
│   └── setupUserKeys.js      # Script de configuração inicial dos usuários
│
├── html/                     # Arquivos do lado do cliente (Front-end)
│   └── index.html            # Estrutura principal da aplicação
│
├── assets/
│   ├── css/
│   │   └── stylesheet.css    # Estilos personalizados da aplicação
│   └── js/
│       └── application.js    # Lógica de front-end, manipulação do DOM
│
└── data/
    └── appsscript.json       # Manifesto do projeto, escopos e dependências


## Componentes Principais
### Back-end (Lado do Servidor)
**Execução:** Os arquivos da pasta /src contém a infraestrutura de back-end da aplicação. Ao criar os arquivos do editor do App Script, utiliza a opção `Script` correspondendo a extensão `.gs` e executado nos servidores do Google.

**Comunicação:** O front-end se comunica com o back-end através da API assíncrona google.script.run.

**ScriptServices.js:** Atua como o ponto de entrada principal (doGet) para servir a interface do usuário. Ele também contém a lógica de orquestração para o processo de geração de questões, chamando outros serviços conforme necessário.

**Serviços Modulares:** A lógica é dividida em serviços com responsabilidades únicas (autenticação, configuração, exportação), tornando o código mais limpo e fácil de manter.

**Segurança:** A segurança é garantida pela validação de um token de sessão em todas as funções que manipulam dados.

### Front-end (Lado do Cliente)
**Renderização:** O HTML é renderizado no navegador do usuário. O index.html serve como um aplicativo de página única (SPA - Single Page Application).

**application.js:** Este arquivo gerencia toda a interatividade:

- Manipulação de eventos (cliques em botões, submissão de formulários).

- Comunicação com o back-end usando google.script.run.

- Manipulação do DOM para exibir e ocultar "views", preencher modais e mostrar feedback ao usuário.

**Estilização:** O stylesheet.css, junto com o framework Bootstrap 5, é responsável por toda a aparência visual da aplicação.

### Fluxo de Dados
**Carregamento:** O usuário acessa a URL do app. O doGet no ScriptServices.js é acionado.

**Renderização:** O doGet serve o index.html, que por sua vez inclui o stylesheet.css e o application.js.

**Login:** O usuário insere suas credenciais. O application.js envia os dados para a função authenticate no back-end.

**Sessão:** Se as credenciais estiverem corretas, o back-end gera um token, o armazena no CacheService e o retorna ao cliente. O application.js armazena este token em uma variável.

**Ações do Usuário:** Para qualquer ação subsequente (ex: criar um banco, gerar questões), o application.js chama a função correspondente no back-end, enviando sempre o token de sessão como primeiro argumento.

**Validação:** O back-end valida o token usando isTokenValid antes de executar a lógica da função.

**Resposta:** O back-end processa a requisição (ex: lê uma planilha, chama a API do Gemini) e retorna um objeto de resultado para o cliente, que então atualiza a interface.