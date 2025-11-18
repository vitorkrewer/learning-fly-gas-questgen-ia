/**
 * @fileoverview Contém toda a lógica de back-end para exportar questões
 * para diferentes formatos (Moodle XML, GIFT, Google Docs).
 */

// =========================================================================
// FUNÇÃO AUXILIAR INTERNA (NÃO CHAMADA PELO CLIENTE)
// =========================================================================

/**
 * Busca e formata os dados das questões de uma planilha específica.
 * @param {string} token O token de sessão para validação.
 * @param {string} configId O ID da configuração do banco de dados.
 * @param {string} subjectNameToExport O nome da disciplina para filtrar, ou "ALL_SUBJECTS".
 * @returns {{success: boolean, questions: Object[], message: string}} Um objeto com o resultado.
 */
function getQuestionsData(token, configId, subjectNameToExport) {
    if (!isTokenValid(token)) throw new Error("Sessão inválida ou expirada.");
    Logger.log(`Iniciando getQuestionsData para configId: ${configId}, disciplina: ${subjectNameToExport}`);

    const config = getConfigById(token, configId);
    if (!config) {
        Logger.log('ERRO: Configuração não encontrada em getQuestionsData.');
        return { success: false, questions: [], message: "Configuração do banco de dados não encontrada." };
    }

    try {
        const spreadsheet = SpreadsheetApp.openById(config.spreadsheet_id);
        const sheet = spreadsheet.getSheetByName(CONSTANTS.SHEETNAMES.DB_QUESTOES);

        if (!sheet || sheet.getLastRow() < 2) {
            Logger.log('AVISO: Aba de questões não encontrada ou vazia.');
            return { success: false, questions: [], message: "Nenhuma questão encontrada para exportar." };
        }

        const allData = sheet.getDataRange().getValues();
        const headers = allData.shift().map(h => String(h).toLowerCase()); // Linha de cabeçalho
        const questionHeaders = CONSTANTS.HEADERS.DB_QUESTOES;

        // Mapeia os nomes dos cabeçalhos para seus índices de coluna (MUITO ROBUSTO)
        const headerMap = {};
        questionHeaders.forEach(headerName => {
            headerMap[headerName] = headers.indexOf(headerName);
        });

        if (headerMap.subject === -1 || headerMap.statement === -1) {
            Logger.log('ERRO: Cabeçalhos essenciais (subject, statement) não encontrados na planilha.');
            return { success: false, questions: [], message: "Planilha não contém os cabeçalhos esperados 'subject' e 'statement'." };
        }

        let questionsData = allData;
        if (subjectNameToExport && subjectNameToExport !== "ALL_SUBJECTS") {
            questionsData = questionsData.filter(row => row[headerMap.subject] === subjectNameToExport);
            Logger.log(`${questionsData.length} questões encontradas para a disciplina "${subjectNameToExport}".`);
        } else {
            Logger.log(`${questionsData.length} questões encontradas (todas as disciplinas).`);
        }

        if (questionsData.length === 0) {
            return { success: false, questions: [], message: "Nenhuma questão encontrada com os critérios fornecidos." };
        }

        const questionsAsObjects = questionsData.map(row => {
            const questionObj = {};
            for (const headerName in headerMap) {
                if (headerMap[headerName] !== -1) {
                    questionObj[headerName] = row[headerMap[headerName]];
                }
            }
            return questionObj;
        });

        return { success: true, questions: questionsAsObjects, message: 'Dados carregados com sucesso.' };
    } catch (e) {
        Logger.log(`!!! ERRO CRÍTICO em getQuestionsData: ${e.toString()}`);
        return { success: false, questions: [], message: `Erro ao ler os dados da planilha: ${e.message}` };
    }
}


// =========================================================================
// FUNÇÕES DE EXPORTAÇÃO (CHAMADAS PELO CLIENTE)
// =========================================================================

/**
 * Exporta questões para o formato Moodle XML.
 * @param {string} token O token de sessão.
 * @param {string} configId O ID da configuração do banco.
 * @param {string} subjectNameToExport A disciplina para exportar.
 * @returns {object} O resultado com os dados XML.
 */
