/**
 * @fileoverview Contém toda a lógica de back-end para gerenciar as questões
 * de um banco de dados (editar, excluir, obter estatísticas).
 */

/**
 * @description Encontra uma linha específica na aba de questões com base no código único.
 * Esta é uma função auxiliar interna.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - A aba da planilha a ser pesquisada.
 * @param {string} questionCode - O código único da questão a ser encontrada.
 * @returns {number} O número da linha (base 1) onde a questão foi encontrada, ou -1.
 */
function findQuestionRowByCode(sheet, questionCode) {
  if (!sheet || !questionCode) return -1;
  const codeColumn = 1; // A coluna 'code' é a primeira (índice 1)
  // Limita a busca para evitar timeouts em planilhas muito grandes.
  const lastRow = sheet.getLastRow() > 1 ? sheet.getLastRow() -1 : 1;
  if(lastRow === 1 && sheet.getRange(2, codeColumn).getValue() === '') return -1; // Planilha vazia
  const data = sheet.getRange(2, codeColumn, lastRow, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].toString() === questionCode) {
      return i + 2; // Retorna o número da linha real (soma 2 por causa do cabeçalho e do índice 0)
    }
  }
  return -1;
}

/**
 * @description Atualiza os dados de uma questão existente na planilha.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {object} questionData - Um objeto contendo os dados da questão, incluindo o 'code'.
 * @returns {object} Um objeto com o status da operação.
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

  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    
    const row = findQuestionRowByCode(sheet, questionData.code);
    if (row === -1) {
      return { success: false, message: "Questão não encontrada para atualização." };
    }
    
    // Garante que a ordem dos dados corresponde à ordem dos cabeçalhos em constants.js
    const rowData = CONSTANTS.HEADERS.DB_QUESTOES.map(header => questionData[header] || "");
    
    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
    
    return { success: true, message: "Questão atualizada com sucesso!" };
  } catch (e) {
    return { success: false, message: `Erro ao atualizar a questão: ${e.message}` };
  }
}

/**
 * @description Exclui uma questão da planilha.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {string} questionCode - O código único da questão a ser excluída.
 * @returns {object} Um objeto com o status da operação.
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

  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    
    const row = findQuestionRowByCode(sheet, questionCode);
    if (row === -1) {
      return { success: false, message: "Questão não encontrada para exclusão." };
    }
    
    sheet.deleteRow(row);
    
    return { success: true, message: "Questão excluída com sucesso!" };
  } catch (e) {
    return { success: false, message: `Erro ao excluir a questão: ${e.message}` };
  }
}

/**
 * @description Coleta estatísticas detalhadas e uma lista paginada de questões recentes para o Dashboard.
 * @param {string} token - O token de sessão para validação.
 * @param {string} configId - O ID da configuração do banco de dados.
 * @param {number} page - O número da página de questões recentes a ser retornada.
 * @param {number} pageSize - A quantidade de questões por página.
 * @returns {object} Um objeto com os detalhes do dashboard ou uma mensagem de erro.
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
      return { success: true, details: { totalQuestions: 0, subjectCount: 0, subjects: {}, recentQuestions: [], currentPage: 1, totalPages: 1 } };
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
      if (subject) {
        subjects[subject] = (subjects[subject] || 0) + 1;
      }
    });

    // Lógica de Paginação para Questões Recentes
    const totalPages = Math.ceil(totalQuestions / pageSize);
    const startIndex = (page - 1) * pageSize;
    // Pega as últimas questões invertendo a ordem dos dados
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

