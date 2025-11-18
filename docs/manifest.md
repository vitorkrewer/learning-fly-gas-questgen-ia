# **Manifesto de Arquivos do Projeto**

Este documento serve como um índice e uma breve descrição de todos os arquivos que compõem a aplicação **QuestGen IA**.

## **data/**

* **appsscript.json**: O manifesto oficial do projeto Google Apps Script. Define metadados essenciais, escopos de autorização da API do Google, dependências de serviços avançados e configurações do aplicativo web.

## **src/ (Código do Lado do Servidor \- Back-end)**

Contém toda a lógica de negócios que é executada nos servidores do Google.

* **ScriptServices.js**: O ponto de entrada principal da aplicação. Contém a função doGet que serve a interface do usuário e orquestra a lógica principal de geração de questões, chamando outros serviços.  
* **authenticateServices.js**: Gerencia a autenticação de usuários e a validação de tokens de sessão.  
* **configServices.js**: Lida com a criação, leitura e gerenciamento da planilha de configurações e dos bancos de dados individuais.  
* **questionServices.js**: Contém as funções para operações CRUD (Criar, Ler, Atualizar, Excluir) em questões individuais e para buscar estatísticas do dashboard.  
* **exportFiles.js**: Contém a lógica para converter e exportar os bancos de questões para formatos externos (Moodle GIFT, Moodle XML, Google Docs).  
* **apiServices.js**: Responsável por toda a comunicação com a API externa do Google Gemini, incluindo a construção do prompt e o tratamento da resposta.  
* **constants.js**: Um arquivo central para definir constantes globais, como nomes de abas e cabeçalhos de planilhas, garantindo consistência em todo o projeto.  
* **setupUserKeys.js**: Um script de configuração manual para definir as credenciais de acesso dos usuários nas propriedades do script.

## **html/ (Interface do Usuário \- Estrutura)**

* **index.html**: O único arquivo HTML do projeto. Ele define a estrutura de toda a interface do usuário, incluindo a tela de login, o layout principal, a sidebar e todos os modais. Atua como um aplicativo de página única (SPA).

## **assets/ (Recursos do Front-end)**

#### **css/**

* **stylesheet.css**: A folha de estilos personalizada da aplicação. Contém todas as regras de CSS para estilizar a interface, incluindo o design da tela de login, o layout, a sidebar recolhível e os temas claro/escuro.

#### **js/**

* **application.js**: O coração da lógica do lado do cliente. Este arquivo gerencia todas as interações do usuário, manipulação do DOM, chamadas assíncronas para o back-end (google.script.run), e a lógica de troca de temas.