const CONSTANTS = {
    // Nomes das planilhas e abas
    MASTER_CONFIG_SHEET_NAME: 'QuestGen AI - Configurações',
    SHEETNAMES: {
        DB_CONFIGS: 'db_configs',
        DATA_LOGS: 'data_logs',
        DB_QUESTOES: 'db_questoes',
    },

    // Cabeçalhos para as abas
    HEADERS: {
        DB_CONFIGS: ['config_id', 'config_name', 'spreadsheet_id', 'folder_id', 'created_at'],
        DATA_LOGS: ['timestamp', 'document_id', 'message'],
        DB_QUESTOES: ['code', 'subject', 'statement', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'answer_key', 'comment'],
    }
};