function exportToMoodleXML(token, configId, subjectNameToExport) {
    Logger.log(`--- Iniciando exportToMoodleXML para configId: ${configId} ---`);
    try {
        const dataResult = getQuestionsData(token, configId, subjectNameToExport);
        if (!dataResult.success) {
            return { success: false, xmlData: null, message: dataResult.message };
        }

        let xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n';

        dataResult.questions.forEach((q, index) => {
            const code = q.code || `Questao_${Date.now()}_${index}`;
            const enunciado = String(q.statement || "");
            const comentario = String(q.comment || "");
            const gabarito = String(q.answer_key || "").toUpperCase().charAt(0);

            if (!enunciado || !gabarito) return; // Pula questão inválida

            xmlText += `  <question type="multichoice">\n`;
            xmlText += `    <name><text>${code}</text></name>\n`;
            xmlText += `    <questiontext format="html"><text><![CDATA[${enunciado}]]></text></questiontext>\n`;
            xmlText += `    <shuffleanswers>true</shuffleanswers>\n`;
            xmlText += `    <answernumbering>abc</answernumbering>\n`;

            const alternatives = [
                { letter: 'A', text: String(q.option_a || "") }, { letter: 'B', text: String(q.option_b || "") },
                { letter: 'C', text: String(q.option_c || "") }, { letter: 'D', text: String(q.option_d || "") },
                { letter: 'E', text: String(q.option_e || "") }
            ];

            alternatives.forEach(alt => {
                if (alt.text.trim() !== "") {
                    const isCorrect = (alt.letter === gabarito);
                    xmlText += `    <answer fraction="${isCorrect ? "100" : "0"}">\n`;
                    xmlText += `      <text><![CDATA[${alt.text}]]></text>\n`;
                    if (isCorrect && comentario.trim() !== "") {
                        xmlText += `      <feedback><text><![CDATA[${comentario}]]></text></feedback>\n`;
                    }
                    xmlText += `    </answer>\n`;
                }
            });
            xmlText += `  </question>\n`;
        });
        xmlText += `</quiz>`;

        Logger.log(`Sucesso! XML gerado com ${dataResult.questions.length} questões.`);
        return { success: true, xmlData: xmlText, message: "Exportação XML gerada com sucesso." };
    } catch (e) {
        Logger.log(`!!! ERRO CRÍTICO em exportToMoodleXML: ${e.toString()}`);
        return { success: false, xmlData: null, message: `Erro ao exportar para Moodle XML: ${e.message}` };
    }
}

/**
 * Exporta questões para o formato Moodle GIFT.
 * @param {string} token O token de sessão.
 * @param {string} configId O ID da configuração do banco.
 * @param {string} subjectNameToExport A disciplina para exportar.
 * @returns {object} O resultado com os dados GIFT.
 */
