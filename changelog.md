# Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Em Desenvolvimento] - 2026-10-20

### Adicionado
- **Módulo Centralizado de IA (`src/geminiServices.js`):**
  - Isolamento de toda a lógica da API Google Gemini, credenciais e requisições HTTP em módulo próprio.
  - **Cadeia de Fallback Automática de Modelos:** `gemini-3.8-flash` ➔ `gemini-3.5-flash` ➔ `gemini-2.5-pro` ➔ `gemini-2.5-flash` ➔ `gemini-1.5-flash` com tratamento resiliente de erros HTTP (404, 400, 429, 500, 503).
  - **Structured Outputs (JSON Schema Nativo):** Aplicação de `responseMimeType: "application/json"` e `responseSchema` obrigatório, eliminando falhas de parsing via expressões regulares de texto.
  - Suporte à sobreposição do modelo primário via propriedade de script `GEMINI_MODEL`.
- **Suporte Multimodal para Leitura de PDFs:**
  - Função `getDriveFileContentForAI` com detecção automática de tipo MIME no Google Drive.
  - Envio de arquivos PDF nativos como `inlineData` em Base64 para a API do Gemini.
  - Suporte a arquivos de texto puro (.txt/.md) e conversão automática de apresentações do Google Slides para PDF.
- **Controle de Concorrência Transacional:**
  - Aplicação de `LockService.getScriptLock()` em `storeQuestionsInSheet`, `updateQuestion`, `deleteQuestion` e `clearSheetData`.

### Corrigido
- **Incompatibilidade no Dashboard:** Implementação da função `getDashboardStats(token, configId)` em `src/questionServices.js`, corrigindo a quebra de carregamento das métricas no painel frontal do `application.js`.
- **Validação de Código de Questão:** Normalização case-insensitive e limpeza de espaços em `findQuestionRowByCode`.

### Modificado
- **Ponte de Compatibilidade (`src/apiServices.js`):** Refatorado para atuar como ponte retrocompatível sem quebrar chamadas legadas.
- **Interface Front-end (`html/index.html`):** Rótulo e instruções do campo de material atualizados para orientar o suporte tanto a Google Docs quanto a PDFs no Google Drive.
- **Documentação do Projeto (`docs/`):**
  - `architecture.md`: Inclusão do módulo `geminiServices.js`, fluxo multimodal e cadeia de fallback.
  - `backend_api.md`: Documentação das novas funções de IA e estatísticas.
  - `setup.md`: Guia passo a passo revisado para implantação manual no Google Apps Script sem necessidade de CLASP.
  - `features.md` e `manifest.md`: Atualizados para refletir a nova arquitetura.
  - `README.md`: Revisão geral de texto, correção de codificação UTF-8 e inclusão das novas capacidades.

### Segurança
- **Redução de Escopos OAuth (`data/appsscript.json`):** Removidos escopos não utilizados e invasivos de e-mail (`mail.google.com`, `gmail.modify`, `gmail.readonly`, `gmail.settings.basic`, `script.send_mail`) e formulários (`auth/forms`).

---

## [1.0.0] - 2025-11-17

### Adicionado
- **Lançamento Inicial do QuestGen IA (Commit `452de8e`):**
  - Aplicativo web completo com geração de questões de múltipla escolha baseada em IA.
  - Integração com o Google Sheets como banco de dados relacional para armazenamento de questões e logs.
  - Autenticação com credenciais de usuário em `USER_KEYS` e sessões baseadas em tokens via `CacheService`.
  - Exportação de questões para múltiplos formatos educacionais: Moodle GIFT, Moodle XML e Google Docs.
  - Interface web responsiva (SPA) com Bootstrap 5, alternância de temas Claro/Escuro (*Dark/Light mode*), modais interativos e painel de controle.
  - Arquitetura multi-banco com Pasta Raiz e Planilha Mestra de configurações.
  - Documentação completa inicial: guias de configuração, arquitetura do sistema, estrutura do banco de dados e especificação da API do back-end.
