# **API do Back-end (Funções do Servidor)**

Esta seção documenta as principais funções do lado do servidor (.gs) que são expostas ao cliente (application.js) através da API google.script.run.

**Nota de Segurança:** Todas as funções, exceto authenticate e checkApiKeyConfig, exigem um token de sessão como primeiro argumento para validação.

## **authenticateServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| authenticate | username, clientKey | {success: boolean, token?: string, message?: string} | Valida as credenciais do usuário e retorna um token de sessão se forem válidas. |
| isTokenValid | token | boolean | (Uso interno) Verifica se um token de sessão existe e não expirou no CacheService. |

## **configServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| setRootFolder | token, folderId | {success: boolean, configs: Array, message?: string} | Define a pasta raiz, carrega ou cria o arquivo de configuração e retorna a lista de bancos. |
| createNewConfig | token, newConfigName | {success: boolean, configs: Array, message?: string} | Cria uma nova planilha de banco de questões e retorna a lista atualizada de bancos. |
| listConfigs | token | {success: boolean, configs: Array, message?: string} | (Uso interno) Lê a planilha mestra e retorna a lista de todos os bancos configurados. |
| getConfigById | token, configId | \`object | null\` |

## **ScriptServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| processDocumentAndGenerateQuestions | token, configId, docId, subjectName, numQuestions | {success: boolean, message: string} | Orquestra todo o processo de ler um Doc, chamar a IA e salvar as questões. |
| getQuestionBankSummary | token, configId | {success: boolean, summary?: object, message?: string} | Retorna um objeto com a contagem de questões por disciplina. |
| getQuestionsBySubject | token, configId, subjectName | {success: boolean, questions?: Array, message?: string} | Retorna um array de objetos, onde cada objeto representa uma questão de uma disciplina específica. |
| clearSheetData | token, configId | {success: boolean, message: string} | Apaga todas as questões (exceto o cabeçalho) do banco de dados ativo. |

## **questionServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| updateQuestion | token, configId, questionData | {success: boolean, message: string} | Atualiza os dados de uma única questão na planilha. |
| deleteQuestion | token, configId, questionCode | {success: boolean, message: string} | Exclui a linha correspondente a uma questão específica da planilha. |
| getDashboardStats | token, configId | {success: boolean, stats?: object, message?: string} | Coleta estatísticas detalhadas (total de questões, contagem por disciplina) para o dashboard. |

## **exportFiles.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| exportToMoodleXML | token, configId, subjectNameToExport | {success: boolean, xmlData?: string, message?: string} | Gera e retorna uma string contendo as questões no formato Moodle XML. |
| exportToMoodleGift | token, configId, subjectNameToExport | {success: boolean, giftData?: string, message?: string} | Gera e retorna uma string contendo as questões no formato Moodle GIFT. |
| exportQuestionsToGoogleDoc | token, configId, targetDocId, subjectNameToExport | {success: boolean, message: string} | Escreve as questões formatadas diretamente em um Documento Google especificado. |

## **apiServices.js**

| Função | Parâmetros | Retorno | Descrição |
| :---- | :---- | :---- | :---- |
| checkApiKeyConfig | (nenhum) | {success: boolean, isConfigured: boolean, message: string} | Verifica se a chave da API do Gemini está configurada nas propriedades do script. |

