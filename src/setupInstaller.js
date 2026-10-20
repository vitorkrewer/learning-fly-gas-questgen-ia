/**
 * @fileoverview Instalador e Configurador Automático de Ambiente do QuestGen IA.
 * 
 * Este script deve ser executado no editor do Google Apps Script para criar e
 * padronizar automaticamente toda a estrutura de pastas, planilhas mestras,
 * bancos de dados iniciais e propriedades de sistema.
 * 
 * INSTRUÇÕES DE USO:
 * 1. No seu Google Drive, crie uma pasta (ex: "QuestGen IA - Sistema").
 * 2. Abra a pasta criada e copie o ID dela na barra de endereços
 *    (o código alfanumérico após "/folders/").
 * 3. Cole o ID abaixo na constante INSTALLER_CONFIG.ROOT_FOLDER_ID.
 * 4. (Opcional) Ajuste as opções adicionais conforme sua preferência.
 * 5. Na barra de ferramentas do Google Apps Script (topo da tela), selecione
 *    a função "runInstaller" e clique em "Executar".
 * 6. Conceda as autorizações solicitadas pelo Google na primeira execução.
 * 7. Verifique o resultado no painel inferior de "Registro de Execução".
 */

// =========================================================================
// CONFIGURAÇÃO DO INSTALADOR (PREENCHA ANTES DE EXECUTAR)
// =========================================================================

const INSTALLER_CONFIG = {
  /**
   * [OBRIGATÓRIO] Cole o ID da pasta do Google Drive onde tudo será armazenado.
   * Exemplo: "1A2B3C4D5E6F7G8H9I0JkLmNoPqRsTuVw"
   */
  ROOT_FOLDER_ID: "COLE_O_ID_DA_SUA_PASTA_AQUI",

  /**
   * [OPCIONAL] Criar estrutura de subpastas organizadas dentro da Pasta Raiz.
   */
  CREATE_STANDARD_SUBFOLDERS: true,
  SUBFOLDERS_TO_CREATE: [
    "01_Materiais_Estudo_PDFs_e_Docs", // Para você salvar os PDFs e Docs base de estudo
    "02_Exportacoes_Moodle",           // Para salvar os arquivos GIFT e XML exportados
    "03_Documentos_Gerados"            // Para salvar os Google Docs com avaliações prontas
  ],

  /**
   * [OPCIONAL] Criar um banco de questões inicial para começar usando de imediato.
   */
  CREATE_INITIAL_QUESTION_BANK: true,
  INITIAL_BANK_NAME: "Geral",

  /**
   * [OPCIONAL] Chave da API do Google Gemini.
   * Se informada, grava automaticamente em GEMINI_API_KEY nas Propriedades do Script.
   * Se já tiver configurado nas propriedades, deixe em branco "".
   */
  GEMINI_API_KEY: ""
};


// =========================================================================
// FUNÇÃO PRINCIPAL: EXECUTAR INSTALAÇÃO
// =========================================================================

/**
 * Função executável pelo editor do Google Apps Script para criar e configurar o ambiente.
 */
