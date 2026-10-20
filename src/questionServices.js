/**
 * @fileoverview Contém toda a lógica de back-end para gerenciar as questões
 * de um banco de dados (editar, excluir, obter estatísticas e suporte ao dashboard).
 */

/**
 * @description Encontra uma linha específica na aba de questões com base no código único.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - A aba da planilha a ser pesquisada.
 * @param {string} questionCode - O código único da questão a ser encontrada.
 * @returns {number} O número da linha real (base 1) onde a questão foi encontrada, ou -1.
 */
function findQuestionRowByCode(sheet, questionCode) {
  if (!sheet || !questionCode) return -1;
  const codeColumn = 1; // A coluna 'code' é a primeira (índice 1)
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1; // Planilha vazia ou apenas cabeçalho

  const data = sheet.getRange(2, codeColumn, lastRow - 1, 1).getValues();
  const searchCode = String(questionCode).trim().toUpperCase();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === searchCode) {
      return i + 2; // Cabeçalho + índice 0
    }
  }
  return -1;
}

/**
 * @description Atualiza os dados de uma questão existente na planilha, com lock de concorrência.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {object} questionData - Objeto contendo os dados da questão, incluindo o 'code'.
 * @returns {object} Status da operação.
 */
function updateQuestion(token, configId, questionData) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  if (!configId || !questionData || !questionData.code) {
    return { success: false, message: "Dados insuficientes para atualizar a questão." };
  }

  const config = getConfigById(token, configId);
  if (!config) {
    return { success: false, message: "Configuração do banco de dados não encontrada." };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    
    const row = findQuestionRowByCode(sheet, questionData.code);
    if (row === -1) {
      return { success: false, message: `Questão com código '${questionData.code}' não encontrada para atualização.` };
    }
    
    // Garante que a ordem dos dados corresponde estritamente à ordem dos cabeçalhos em constants.js
    const rowData = CONSTANTS.HEADERS.DB_QUESTOES.map(header => questionData[header] || "");
    
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
    
    return { success: true, message: "Questão atualizada com sucesso!" };
  } catch (e) {
    return { success: false, message: `Erro ao atualizar a questão: ${e.message}` };
  } finally {
    lock.releaseLock();
  }
}

/**
 * @description Exclui uma questão da planilha, com lock de concorrência.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {string} questionCode - O código único da questão a ser excluída.
 * @returns {object} Status da operação.
 */
function deleteQuestion(token, configId, questionCode) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  if (!configId || !questionCode) {
    return { success: false, message: "Dados insuficientes para excluir a questão." };
  }

  const config = getConfigById(token, configId);
  if (!config) {
    return { success: false, message: "Configuração do banco de dados não encontrada." };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    
    const row = findQuestionRowByCode(sheet, questionCode);
    if (row === -1) {
      return { success: false, message: `Questão com código '${questionCode}' não encontrada para exclusão.` };
    }
    
    sheet.deleteRow(row);
    
    return { success: true, message: "Questão excluída com sucesso!" };
  } catch (e) {
    return { success: false, message: `Erro ao excluir a questão: ${e.message}` };
  } finally {
    lock.releaseLock();
  }
}

/**
 * @description Fornece as estatísticas do Dashboard consumidas pelo front-end (application.js).
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @returns {{success: boolean, stats?: object, details?: object, message?: string}}
 */
function getDashboardStats(token, configId) {
  const detailsResult = getDashboardDetails(token, configId, 1, 10);
  if (!detailsResult.success) {
    return detailsResult;
  }

  return {
    success: true,
    stats: {
      totalQuestions: detailsResult.details.totalQuestions,
      subjectCount: detailsResult.details.subjectCount,
      subjects: detailsResult.details.subjects,
      recentQuestions: detailsResult.details.recentQuestions
    },
    details: detailsResult.details
  };
}

/**
 * @description Coleta estatísticas detalhadas e uma lista paginada de questões recentes para o Dashboard.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {number} page - O número da página de questões recentes.
 * @param {number} pageSize - Quantidade de questões por página.
 * @returns {object} Detalhes do dashboard ou mensagem de erro.
 */
function getDashboardDetails(token, configId, page = 1, pageSize = 5) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  Logger.log(`Iniciando getDashboardDetails para configId: ${configId}, Página: ${page}`);

  const config = getConfigById(token, configId);
  if (!config) {
    return { success: false, message: "Configuração do banco de dados não encontrada." };
  }

  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { 
        success: true, 
        details: { 
          totalQuestions: 0, 
          subjectCount: 0, 
          subjects: {}, 
          recentQuestions: [], 
          currentPage: 1, 
          totalPages: 1 
        } 
      };
    }
    
    const allData = sheet.getDataRange().getValues();
    const headers = allData.shift(); // Remove cabeçalho
    const subjectIndex = headers.indexOf('subject');
    
    if (subjectIndex === -1) {
      return { success: false, message: "A coluna 'subject' não foi encontrada na planilha." };
    }
    
    const totalQuestions = allData.length;
    const subjects = {};
    
    allData.forEach(row => {
      const subject = row[subjectIndex];
      if (subject && String(subject).trim() !== "") {
        subjects[subject] = (subjects[subject] || 0) + 1;
      }
    });

    // Lógica de Paginação para Questões Recentes
    const totalPages = Math.max(1, Math.ceil(totalQuestions / pageSize));
    const startIndex = (page - 1) * pageSize;
    const recentQuestionsData = allData.slice().reverse().slice(startIndex, startIndex + pageSize);

    const recentQuestions = recentQuestionsData.map(row => {
      let questionObj = {};
      headers.forEach((header, index) => {
        questionObj[header] = row[index];
      });
      return questionObj;
    });
    
    return { 
      success: true, 
      details: {
        totalQuestions: totalQuestions,
        subjectCount: Object.keys(subjects).length,
        subjects: subjects,
        recentQuestions: recentQuestions,
        currentPage: page,
        totalPages: totalPages
      } 
    };
  } catch (e) {
    Logger.log(`ERRO CRÍTICO em getDashboardDetails: ${e.toString()}`);
    return { success: false, message: `Erro ao buscar detalhes do dashboard: ${e.message}` };
  }
}
