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
| `geminiServices` | [`src/geminiServices.js`](../src/geminiServices.js) | Central de IA, fallback de modelos e suporte a PDF |
| `ScriptServices` | [`src/ScriptServices.js`](../src/ScriptServices.js) | Ponto de entrada `doGet` e orquestrador |
| `questionServices` | [`src/questionServices.js`](../src/questionServices.js) | CRUD de questões e estatísticas do Dashboard |
| `configServices` | [`src/configServices.js`](../src/configServices.js) | Gerenciador de pastas e planilhas de bancos |
| `exportFiles` | [`src/exportFiles.js`](../src/exportFiles.js) | Exportação para Moodle XML, GIFT e Docs |
| `authenticateServices` | [`src/authenticateServices.js`](../src/authenticateServices.js) | Login e validação de tokens |
| `constants` | [`src/constants.js`](../src/constants.js) | Constantes de planilhas e cabeçalhos |
| `setupUserKeys` | [`src/setupUserKeys.js`](../src/setupUserKeys.js) | Definição inicial de usuários e senhas |

> **Nota:** O arquivo `apiServices.js` foi unificado em `geminiServices.js`. Você pode mantê-lo ou omiti-lo se estiver configurando uma nova instância.

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

## Passo 3: Configurar Credenciais e Propriedades do Script

### 3.1. Definir Usuários e Senhas de Acesso
1. Abra o arquivo `setupUserKeys` no editor do Apps Script.
2. Edite os usuários e senhas desejados:
   ```javascript
   const users = [
     { user: "admin", key: "SuaSenhaSegura123", typeAcess: "userAdmin" },
     { user: "professor", key: "OutraSenhaForte456", typeAcess: "userClient" }
   ];
   ```
3. Na barra de ferramentas do editor, selecione a função `setupUserKeys` e clique em **Executar**.
4. Conceda as autorizações solicitadas pelo Google para que o script grave as propriedades.

### 3.2. Configurar a Chave da API Gemini
1. No menu lateral esquerdo do editor, clique em **Configurações do projeto** (ícone de engrenagem ⚙️).
2. Role até a seção **Propriedades do script** e clique em **Adicionar propriedade do script**:
   * **Propriedade:** `GEMINI_API_KEY`
   * **Valor:** Cole a sua chave de API obtida no Google AI Studio.
3. *(Opcional)* Se desejar forçar um modelo específico antes da cadeia de fallback:
   * **Propriedade:** `GEMINI_MODEL`
   * **Valor:** `gemini-2.5-flash` (ou o modelo desejado).
4. Clique em **Salvar propriedades do script**.

---

## Passo 4: Implantar como Aplicativo Web

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

## Passo 5: Configuração Inicial na Aplicação

1. Abra a URL do app no navegador.
2. Faça o login com o usuário e senha configurados no Passo 3.1.
3. No seu Google Drive, crie uma pasta (ex: `QuestGen IA - Dados`).
4. Copie o ID da pasta (a sequência alfanumérica presente na URL da pasta no navegador, após `/folders/`).
5. Na aplicação, cole o ID no campo **Pasta Raiz** e clique em **Salvar Pasta**.
6. Crie o seu primeiro banco de questões pelo botão **Novo Banco** (ex: `Matemática`, `Programação`, `Biologia`).

---

## Passo 6: Gerar Questões a Partir de Docs ou PDFs

1. Acesse o menu **Gerar Questões**.
2. No campo **ID do Material**, você pode informar:
   * O ID de um arquivo **Google Docs**.
   * O ID de um arquivo **PDF** armazenado no seu Google Drive.
3. Informe a disciplina, a quantidade de questões (1 a 10) e clique em **Iniciar Geração**.
4. O QuestGen IA utilizará a cadeia de fallback de IA, validará o schema JSON e salvará as questões diretamente na planilha do banco selecionado!
