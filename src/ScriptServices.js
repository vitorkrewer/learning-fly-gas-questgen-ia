/**
 * @fileoverview Arquivo principal de serviços do lado do servidor.
 * Contém a lógica de negócios para geração de questões, manipulação de planilhas e
 * funções auxiliares.
 */

// =========================================================================
// FUNÇÕES DE INTERFACE E UTILITÁRIOS GLOBAIS
// =========================================================================

/**
 * Função principal que serve a interface do usuário (HTML).
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('QuestGen IA - Gerador de Questões')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inclui o conteúdo de outros arquivos (CSS, JS) no template HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Gera um código único para cada questão.
 */
function generateUniqueCode() {
  return Utilities.getUuid().substring(0, 8).toUpperCase();
}


// =========================================================================
// FUNÇÕES DE SERVIÇO (EXPOSTAS PARA O CLIENTE)
// =========================================================================

/**
 * Orquestra todo o processo de geração de questões.
 */
function processDocumentAndGenerateQuestions(token, configId, docId, subjectName, numQuestions) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");

  const config = getConfigById(token, configId);
  if (!config) {
    return { success: false, message: "Configuração do banco de dados não encontrada." };
  }

  const spreadsheetId = config.spreadsheet_id;

  try {
    logExecution(token, `Iniciando geração para '${subjectName}'...`, spreadsheetId, docId);

    const documentText = getDocContent(docId);
    const geminiResponseText = callGeminiAPI(documentText, subjectName, numQuestions);
    const parsedQuestions = parseGeminiResponse(geminiResponseText);

    if (parsedQuestions.length === 0) {
      throw new Error("Nenhuma questão pôde ser extraída da resposta da IA. Verifique a resposta ou o prompt.");
    }

    const storeResult = storeQuestionsInSheet(token, parsedQuestions, subjectName, spreadsheetId);
    const message = `${storeResult.count} questões sobre "${subjectName}" foram geradas e salvas!`;
    logExecution(token, message, spreadsheetId, docId);
    return { success: true, message: message };

  } catch (error) {
    logExecution(token, `ERRO GERAL: ${error.toString()}`, spreadsheetId, docId);
    return { success: false, message: `Erro: ${error.message}` };
  }
}

/**
 * Obtém um resumo de quantas questões existem por disciplina.
 */
function getQuestionBankSummary(token, configId) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  const config = getConfigById(token, configId);
  if (!config) return { success: false, message: "Configuração não encontrada." };

  try {
    const ss = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = ss.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, summary: {} };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const subjectIndex = headers.indexOf('subject'); // Encontra a coluna 'subject' dinamicamente
    if(subjectIndex === -1) throw new Error("Coluna 'subject' não encontrada na planilha.");

    const summary = {};
    for (let i = 1; i < data.length; i++) {
      const subject = data[i][subjectIndex];
      if (subject && subject.toString().trim() !== "") {
        summary[subject] = (summary[subject] || 0) + 1;
      }
    }
    return { success: true, summary: summary };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Obtém todas as questões de uma disciplina específica.
 */
function getQuestionsBySubject(token, configId, subjectName) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  const config = getConfigById(token, configId);
  if (!config) return { success: false, message: "Configuração não encontrada." };

  try {
    const ss = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = ss.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, questions: [] };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const subjectIndex = headers.indexOf('subject');
    if(subjectIndex === -1) throw new Error("Coluna 'subject' não encontrada na planilha.");

    const questions = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][subjectIndex] === subjectName) {
            let questionObj = {};
            // Monta o objeto dinamicamente usando os cabeçalhos como chaves
            headers.forEach((header, index) => {
                questionObj[header] = data[i][index];
            });
            questions.push(questionObj);
        }
    }
    return { success: true, questions: questions };
  } catch (e) {
      return { success: false, message: e.message };
  }
}

/**
 * Limpa todas as questões de um banco, mantendo o cabeçalho.
 */
function clearSheetData(token, configId) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  const config = getConfigById(token, configId);
  if (!config) return { success: false, message: "Configuração não encontrada." };

  try {
    const sheet = SpreadsheetApp.openById(config.spreadsheet_id).getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    logExecution(token, "Todos os dados do banco de questões foram limpos.", config.spreadsheet_id);
    return { success: true, message: "Dados do banco limpos com sucesso." };
  } catch (e) {
    return { success: false, message: `Erro ao limpar dados: ${e.message}` };
  }
}


// =========================================================================
// FUNÇÕES AUXILIARES (USO INTERNO DO SERVIDOR)
// =========================================================================

/**
 * Obtém ou cria uma aba específica em uma planilha.
 */
function getOrCreateSheet(spreadsheet, sheetName, headers = null) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Registra uma mensagem de log na planilha de logs.
 */
function logExecution(token, message, spreadsheetId, docId = "N/A") {
  // A validação de token é opcional para logs, mas é uma boa prática
  if (!isTokenValid(token)) return;
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const logSheet = getOrCreateSheet(spreadsheet, CONSTANTS.SHEETNAMES.DATA_LOGS, CONSTANTS.HEADERS.DATA_LOGS);
    logSheet.appendRow([new Date(), docId, message]);
  } catch (error) {
    console.error(`Falha ao registrar log: ${error.toString()}`);
  }
}

/**
 * Extrai o texto de um Documento Google.
 */
function getDocContent(docId) {
  try {
    const doc = DocumentApp.openById(docId);
    return doc.getBody().getText();
  } catch (error) {
    throw new Error(`Falha ao acessar o Documento Google (ID: ${docId}). Verifique o ID e as permissões.`);
  }
}

/**
 * Salva as questões formatadas na planilha.
 * ESTA FUNÇÃO FOI CORRIGIDA PARA USAR OS CABEÇALHOS DE CONSTANTS.JS
 */
function storeQuestionsInSheet(token, questions, subjectName, spreadsheetId) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const questionHeaders = CONSTANTS.HEADERS.DB_QUESTOES;
    const sheet = getOrCreateSheet(spreadsheet, CONSTANTS.SHEETNAMES.DB_QUESTOES, questionHeaders);

    const rowsToAdd = questions.map(q => {
      // A ordem aqui DEVE corresponder exatamente à ordem em CONSTANTS.HEADERS.DB_QUESTOES
      return [
        generateUniqueCode(), // code
        subjectName,         // subject
        q.enunciado,         // statement
        q.alternativaA,      // option_a
        q.alternativaB,      // option_b
        q.alternativaC,      // option_c
        q.alternativaD,      // option_d
        q.alternativaE,      // option_e
        q.gabarito,          // answer_key
        q.comentario         // comment
      ];
    });

    if (rowsToAdd.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, questionHeaders.length).setValues(rowsToAdd);
      return { success: true, count: rowsToAdd.length };
    } else {
      return { success: false, count: 0, message: "Nenhuma questão válida foi parseada para armazenamento." };
    }
  } catch (error) {
    logExecution(token, `Erro ao armazenar questões: ${error.toString()}`, spreadsheetId);
    throw new Error(`Falha ao salvar questões na planilha: ${error.message}`);
  }
}