function runInstaller() {
  Logger.log("==================================================================");
  Logger.log("   🚀 INICIANDO INSTALAÇÃO AUTOMÁTICA DO QUESTGEN IA (LEARNINGFLY) ");
  Logger.log("==================================================================");

  try {
    // 1. Validação do ID da Pasta Raiz
    const rootFolderId = (INSTALLER_CONFIG.ROOT_FOLDER_ID || "").trim();
    if (!rootFolderId || rootFolderId === "COLE_O_ID_DA_SUA_PASTA_AQUI") {
      throw new Error(
        "Por favor, configure o 'ROOT_FOLDER_ID' no início do arquivo setupInstaller.js " +
        "com o ID de uma pasta válida do seu Google Drive antes de executar."
      );
    }

    Logger.log(`\n[Passo 1/5] Localizando Pasta Raiz no Google Drive...`);
    const rootFolder = DriveApp.getFolderById(rootFolderId);
    Logger.log(`✔ Pasta Raiz confirmada: "${rootFolder.getName()}"`);
    Logger.log(`  Link: ${rootFolder.getUrl()}`);

    // Salva o ROOT_FOLDER_ID nas propriedades do script
    PropertiesService.getScriptProperties().setProperty("ROOT_FOLDER_ID", rootFolderId);

    // 2. Configurar/Criar a Planilha Mestra de Configurações
    Logger.log(`\n[Passo 2/5] Verificando Planilha Mestra de Configuração...`);
    const masterSheetName = (typeof CONSTANTS !== "undefined" && CONSTANTS.MASTER_CONFIG_SHEET_NAME) 
      ? CONSTANTS.MASTER_CONFIG_SHEET_NAME 
      : "QuestGen AI - Configurações";

    const dbConfigsSheetName = (typeof CONSTANTS !== "undefined" && CONSTANTS.SHEETNAMES && CONSTANTS.SHEETNAMES.DB_CONFIGS)
      ? CONSTANTS.SHEETNAMES.DB_CONFIGS
      : "db_configs";

    const dbConfigsHeaders = (typeof CONSTANTS !== "undefined" && CONSTANTS.HEADERS && CONSTANTS.HEADERS.DB_CONFIGS)
      ? CONSTANTS.HEADERS.DB_CONFIGS
      : ["config_id", "config_name", "spreadsheet_id", "folder_id", "created_at"];

    const existingMasterFiles = rootFolder.getFilesByName(masterSheetName);
    let masterSpreadsheet;

    if (existingMasterFiles.hasNext()) {
      masterSpreadsheet = SpreadsheetApp.open(existingMasterFiles.next());
      Logger.log(`✔ Planilha Mestra existente localizada: "${masterSpreadsheet.getName()}"`);
    } else {
      masterSpreadsheet = SpreadsheetApp.create(masterSheetName);
      const masterFile = DriveApp.getFileById(masterSpreadsheet.getId());

      const configSheet = masterSpreadsheet.getSheets()[0];
      configSheet.setName(dbConfigsSheetName);
      configSheet.appendRow(dbConfigsHeaders);
      configSheet.setFrozenRows(1);

      // Estilização do cabeçalho da planilha mestra
      const headerRange = configSheet.getRange(1, 1, 1, dbConfigsHeaders.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#1a73e8");
      headerRange.setFontColor("#ffffff");
      configSheet.autoResizeColumns(1, dbConfigsHeaders.length);

      // Move a planilha criada para a pasta raiz
      masterFile.moveTo(rootFolder);
      Logger.log(`✔ Nova Planilha Mestra criada e organizada na Pasta Raiz.`);
    }

    const masterSheetId = masterSpreadsheet.getId();
    PropertiesService.getScriptProperties().setProperty("MASTER_CONFIG_SHEET_ID", masterSheetId);
    Logger.log(`  ID da Planilha Mestra: ${masterSheetId}`);
    Logger.log(`  Link: ${masterSpreadsheet.getUrl()}`);

    // 3. Criação de Subpastas Padronizadas (Opcional)
    if (INSTALLER_CONFIG.CREATE_STANDARD_SUBFOLDERS && Array.isArray(INSTALLER_CONFIG.SUBFOLDERS_TO_CREATE)) {
      Logger.log(`\n[Passo 3/5] Organizando estrutura de subpastas padrão no Drive...`);
      INSTALLER_CONFIG.SUBFOLDERS_TO_CREATE.forEach(folderName => {
        const subfolders = rootFolder.getFoldersByName(folderName);
        if (subfolders.hasNext()) {
          Logger.log(`  • Subpasta já existente: "${folderName}"`);
        } else {
          const newFolder = rootFolder.createFolder(folderName);
          Logger.log(`  ✔ Subpasta criada: "${folderName}" (${newFolder.getUrl()})`);
        }
      });
    } else {
      Logger.log(`\n[Passo 3/5] Criação de subpastas ignorada conforme configuração.`);
    }

    // 4. Criação do Banco de Questões Inicial Padrão (Opcional)
    if (INSTALLER_CONFIG.CREATE_INITIAL_QUESTION_BANK && INSTALLER_CONFIG.INITIAL_BANK_NAME) {
      Logger.log(`\n[Passo 4/5] Configurando Banco de Questões Inicial ("${INSTALLER_CONFIG.INITIAL_BANK_NAME}")...`);
      
      const masterSheet = masterSpreadsheet.getSheetByName(dbConfigsSheetName);
      const existingConfigs = masterSheet.getDataRange().getValues();
      let bankAlreadyRegistered = false;

      // Verifica se já existe um banco cadastrado com esse nome
      for (let i = 1; i < existingConfigs.length; i++) {
        if (String(existingConfigs[i][1]).trim().toLowerCase() === INSTALLER_CONFIG.INITIAL_BANK_NAME.trim().toLowerCase()) {
          bankAlreadyRegistered = true;
          break;
        }
      }

      if (bankAlreadyRegistered) {
        Logger.log(`  • O banco de questões "${INSTALLER_CONFIG.INITIAL_BANK_NAME}" já se encontra cadastrado.`);
      } else {
        const dbQuestionsSheetName = (typeof CONSTANTS !== "undefined" && CONSTANTS.SHEETNAMES && CONSTANTS.SHEETNAMES.DB_QUESTOES)
          ? CONSTANTS.SHEETNAMES.DB_QUESTOES
          : "db_questoes";

        const dbQuestionsHeaders = (typeof CONSTANTS !== "undefined" && CONSTANTS.HEADERS && CONSTANTS.HEADERS.DB_QUESTOES)
          ? CONSTANTS.HEADERS.DB_QUESTOES
          : ["code", "subject", "statement", "option_a", "option_b", "option_c", "option_d", "option_e", "answer_key", "comment"];

        const dataLogsSheetName = (typeof CONSTANTS !== "undefined" && CONSTANTS.SHEETNAMES && CONSTANTS.SHEETNAMES.DATA_LOGS)
          ? CONSTANTS.SHEETNAMES.DATA_LOGS
          : "data_logs";

        const dataLogsHeaders = (typeof CONSTANTS !== "undefined" && CONSTANTS.HEADERS && CONSTANTS.HEADERS.DATA_LOGS)
          ? CONSTANTS.HEADERS.DATA_LOGS
          : ["timestamp", "document_id", "message"];

        const newDbSpreadsheet = SpreadsheetApp.create(`QuestGen DB - ${INSTALLER_CONFIG.INITIAL_BANK_NAME}`);
        const newDbFile = DriveApp.getFileById(newDbSpreadsheet.getId());

        // Aba db_questoes
        const questionsSheet = newDbSpreadsheet.insertSheet(dbQuestionsSheetName);
        questionsSheet.appendRow(dbQuestionsHeaders);
        questionsSheet.setFrozenRows(1);
        const qHeaderRange = questionsSheet.getRange(1, 1, 1, dbQuestionsHeaders.length);
        qHeaderRange.setFontWeight("bold");
        qHeaderRange.setBackground("#202124");
        qHeaderRange.setFontColor("#ffffff");
        questionsSheet.autoResizeColumns(1, dbQuestionsHeaders.length);

        // Aba data_logs
        const logsSheet = newDbSpreadsheet.insertSheet(dataLogsSheetName);
        logsSheet.appendRow(dataLogsHeaders);
        logsSheet.setFrozenRows(1);
        const lHeaderRange = logsSheet.getRange(1, 1, 1, dataLogsHeaders.length);
        lHeaderRange.setFontWeight("bold");
        lHeaderRange.setBackground("#5f6368");
        lHeaderRange.setFontColor("#ffffff");
        logsSheet.autoResizeColumns(1, dataLogsHeaders.length);

        // Remove a aba padrão vazia criada pelo Google Sheets
        const defaultSheet = newDbSpreadsheet.getSheetByName("Página1") || newDbSpreadsheet.getSheetByName("Sheet1");
        if (defaultSheet && newDbSpreadsheet.getSheets().length > 1) {
          newDbSpreadsheet.deleteSheet(defaultSheet);
        }

        // Move a planilha do banco para a pasta raiz
        newDbFile.moveTo(rootFolder);

        // Registra o novo banco na planilha mestra
        const newConfigId = Utilities.getUuid();
        masterSheet.appendRow([newConfigId, INSTALLER_CONFIG.INITIAL_BANK_NAME, newDbSpreadsheet.getId(), rootFolderId, new Date()]);

        Logger.log(`✔ Banco de Questões inicial criado com sucesso: "QuestGen DB - ${INSTALLER_CONFIG.INITIAL_BANK_NAME}"`);
        Logger.log(`  Link da Planilha: ${newDbSpreadsheet.getUrl()}`);
      }
    } else {
      Logger.log(`\n[Passo 4/5] Criação de banco inicial ignorada conforme configuração.`);
    }

    // 5. Configuração da Chave da API Gemini e Usuários
    Logger.log(`\n[Passo 5/5] Verificação de Credenciais e Serviços...`);

    // Chave Gemini
    if (INSTALLER_CONFIG.GEMINI_API_KEY && INSTALLER_CONFIG.GEMINI_API_KEY.trim() !== "") {
      PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", INSTALLER_CONFIG.GEMINI_API_KEY.trim());
      Logger.log(`✔ GEMINI_API_KEY configurada nas Propriedades do Script.`);
    } else {
      const existingApiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      if (existingApiKey) {
        Logger.log(`✔ GEMINI_API_KEY já configurada previamente.`);
      } else {
        Logger.log(`⚠️ ATENÇÃO: GEMINI_API_KEY ainda não foi definida!`);
        Logger.log(`   Adicione-a nas Propriedades do Script (Engrenagem ⚙️ > Configurações do Projeto).`);
      }
    }

    // Usuários (USER_KEYS)
    const existingUsers = PropertiesService.getScriptProperties().getProperty("USER_KEYS");
    if (existingUsers) {
      Logger.log(`✔ Usuários de acesso (USER_KEYS) já configurados.`);
    } else {
      Logger.log(`ℹ️ Definindo credenciais padrão iniciais (admin / admin)...`);
      const defaultUsers = [
        { user: "admin", key: "admin", typeAcess: "userAdmin" }
      ];
      PropertiesService.getScriptProperties().setProperty("USER_KEYS", JSON.stringify(defaultUsers));
      Logger.log(`✔ Usuário "admin" com senha "admin" configurado provisoriamente.`);
      Logger.log(`   Lembre-se de editar o arquivo setupUserKeys.js e rodá-lo para cadastrar suas credenciais definitivas.`);
    }

    // Resumo final
    Logger.log("\n==================================================================");
    Logger.log("   🎉 INSTALAÇÃO DO QUESTGEN IA FINALIZADA COM SUCESSO!           ");
    Logger.log("==================================================================");
    Logger.log(`\nResumo da Estrutura Criada:`);
    Logger.log(`📂 Pasta Raiz:         ${rootFolder.getName()} (${rootFolder.getUrl()})`);
    Logger.log(`📊 Planilha Mestra:    ${masterSpreadsheet.getName()} (${masterSpreadsheet.getUrl()})`);
    Logger.log(`\nPróximos passos:`);
    Logger.log(`1. Se ainda não implantou, clique em "Implantar" > "Nova implantação" > "App da Web".`);
    Logger.log(`2. Abra o link gerado, faça login e aproveite seu QuestGen IA pronto para uso!`);

  } catch (error) {
    Logger.log("\n❌ FALHA DURANTE A INSTALAÇÃO:");
    Logger.log(error.toString());
    Logger.log(error.stack);
  }
}

// =========================================================================
// FUNÇÃO DE DIAGNÓSTICO E SAÚDE DO SISTEMA
// =========================================================================

/**
 * Executa um diagnóstico completo para verificar se todas as pastas,
 * planilhas e propriedades do sistema estão devidamente configuradas.
 */
function verifyInstallation() {
  Logger.log("==================================================================");
  Logger.log("   🔍 DIAGNÓSTICO DE CONFIGURAÇÃO E SAÚDE DO SISTEMA               ");
  Logger.log("==================================================================");

  const props = PropertiesService.getScriptProperties().getProperties();

  // 1. Pasta Raiz
  Logger.log(`\n1. Pasta Raiz:`);
  if (props.ROOT_FOLDER_ID) {
    try {
      const folder = DriveApp.getFolderById(props.ROOT_FOLDER_ID);
      Logger.log(`   ✔ OK: "${folder.getName()}" (${props.ROOT_FOLDER_ID})`);
    } catch (e) {
      Logger.log(`   ❌ ERRO: ID gravado (${props.ROOT_FOLDER_ID}) não pôde ser aberto.`);
    }
  } else {
    Logger.log(`   ❌ PENDENTE: ROOT_FOLDER_ID não configurado.`);
  }

  // 2. Planilha Mestra
  Logger.log(`\n2. Planilha Mestra de Configuração:`);
  if (props.MASTER_CONFIG_SHEET_ID) {
    try {
      const ss = SpreadsheetApp.openById(props.MASTER_CONFIG_SHEET_ID);
      const sheet = ss.getSheetByName("db_configs");
      const count = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
      Logger.log(`   ✔ OK: "${ss.getName()}" (${count} bancos cadastrados)`);
    } catch (e) {
      Logger.log(`   ❌ ERRO: MASTER_CONFIG_SHEET_ID gravado não pôde ser aberto.`);
    }
  } else {
    Logger.log(`   ❌ PENDENTE: MASTER_CONFIG_SHEET_ID não configurado.`);
  }

  // 3. Chave Gemini API
  Logger.log(`\n3. Chave Google Gemini:`);
  if (props.GEMINI_API_KEY && props.GEMINI_API_KEY.trim() !== "") {
    const masked = props.GEMINI_API_KEY.substring(0, 6) + "..." + props.GEMINI_API_KEY.slice(-4);
    Logger.log(`   ✔ OK: Chave presente (${masked})`);
  } else {
    Logger.log(`   ❌ PENDENTE: GEMINI_API_KEY não configurada.`);
  }

  // 4. Usuários
  Logger.log(`\n4. Credenciais de Acesso (USER_KEYS):`);
  if (props.USER_KEYS) {
    try {
      const users = JSON.parse(props.USER_KEYS);
      Logger.log(`   ✔ OK: ${users.length} usuário(s) configurado(s): ${users.map(u => u.user).join(", ")}`);
    } catch (_) {
      Logger.log(`   ❌ ERRO: USER_KEYS contém JSON inválido.`);
    }
  } else {
    Logger.log(`   ❌ PENDENTE: USER_KEYS não configurado.`);
  }

  Logger.log("\n==================================================================");
}
