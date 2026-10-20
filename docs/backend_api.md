# **API do Back-end (Funções do Servidor)**

Esta seção documenta as principais funções do lado do servidor (.gs) que são expostas ao cliente (application.js) através da API `google.script.run`.

**Nota de Segurança:** Todas as funções, exceto `authenticate` e `checkApiKeyConfig`, exigem um token de sessão válido como primeiro argumento para autorização.

---

## **geminiServices.js (Módulo Central de IA)**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `callGeminiWithFallback` | `contentInput, subjectName, numQuestions` | `Array<Object>` | Orquestra a chamada à API Gemini com fallback automático entre modelos (3.8 Flash ➔ 3.5 Flash ➔ 2.5 Pro ➔ 2.5 Flash ➔ 1.5 Flash), suporte multimodal para PDF e saída em JSON estruturado nativo. |
| `checkApiKeyConfig` | (nenhum) | `{success: boolean, isConfigured: boolean, message: string}` | Verifica se a chave `GEMINI_API_KEY` está configurada nas Propriedades do Script sem expor seu valor ao cliente. |
| `getGeminiApiKey` | (nenhum) | `string \| null` | (Uso interno) Recupera a chave de API das Propriedades do Script. |
| `getModelHierarchy` | (nenhum) | `string[]` | (Uso interno) Retorna a lista ordenada de modelos da cadeia de fallback, permitindo override por `GEMINI_MODEL`. |

---

## **ScriptServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `processDocumentAndGenerateQuestions` | `token, configId, docId, subjectName, numQuestions` | `{success: boolean, message: string}` | Orquestra a leitura do material base (Google Docs ou PDF no Drive), invoca a IA e armazena as questões geradas no banco. |
| `getDriveFileContentForAI` | `fileId` | `{type: string, blob?: Blob, text?: string, name: string}` | (Uso interno) Detecta o formato do arquivo no Drive (Google Docs, PDF, Texto, Slides) e extrai o conteúdo adequado para a IA. |
| `getQuestionBankSummary` | `token, configId` | `{success: boolean, summary?: object, message?: string}` | Retorna um resumo quantitativo de questões cadastradas por disciplina. |
| `getQuestionsBySubject` | `token, configId, subjectName` | `{success: boolean, questions?: Array, message?: string}` | Retorna a lista detalhada de questões de uma disciplina específica. |
| `clearSheetData` | `token, configId` | `{success: boolean, message: string}` | Remove todas as questões do banco de dados ativo com bloqueio transacional (`LockService`). |

---

## **questionServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `getDashboardStats` | `token, configId` | `{success: boolean, stats?: object, details?: object, message?: string}` | Retorna os indicadores do dashboard (total de questões, número de disciplinas e contagens) consumidos por `application.js`. |
| `getDashboardDetails` | `token, configId, page?, pageSize?` | `{success: boolean, details?: object, message?: string}` | Coleta estatísticas detalhadas com suporte a paginação de questões recentes. |
| `updateQuestion` | `token, configId, questionData` | `{success: boolean, message: string}` | Atualiza atomicamente os dados de uma questão na planilha ativa utilizando `LockService`. |
| `deleteQuestion` | `token, configId, questionCode` | `{success: boolean, message: string}` | Exclui atomicamente uma linha de questão na planilha usando `LockService`. |

---

## **configServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `setRootFolder` | `token, folderId` | `{success: boolean, configs: Array, message?: string}` | Configura a pasta raiz no Drive, localiza/cria a planilha mestra e retorna a lista de bancos. |
| `createNewConfig` | `token, newConfigName` | `{success: boolean, configs: Array, message?: string}` | Cria uma nova planilha satélite de banco de questões e a cadastra na planilha mestra. |
| `listConfigs` | `token` | `{success: boolean, configs: Array, message?: string}` | Lê a planilha mestra e lista todos os bancos registrados. |
| `getConfigById` | `token, configId` | `object \| null` | (Uso interno) Recupera metadados (IDs) de um banco específico pelo seu identificador único. |

---

## **authenticateServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `authenticate` | `username, clientKey` | `{success: boolean, token?: string, message?: string}` | Valida as credenciais do usuário contra `USER_KEYS` e emite token de sessão efêmero. |
| `isTokenValid` | `token` | `boolean` | (Uso interno) Valida a vigência do token de sessão ativo. |

---

## **exportFiles.js**

| Função | Parâmetros | Retorno | Descrição |
| :--- | :--- | :--- | :--- |
| `exportToMoodleXML` | `token, configId, subjectNameToExport` | `{success: boolean, xmlData?: string, message?: string}` | Gera conteúdo XML compatível com importação no Banco de Questões do Moodle. |
| `exportToMoodleGift` | `token, configId, subjectNameToExport` | `{success: boolean, giftData?: string, message?: string}` | Converte as questões para o padrão Moodle GIFT (com escape de caracteres especiais e feedbacks). |
| `exportQuestionsToGoogleDoc` | `token, configId, targetDocId, subjectNameToExport` | `{success: boolean, message: string}` | Formata e grava as questões selecionadas diretamente em um Google Document especificado. |
