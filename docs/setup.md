# Guia de Instalação e Configuração

Siga este passo a passo detalhado para implantar e configurar o **QuestGen IA** em sua própria conta Google sem depender de ferramentas de linha de comando (CLASP).

---

## Pré-requisitos

1. **Conta Google:** Conta pessoal (@gmail.com) ou institucional do Google Workspace.
2. **Chave de API do Google Gemini:** Obtenha gratuitamente ou via faturamento no [Google AI Studio](https://aistudio.google.com/).

---

## Passo 1: Criar o Projeto no Google Apps Script

1. Acesse [script.google.com](https://script.google.com/) e clique em **Novo projeto**.
2. Renomeie o projeto no topo para **QuestGen IA**.

---

## Passo 2: Criar e Colar os Arquivos do Projeto

No editor do Apps Script, você criará dois tipos de arquivos: **Scripts (.gs)** e **HTML (.html)**.

### 2.1. Arquivos de Script (Back-end)
Para cada arquivo abaixo, clique no menu lateral **+ > Script** e cole o código correspondente da pasta `src/`:

| Nome do Arquivo no Editor | Arquivo Fonte no Repositório | Descrição |
| :--- | :--- | :--- |
| `setupInstaller` | [`src/setupInstaller.js`](../src/setupInstaller.js) | **[Novo]** Instalador automático de pastas e planilhas com 1 clique |
| `geminiServices` | [`src/geminiServices.js`](../src/geminiServices.js) | Central de IA, fallback de modelos e suporte a PDF |
| `ScriptServices` | [`src/ScriptServices.js`](../src/ScriptServices.js) | Ponto de entrada `doGet` e orquestrador |
| `questionServices` | [`src/questionServices.js`](../src/questionServices.js) | CRUD de questões e estatísticas do Dashboard |
| `configServices` | [`src/configServices.js`](../src/configServices.js) | Gerenciador de pastas e planilhas de bancos |
| `exportFiles` | [`src/exportFiles.js`](../src/exportFiles.js) | Exportação para Moodle XML, GIFT e Docs |
| `authenticateServices` | [`src/authenticateServices.js`](../src/authenticateServices.js) | Login e validação de tokens |
| `constants` | [`src/constants.js`](../src/constants.js) | Constantes de planilhas e cabeçalhos |
| `setupUserKeys` | [`src/setupUserKeys.js`](../src/setupUserKeys.js) | Definição manual de usuários e senhas |

### 2.2. Arquivos de Interface (Front-end)
Clique no menu lateral **+ > HTML** e crie os 3 arquivos abaixo:

1. **`index`** ➔ Cole o conteúdo de [`html/index.html`](../html/index.html).
2. **`stylesheet`** ➔ Crie um arquivo HTML chamado `stylesheet` contendo a tag `<style>` envolvendo o CSS:
   ```html
   <style>
     /* Cole aqui o conteúdo de assets/css/stylesheet.css */
   </style>
   ```
3. **`application`** ➔ Crie um arquivo HTML chamado `application` contendo a tag `<script>` envolvendo o JS:
   ```html
   <script>
     // Cole aqui o conteúdo de assets/js/application.js
   </script>
   ```

---

## Passo 3: Instalação Automática com 1 Clique (`setupInstaller`)

O script `setupInstaller` foi criado para realizar toda a configuração de infraestrutura automaticamente:

1. No seu Google Drive, crie uma pasta onde deseja guardar tudo (ex: `QuestGen IA - Sistema`).
2. Abra a pasta e copie o ID dela na barra de endereços (o código alfanumérico após `/folders/`).
3. No editor do Apps Script, abra o arquivo `setupInstaller` e cole o ID copiado na constante:
   ```javascript
   const INSTALLER_CONFIG = {
     ROOT_FOLDER_ID: "COLE_O_ID_DA_SUA_PASTA_AQUI",
     CREATE_STANDARD_SUBFOLDERS: true,
     CREATE_INITIAL_QUESTION_BANK: true,
     INITIAL_BANK_NAME: "Geral",
     GEMINI_API_KEY: "SUA_CHAVE_GEMINI_AQUI" // Opcional se for configurar nas propriedades
   };
   ```
4. Na barra de ferramentas do editor (topo), selecione a função **`runInstaller`** e clique em **Executar**.
5. Conceda as autorizações solicitadas pelo Google.
6. O instalador irá:
   * Validar a pasta raiz informada.
   * Criar a **Planilha Mestra** de configurações (`QuestGen AI - Configurações`) com cabeçalhos formatados.
   * Criar a estrutura de subpastas padrão:
     * `01_Materiais_Estudo_PDFs_e_Docs`
     * `02_Exportacoes_Moodle`
     * `03_Documentos_Gerados`
   * Criar o primeiro **Banco de Questões** (`QuestGen DB - Geral`) pronto para uso.
   * Salvar todas as propriedades do sistema (`ROOT_FOLDER_ID`, `MASTER_CONFIG_SHEET_ID`, `GEMINI_API_KEY`).
   * Configurar credenciais provisórias de acesso (`admin` / `admin`).

> **Dica de Diagnóstico:** Você pode executar a função `verifyInstallation` a qualquer momento para conferir a saúde e a integridade de todas as configurações do sistema.

---

## Passo 4: Definir Credenciais Definitivas

1. Abra o arquivo `setupUserKeys` no editor do Apps Script.
2. Edite os usuários e senhas desejados:
   ```javascript
   const users = [
     { user: "admin", key: "SuaSenhaSegura123", typeAcess: "userAdmin" },
     { user: "professor", key: "OutraSenhaForte456", typeAcess: "userClient" }
   ];
   ```
3. Selecione a função `setupUserKeys` na barra de ferramentas e clique em **Executar**.

---

## Passo 5: Implantar como Aplicativo Web

1. No canto superior direito do editor, clique em **Implantar > Nova implantação**.
2. No ícone de engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha os campos:
   * **Descrição:** `QuestGen IA - Produção`
   * **Executar como:** `Eu (seu_email@dominio.com)`
   * **Quem pode acessar:** `Qualquer pessoa` *(o acesso é protegido pela tela de login do QuestGen)*.
4. Clique em **Implantar**.
5. Conceda as permissões solicitadas.
6. Copie a **URL do app da Web**.

---

## Passo 6: Gerar Questões

1. Abra a URL do app no seu navegador e faça login.
2. O banco de dados **Geral** já estará ativo e configurado!
3. Acesse o menu **Gerar Questões**.
4. No campo **ID do Material**, informe:
   * O ID de um arquivo **Google Docs**, ou
   * O ID de um arquivo **PDF** armazenado no seu Google Drive.
5. Informe o nome da disciplina, quantidade de questões desejada e clique em **Iniciar Geração**.