function exportToMoodleGift(token, configId, subjectNameToExport) {
    Logger.log(`--- Iniciando exportToMoodleGift para configId: ${configId} ---`);
    try {
        const dataResult = getQuestionsData(token, configId, subjectNameToExport);
        if (!dataResult.success) {
            return { success: false, giftData: null, message: dataResult.message };
        }

        let giftText = "";
        dataResult.questions.forEach((q, index) => {
            const code = q.code || `Questao_${Date.now()}_${index}`;
            const enunciado = String(q.statement || "").replace(/([{}=~#:\\])/g, '\\$1');
            const comentario = String(q.comment || "").replace(/([{}=~#:\\])/g, '\\$1');
            const gabarito = String(q.answer_key || "").toUpperCase().charAt(0);

            if (!enunciado || !gabarito) return; // Pula questão inválida

            giftText += `::${code}::${enunciado}{\n`;
            
            const alternatives = [
                { letter: 'A', text: String(q.option_a || "").replace(/([{}=~#:\\])/g, '\\$1') },
                { letter: 'B', text: String(q.option_b || "").replace(/([{}=~#:\\])/g, '\\$1') },
                { letter: 'C', text: String(q.option_c || "").replace(/([{}=~#:\\])/g, '\\$1') },
                { letter: 'D', text: String(q.option_d || "").replace(/([{}=~#:\\])/g, '\\$1') },
                { letter: 'E', text: String(q.option_e || "").replace(/([{}=~#:\\])/g, '\\$1') }
            ];

            alternatives.forEach(alt => {
                if (alt.text.trim() !== "") {
                    const isCorrect = (alt.letter === gabarito);
                    giftText += (isCorrect ? '=' : '~') + alt.text;
                    if (isCorrect && comentario.trim() !== "") {
                        giftText += `#${comentario}`;
                    }
                    giftText += '\n';
                }
            });
            giftText += "}\n\n";
        });
        
        Logger.log(`Sucesso! GIFT gerado com ${dataResult.questions.length} questões.`);
        return { success: true, giftData: giftText, message: "Exportação GIFT gerada com sucesso." };
    } catch (e) {
        Logger.log(`!!! ERRO CRÍTICO em exportToMoodleGift: ${e.toString()}`);
        return { success: false, giftData: null, message: `Erro ao exportar para Moodle GIFT: ${e.message}` };
    }
}

/**
 * Exporta questões para um Google Document.
 * @param {string} token O token de sessão.
 * @param {string} configId O ID da configuração do banco.
 * @param {string} targetDocId O ID do documento de destino.
 * @param {string} subjectNameToExport A disciplina para exportar.
 * @returns {object} O resultado da operação.
 */
function exportQuestionsToGoogleDoc(token, configId, targetDocId, subjectNameToExport) {
    Logger.log(`--- Iniciando exportQuestionsToGoogleDoc para Doc ID: ${targetDocId} ---`);
    if (!targetDocId) {
        return { success: false, message: "O ID do Documento de Destino é obrigatório." };
    }
    try {
        const dataResult = getQuestionsData(token, configId, subjectNameToExport);
        if (!dataResult.success) {
            return { success: false, message: dataResult.message };
        }
        
        const targetDoc = DocumentApp.openById(targetDocId);
        const body = targetDoc.getBody();
        
        if (body.getNumChildren() > 1 || (body.getNumChildren() === 1 && body.getChild(0).asText().getText() !== "")) {
            body.appendPageBreak();
        }
        
        const headerText = `Questões Exportadas - Disciplina: ${subjectNameToExport === "ALL_SUBJECTS" ? "Todas" : subjectNameToExport}`;
        body.appendParagraph(headerText).setHeading(DocumentApp.ParagraphHeading.HEADING1);
        body.appendHorizontalRule();

        dataResult.questions.forEach((q, index) => {
            const enunciado = String(q.statement || "");
            if (!enunciado) return;

            body.appendParagraph(`Questão ${index + 1}: ${enunciado}`).setBold(true);
            
            const alternatives = [
                { letter: 'A', text: String(q.option_a || "") }, { letter: 'B', text: String(q.option_b || "") },
                { letter: 'C', text: String(q.option_c || "") }, { letter: 'D', text: String(q.option_d || "") },
                { letter: 'E', text: String(q.option_e || "") }
            ];

            alternatives.forEach(alt => {
                if (alt.text.trim() !== "") {
                    body.appendListItem(`${alt.letter}) ${alt.text}`).setGlyphType(DocumentApp.GlyphType.LATIN_UPPER).setBold(false);
                }
            });

            const gabarito = String(q.answer_key || "").toUpperCase().charAt(0);
            const comentario = String(q.comment || "");

            if (gabarito) {
                body.appendParagraph(`Gabarito: ${gabarito}`).setBold(false);
            }
            if (comentario) {
                body.appendParagraph(`Comentário: ${comentario}`).setBold(false).setItalic(true);
            }
            body.appendParagraph("---").setBold(false);
        });

        targetDoc.saveAndClose();
        Logger.log(`Sucesso! ${dataResult.questions.length} questões exportadas para o Google Doc.`);
        return { success: true, message: `${dataResult.questions.length} questões exportadas com sucesso!` };
    } catch (e) {
        Logger.log(`!!! ERRO CRÍTICO em exportQuestionsToGoogleDoc: ${e.toString()}`);
        return { success: false, message: `Erro ao exportar para Google Docs: ${e.message}. Verifique o ID e as permissões do documento.` };
    }
}

