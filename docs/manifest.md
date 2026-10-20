# **Manifesto de Arquivos do Projeto**

Este documento serve como um índice e uma breve descrição de todos os arquivos que compõem a aplicação **QuestGen IA**.

---

## **data/**

* **appsscript.json**: O manifesto oficial do projeto Google Apps Script. Define metadados, fuso horário, serviços avançados habilitados e escopos mínimos restritos de autorização OAuth.

---

## **src/ (Código do Lado do Servidor - Back-end)**

Contém toda a lógica de negócios que é executada no Runtime V8 dos servidores do Google.

* **setupInstaller.js**: Script instalador e configurador automático. Cria a Pasta Raiz, Planilha Mestra, subpastas padronizadas, banco inicial e propriedades do sistema com 1 clique no editor do Apps Script.
* **geminiServices.js**: Módulo central de IA do projeto. Gerencia a autenticação com a API do Gemini, o suporte multimodal (leitura de PDFs e textos), a cadeia hierárquica de fallback de modelos (`gemini-3.8-flash` ➔ `gemini-3.5-flash` ➔ `gemini-2.5-pro` ➔ `gemini-2.5-flash` ➔ `gemini-1.5-flash`) e a estruturação de saídas em JSON nativo (*schema enforcement*).
* **ScriptServices.js**: O ponto de entrada principal (`doGet`) que serve a interface SPA. Orquestra a leitura de arquivos no Google Drive (Google Docs, PDFs, textos), coordena as chamadas à IA e gerencia as gravações nas planilhas.
* **questionServices.js**: Responsável pelas operações CRUD das questões individuais, agregações estatísticas do Dashboard (`getDashboardStats`) e controle de concorrência com `LockService`.
* **configServices.js**: Gerencia a Pasta Raiz no Drive, a planilha mestra de configurações e o ciclo de vida dos bancos de dados satélites.
* **exportFiles.js**: Converte e exporta os bancos de questões para formatos externos (Moodle XML, Moodle GIFT e Google Docs).
* **authenticateServices.js**: Autentica os usuários e emite/valida tokens de sessão.
* **apiServices.js**: Ponte mantida para compatibilidade retroativa, delegando chamadas para `geminiServices.js`.
* **constants.js**: Centralizador de constantes globais (nomes de abas, cabeçalhos padronizados).
* **setupUserKeys.js**: Script executado pelo desenvolvedor/administrador para gravar os usuários e senhas nas Propriedades do Script.

---

## **html/ (Interface do Usuário - Estrutura)**

* **index.html**: Estrutura principal da SPA (Single Page Application), contendo a tela de login, o layout principal, a sidebar responsiva, os formulários de geração e todos os modais interativos.

---

## **assets/ (Recursos do Front-end)**

#### **css/**
* **stylesheet.css**: Folha de estilos da aplicação, contendo o design visual, layouts flexíveis, modais, alertas e variáveis para os temas claro (*light*) e escuro (*dark*).

#### **js/**
* **application.js**: Controlador client-side da aplicação. Gerencia eventos do DOM, chamadas assíncronas via `google.script.run`, transição entre visualizações, download de arquivos e alternância de temas.
