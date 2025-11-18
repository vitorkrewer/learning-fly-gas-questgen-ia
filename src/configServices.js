/**
 * @fileoverview Contém toda a lógica de back-end para gerenciar as configurações
 * e os diferentes bancos de questões (planilhas).
 */

/**
 * Define a Pasta Raiz e carrega ou cria a configuração mestra de forma inteligente.
 * @param {string} token O token de sessão para validação.
 * @param {string} folderId O ID da pasta do Google Drive.
 * @returns {object} O resultado da operação, incluindo a lista de configurações.
 */
function setRootFolder(token, folderId) {
  Logger.log('--- Iniciando setRootFolder ---');
  try {
    if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada. Por favor, faça o login novamente.");
    Logger.log('Token validado com sucesso.');

    if (!folderId) {
      Logger.log('ERRO: folderId não foi fornecido.');
      return { success: false, message: "ID da Pasta Raiz não foi fornecido." };
    }
    Logger.log(`ID da Pasta recebido: ${folderId}`);

    const folder = DriveApp.getFolderById(folderId);
    Logger.log(`Pasta encontrada com sucesso: "${folder.getName()}"`);
    
    const files = folder.getFilesByName(CONSTANTS.MASTER_CONFIG_SHEET_NAME);
    let masterSheet;

    if (files.hasNext()) {
      Logger.log('Arquivo de configuração já existe. Abrindo...');
      masterSheet = SpreadsheetApp.open(files.next());
    } else {
      Logger.log('Arquivo de configuração não encontrado. Criando um novo...');
      masterSheet = SpreadsheetApp.create(CONSTANTS.MASTER_CONFIG_SHEET_NAME);
      const masterSheetFile = DriveApp.getFileById(masterSheet.getId());
      
      const defaultConfigSheet = masterSheet.getSheets()[0];
      defaultConfigSheet.setName(CONSTANTS.SHEETNAMES.DB_CONFIGS);
      defaultConfigSheet.appendRow(CONSTANTS.HEADERS.DB_CONFIGS);
      defaultConfigSheet.setFrozenRows(1);

      masterSheetFile.moveTo(folder);
      Logger.log('Novo arquivo de configuração criado e movido para a pasta raiz.');
    }
    
    PropertiesService.getScriptProperties().setProperty('ROOT_FOLDER_ID', folderId);
    PropertiesService.getScriptProperties().setProperty('MASTER_CONFIG_SHEET_ID', masterSheet.getId());
    Logger.log(`Propriedades do Script salvas. Master Sheet ID: ${masterSheet.getId()}`);
    
    Logger.log('Chamando listConfigs para retornar a lista atualizada...');
    return listConfigs(token);

  } catch (e) {
    Logger.log(`!!! ERRO CRÍTICO em setRootFolder: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, message: `Erro ao definir a pasta raiz: ${e.message}` };
  }
}

/**
 * Cria um novo banco de questões (uma nova planilha) e retorna a lista atualizada.
 * @param {string} token O token de sessão para validação.
 * @param {string} newConfigName O nome para o novo banco.
 * @returns {object} O resultado da operação, incluindo a lista atualizada de configurações.
 */
function createNewConfig(token, newConfigName) {
  if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
  const rootFolderId = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  const masterSheetId = PropertiesService.getScriptProperties().getProperty('MASTER_CONFIG_SHEET_ID');
  if (!rootFolderId || !masterSheetId) {
    return { success: false, message: "A Pasta Raiz precisa ser configurada primeiro." };
  }
  try {
    const rootFolder = DriveApp.getFolderById(rootFolderId);
    const newSpreadsheet = SpreadsheetApp.create(`QuestGen DB - ${newConfigName}`);
    const newSpreadsheetFile = DriveApp.getFileById(newSpreadsheet.getId());
    const questionsSheet = newSpreadsheet.insertSheet(CONSTANTS.SHEETNAMES.DB_QUESTOES);
    questionsSheet.appendRow(CONSTANTS.HEADERS.DB_QUESTOES);
    questionsSheet.setFrozenRows(1);
    const logsSheet = newSpreadsheet.insertSheet(CONSTANTS.SHEETNAMES.DATA_LOGS);
    logsSheet.appendRow(CONSTANTS.HEADERS.DATA_LOGS);
    logsSheet.setFrozenRows(1);
    newSpreadsheet.deleteSheet(newSpreadsheet.getSheetByName('Página1'));
    newSpreadsheetFile.moveTo(rootFolder);
    const masterSheet = SpreadsheetApp.openById(masterSheetId).getSheetByName(CONSTANTS.SHEETNAMES.DB_CONFIGS);
    const newConfigId = Utilities.getUuid();
    masterSheet.appendRow([newConfigId, newConfigName, newSpreadsheet.getId(), rootFolderId, new Date()]);
    return listConfigs(token);
  } catch (e) {
    return { success: false, message: `Erro ao criar novo banco: ${e.message}` };
  }
}

/**
 * Lista todas as configurações de banco de questões da planilha mestra.
 * @param {string} token O token de sessão para validação.
 * @returns {object} Um objeto com a lista de configurações.
 */
function listConfigs(token) {
  Logger.log('--- Iniciando listConfigs ---');
  try {
    if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
    Logger.log('Token validado.');

    const masterSheetId = PropertiesService.getScriptProperties().getProperty('MASTER_CONFIG_SHEET_ID');
    if (!masterSheetId) {
      Logger.log('ERRO: MASTER_CONFIG_SHEET_ID não encontrado nas propriedades.');
      return { success: false, message: "Planilha Mestra não definida. Configure a Pasta Raiz." };
    }
    Logger.log(`Master Sheet ID lido das propriedades: ${masterSheetId}`);
    
    const spreadsheet = SpreadsheetApp.openById(masterSheetId);
    const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_CONFIGS);

    if (!sheet) {
      Logger.log(`AVISO: A aba "${CONSTANTS.SHEETNAMES.DB_CONFIGS}" não foi encontrada. Retornando lista vazia.`);
      return { success: true, configs: [] };
    }
    Logger.log('Aba de configurações encontrada.');
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      Logger.log('Nenhuma configuração encontrada (apenas cabeçalho ou vazia). Retornando lista vazia.');
      return { success: true, configs: [] };
    }
    
    const headers = data[0];
    const createdAtColumnIndex = headers.indexOf('created_at'); // Encontra a coluna da data

    const configs = data.slice(1).map(row => {
      let config = {};
      headers.forEach((header, index) => {
        // CORREÇÃO DE SERIALIZAÇÃO APLICADA AQUI
        if (index === createdAtColumnIndex && row[index] instanceof Date) {
          // Se a coluna for a de data e o valor for um objeto Date, converte para string
          config[header] = row[index].toISOString();
        } else {
          config[header] = row[index];
        }
      });
      return config;
    });
    
    Logger.log(`Sucesso! ${configs.length} configurações encontradas e retornadas.`);
    return { success: true, configs: configs };
  } catch (e) {
    Logger.log(`!!! ERRO CRÍTICO em listConfigs: ${e.toString()} \nStack: ${e.stack}`);
    return { success: false, message: `Erro ao listar configurações: ${e.message}` };
  }
}

/**
 * Busca os detalhes de uma configuração específica pelo ID.
 * Usada internamente por outros serviços.
 * @param {string} token O token de sessão para validação.
 * @param {string} configId O ID da configuração a ser buscada.
 * @returns {object|null} O objeto da configuração ou nulo se não encontrado.
 */
function getConfigById(token, configId) {
    if (!isTokenValid(token)) return null;

    const result = listConfigs(token); // listConfigs já lida com a validação e logs
    if (result.success && result.configs) {
        const foundConfig = result.configs.find(c => c.config_id === configId);
        return foundConfig || null;
    }
    return null;
}

