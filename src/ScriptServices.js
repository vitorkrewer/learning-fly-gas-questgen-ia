/**
 * @fileoverview Arquivo principal de serviços do lado do servidor (LearningFly / QuestGen IA).
 * Contém o ponto de entrada doGet, orquestração de leitura de arquivos (Docs e PDFs),
 * geração de questões com Gemini IA e operações na planilha.
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
 * Gera um código único alfanumérico para cada questão.
 */
function generateUniqueCode() {
  return Utilities.getUuid().substring(0, 8).toUpperCase();
}


// =========================================================================
// FUNÇÕES DE SERVIÇO (EXPOSTAS PARA O CLIENTE)
// =========================================================================

/**
 * Orquestra todo o processo de leitura do material (Google Docs ou PDF) e geração de questões com IA.
 *
 * @param {string} token Token de sessão.
 * @param {string} configId ID do banco de questões ativo.
 * @param {string} docId ID do arquivo no Google Drive (Google Docs ou PDF).
 * @param {string} subjectName Nome da disciplina ou tópico.
 * @param {number} numQuestions Quantidade de questões a gerar.
 * @returns {{success: boolean, message: string}}
 */
function processDocumentAndGenerateQuestions(token, configId, docId, subjectName, numQuestions) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");

  const config = getConfigById(token, configId);
  if (!config) {
    return { success: false, message: "Configuração do banco de dados não encontrada." };
  }

  const spreadsheetId = config.spreadsheet_id;

  try {
    logExecution(token, `Iniciando leitura do arquivo e geração para '${subjectName}'...`, spreadsheetId, docId);

    // Obtém o conteúdo do arquivo (suporta Google Docs, PDFs e arquivos de texto)
    const fileContent = getDriveFileContentForAI(docId);
    logExecution(token, `Arquivo '${fileContent.name}' carregado como formato ${fileContent.type.toUpperCase()}.`, spreadsheetId, docId);

    const contentInput = fileContent.type === 'pdf' 
      ? { pdfBlob: fileContent.blob } 
      : { text: fileContent.text };

    // Executa a chamada à IA com fallback automático entre modelos
    const parsedQuestions = callGeminiWithFallback(contentInput, subjectName, numQuestions);

    if (!parsedQuestions || parsedQuestions.length === 0) {
      throw new Error("Nenhuma questão pôde ser extraída da resposta da IA. Verifique o conteúdo do arquivo ou tente novamente.");
    }

    // Grava as questões na planilha com controle de concorrência
    const storeResult = storeQuestionsInSheet(token, parsedQuestions, subjectName, spreadsheetId);
    const message = `${storeResult.count} questões sobre "${subjectName}" foram geradas e salvas com sucesso no banco!`;
    logExecution(token, message, spreadsheetId, docId);
    return { success: true, message: message };

  } catch (error) {
    Logger.log(`[ERRO GERAL] ${error.toString()} \nStack: ${error.stack}`);
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
    const subjectIndex = headers.indexOf('subject');
    if (subjectIndex === -1) throw new Error("Coluna 'subject' não encontrada na planilha.");

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
    if (subjectIndex === -1) throw new Error("Coluna 'subject' não encontrada na planilha.");

    const questions = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][subjectIndex] === subjectName) {
        let questionObj = {};
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

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sheet = SpreadsheetApp.openById(config.spreadsheet_id).getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    logExecution(token, "Todos os dados do banco de questões foram limpos.", config.spreadsheet_id);
    return { success: true, message: "Dados do banco limpos com sucesso." };
  } catch (e) {
    return { success: false, message: `Erro ao limpar dados: ${e.message}` };
  } finally {
    lock.releaseLock();
  }
}


// =========================================================================
// FUNÇÕES AUXILIARES (USO INTERNO DO SERVIDOR)
// =========================================================================

/**
 * Extrai o conteúdo de um arquivo do Google Drive para uso com a IA.
 * Suporta Google Docs, PDFs, arquivos de texto puro e converte apresentações/planilhas para PDF.
 *
 * @param {string} fileId ID do arquivo no Google Drive.
 * @returns {{type: 'pdf'|'text', blob?: GoogleAppsScript.Base.Blob, text?: string, name: string}}
 */
function getDriveFileContentForAI(fileId) {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('ID do arquivo não foi fornecido.');
  }
  const cleanId = fileId.trim();

  try {
    const file = DriveApp.getFileById(cleanId);
    const mimeType = file.getMimeType();
    const fileName = file.getName();

    // 1. Arquivo PDF nativo
    if (mimeType === 'application/pdf') {
      return {
        type: 'pdf',
        blob: file.getBlob(),
        name: fileName
      };
    }

    // 2. Google Docs
    if (mimeType === MimeType.GOOGLE_DOCS || mimeType === 'application/vnd.google-apps.document') {
      const doc = DocumentApp.openById(cleanId);
      return {
        type: 'text',
        text: doc.getBody().getText(),
        name: fileName
      };
    }

    // 3. Arquivo de Texto / Markdown
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return {
        type: 'text',
        text: file.getBlob().getDataAsString('UTF-8'),
        name: fileName
      };
    }

    // 4. Apresentação Google Slides ou Google Sheets (converte automaticamente em PDF)
    if (
      mimeType === MimeType.GOOGLE_SLIDES ||
      mimeType === 'application/vnd.google-apps.presentation' ||
      mimeType === MimeType.GOOGLE_SHEETS ||
      mimeType === 'application/vnd.google-apps.spreadsheet'
    ) {
      return {
        type: 'pdf',
        blob: file.getAs('application/pdf'),
        name: fileName
      };
    }

    // 5. Fallback: tenta ler como Google Doc direto
    try {
      const doc = DocumentApp.openById(cleanId);
      return {
        type: 'text',
        text: doc.getBody().getText(),
        name: fileName
      };
    } catch (_) {
      // Se não for Doc, tenta converter o blob para PDF
      return {
        type: 'pdf',
        blob: file.getAs('application/pdf'),
        name: fileName
      };
    }

  } catch (error) {
    throw new Error(`Falha ao acessar o arquivo no Google Drive (ID: ${cleanId}). Verifique se o ID está correto e se o script possui permissão de leitura. Detalhes: ${error.message}`);
  }
}

/**
 * Função mantida para retrocompatibilidade de chamadas diretas.
 */
function getDocContent(docId) {
  const content = getDriveFileContentForAI(docId);
  return content.text || '';
}

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
 * Salva as questões geradas na planilha, com bloqueio concorrente via LockService.
 */
function storeQuestionsInSheet(token, questions, subjectName, spreadsheetId) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const questionHeaders = CONSTANTS.HEADERS.DB_QUESTOES;
    const sheet = getOrCreateSheet(spreadsheet, CONSTANTS.SHEETNAMES.DB_QUESTOES, questionHeaders);

    const rowsToAdd = questions.map(q => {
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
      return { success: false, count: 0, message: "Nenhuma questão válida para armazenamento." };
    }
  } catch (error) {
    logExecution(token, `Erro ao armazenar questões: ${error.toString()}`, spreadsheetId);
    throw new Error(`Falha ao salvar questões na planilha: ${error.message}`);
  } finally {
    lock.releaseLock();
  }
}
