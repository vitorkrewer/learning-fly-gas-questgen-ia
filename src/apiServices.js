/**
 * @fileoverview Ponte de compatibilidade retroativa para os serviços da API do Gemini.
 * Toda a lógica principal, cadeias de fallback e suporte multimodal estão centralizados em geminiServices.js.
 */

/**
 * Obtém a chave da API do Gemini armazenada nas Propriedades do Script.
 * @returns {string|null}
 */
function getGeminiApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
}

/**
 * Verifica se a chave da API do Gemini está configurada.
 * @returns {{success: boolean, isConfigured: boolean, message: string}}
 */
function checkApiKeyConfig() {
  const apiKey = getGeminiApiKey();
  if (apiKey && apiKey.trim() !== '') {
    return { success: true, isConfigured: true, message: "Chave da API pronta." };
  } else {
    return { success: false, isConfigured: false, message: "Chave da API do Gemini não configurada nas Propriedades do Script (GEMINI_API_KEY)." };
  }
}

/**
 * Encaminha a geração de questões para o módulo unificado geminiServices.js.
 * @param {string} documentText Texto extraído do documento.
 * @param {string} subjectName Disciplina ou tópico.
 * @param {number} numQuestions Quantidade de questões.
 * @returns {Array<Object>} Lista de questões geradas.
 */
function callGeminiAPI(documentText, subjectName, numQuestions) {
  return callGeminiWithFallback({ text: documentText }, subjectName, numQuestions);
}
