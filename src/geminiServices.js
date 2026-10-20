/**
 * @fileoverview Módulo Centralizado de Integração com Google Gemini IA (LearningFly / QuestGen IA).
 * Gerencia credenciais, configurações, cadeia de modelos com fallback automático,
 * estruturação de prompts pedagógicos e processamento multimodal (Google Docs e PDFs).
 */

const GEMINI_AI_CONFIG = {
  /**
   * Cadeia ordenada de modelos para fallback automático:
   * 1. gemini-3.8-flash (alta velocidade / próxima geração)
   * 2. gemini-3.5-flash (alta eficiência)
   * 3. gemini-2.5-pro (raciocínio avançado / alta fidelidade)
   * 4. gemini-2.5-flash (fallback estável moderno)
   * 5. gemini-1.5-flash (fallback de ampla disponibilidade)
   */
  FALLBACK_MODELS: [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-1.5-flash'
  ],

  API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',

  GENERATION_CONFIG: {
    temperature: 0.5,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 65000,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'ARRAY',
      description: 'Lista de questões de múltipla escolha geradas.',
      items: {
        type: 'OBJECT',
        properties: {
          enunciado: {
            type: 'STRING',
            description: 'Enunciado contextualizado e elaborado da questão.'
          },
          alternativaA: {
            type: 'STRING',
            description: 'Texto plausível para a alternativa A.'
          },
          alternativaB: {
            type: 'STRING',
            description: 'Texto plausível para a alternativa B.'
          },
          alternativaC: {
            type: 'STRING',
            description: 'Texto plausível para a alternativa C.'
          },
          alternativaD: {
            type: 'STRING',
            description: 'Texto plausível para a alternativa D.'
          },
          alternativaE: {
            type: 'STRING',
            description: 'Texto plausível para a alternativa E.'
          },
          gabarito: {
            type: 'STRING',
            description: 'Apenas a letra da alternativa correta (A, B, C, D ou E).',
            enum: ['A', 'B', 'C', 'D', 'E']
          },
          comentario: {
            type: 'STRING',
            description: 'Justificativa pedagógica detalhada explicando o gabarito e os distratores.'
          }
        },
        required: [
          'enunciado',
          'alternativaA',
          'alternativaB',
          'alternativaC',
          'alternativaD',
          'alternativaE',
          'gabarito',
          'comentario'
        ]
      }
    }
  }
};

/**
 * Obtém a chave da API do Gemini armazenada nas Propriedades do Script.
 * @returns {string|null}
 */
function getGeminiApiKey() {
  try {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  } catch (e) {
    console.error('Erro ao ler GEMINI_API_KEY das propriedades:', e.toString());
    return null;
  }
}

/**
 * Verifica se a chave da API do Gemini está configurada.
 * Seguro para chamada client-side via google.script.run.
 * @returns {{success: boolean, isConfigured: boolean, message: string}}
 */
function checkApiKeyConfig() {
  const apiKey = getGeminiApiKey();
  if (apiKey && apiKey.trim() !== '') {
    return { success: true, isConfigured: true, message: 'Chave da API do Gemini pronta.' };
  }
  return {
    success: false,
    isConfigured: false,
    message: 'Chave da API do Gemini não configurada nas Propriedades do Script (GEMINI_API_KEY).'
  };
}

/**
 * Retorna a lista de modelos a serem utilizados na chamada com fallback.
 * Permite sobrescrever o modelo primário definindo a propriedade 'GEMINI_MODEL'.
 * @returns {string[]}
 */
function getModelHierarchy() {
  const customModel = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL');
  if (customModel && customModel.trim() !== '') {
    const list = [customModel.trim(), ...GEMINI_AI_CONFIG.FALLBACK_MODELS];
    return Array.from(new Set(list));
  }
  return GEMINI_AI_CONFIG.FALLBACK_MODELS;
}

/**
 * Constrói as instruções pedagógicas estruturadas para o prompt do Gemini.
 * @param {string} subjectName Nome da disciplina/tópico.
 * @param {number} numQuestions Quantidade exata de questões.
 * @returns {string}
 */
function buildSystemPrompt(subjectName, numQuestions) {
  return `Você é um especialista sênior em pedagogia, design instrucional e elaboração de avaliações educacionais de alta performance.
Com base no material de estudo fornecido (texto ou documento PDF), elabore EXATAMENTE ${numQuestions} questões de múltipla escolha de alto rigor técnico e pedagógico sobre o tema "${subjectName}".

DIRETRIZES PEDAGÓGICAS OBRIGATÓRIAS:
1. Nível Cognitivo Superior: Foque em análise crítica, interpretação de cenários, aplicação prática de conceitos e julgamento criterioso. Evite questões de simples memorização direta ou cópia textual.
2. Enunciados Elaborados: Contextualize cada questão com problemas reais, estudos de caso breves ou reflexões aprofundadas.
3. Distratores Plausíveis: As 4 alternativas incorretas devem ser inteligentes, baseadas em equívocos conceituais comuns ou interpretações parciais, sem opções óbvias ou absurdas.
4. Gabarito Preciso: Indique rigorosamente a letra correta (A, B, C, D ou E).
5. Comentário Pedagógico Completo: Explique detalhadamente a razão da alternativa correta à luz do conteúdo e comente sucintamente por que os principais distratores são incorretos.
6. Formato: Retorne ESTRITAMENTE o array JSON conforme o schema solicitado.`;
}

/**
 * Executa a chamada à API do Gemini com fallback automático entre modelos.
 * Suporta entrada de texto puro ou documento PDF (multimodal).
 *
 * @param {{text?: string, pdfBlob?: GoogleAppsScript.Base.Blob}} contentInput Conteúdo do material de estudo.
 * @param {string} subjectName Disciplina ou tópico.
 * @param {number} numQuestions Número de questões desejadas.
 * @returns {Array<Object>} Lista de questões estruturadas.
 */
function callGeminiWithFallback(contentInput, subjectName, numQuestions) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave da API do Gemini não configurada nas Propriedades do Script (GEMINI_API_KEY).');
  }

  const promptText = buildSystemPrompt(subjectName, numQuestions);
  const parts = [{ text: promptText }];

  // Tratamento Multimodal: se houver PDF, adiciona inlineData em Base64
  if (contentInput.pdfBlob) {
    Logger.log('Preparando arquivo PDF como conteúdo multimodal para a API Gemini...');
    const bytes = contentInput.pdfBlob.getBytes();
    const base64Data = Utilities.base64Encode(bytes);
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data
      }
    });
  } else if (contentInput.text) {
    // Se for texto, limita a 300.000 caracteres como proteção contra overflow
    const safeText = contentInput.text.substring(0, 300000);
    parts.push({
      text: `\n\n--- MATERIAL DE ESTUDO BASE ---\n${safeText}\n--- FIM DO MATERIAL ---`
    });
  } else {
    throw new Error('Nenhum conteúdo (texto ou PDF) foi fornecido para a IA.');
  }

  const payload = {
    contents: [{ parts: parts }],
    generationConfig: GEMINI_AI_CONFIG.GENERATION_CONFIG
  };

  const modelsToTry = getModelHierarchy();
  const errorsHistory = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const endpoint = `${GEMINI_AI_CONFIG.API_BASE_URL}/${currentModel}:generateContent?key=${apiKey}`;

    Logger.log(`[Gemini IA] Tentativa ${i + 1}/${modelsToTry.length} com o modelo: "${currentModel}"...`);

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(endpoint, options);
      const code = response.getResponseCode();
      const body = response.getContentText();

      if (code === 200) {
        Logger.log(`[Gemini IA] Sucesso obtido com o modelo: "${currentModel}"!`);
        const questions = parseGeminiJsonResponse(body);
        if (questions && questions.length > 0) {
          return questions;
        }
        Logger.log(`[Gemini IA] Modelo "${currentModel}" retornou 200, mas nenhum bloco de questão válido foi extraído.`);
      }

      const warnMsg = `Modelo "${currentModel}" falhou (HTTP ${code}): ${body.substring(0, 200)}`;
      Logger.log(`[Gemini IA Alerta] ${warnMsg}`);
      errorsHistory.push(warnMsg);

    } catch (reqError) {
      const exMsg = `Exceção na chamada do modelo "${currentModel}": ${reqError.message}`;
      Logger.log(`[Gemini IA Erro] ${exMsg}`);
      errorsHistory.push(exMsg);
    }
  }

  throw new Error(`Falha em todos os modelos Gemini testados (${modelsToTry.join(', ')}). Detalhes:\n${errorsHistory.join('\n')}`);
}

/**
 * Realiza o parse da resposta JSON da API Gemini, com sanitização e normalização.
 * @param {string} responseBody Corpo da resposta HTTP do Gemini.
 * @returns {Array<Object>}
 */
function parseGeminiJsonResponse(responseBody) {
  const jsonResponse = JSON.parse(responseBody);

  if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
    throw new Error(`Conteúdo bloqueado pela política de segurança da IA: ${jsonResponse.promptFeedback.blockReason}`);
  }

  if (
    !jsonResponse.candidates ||
    jsonResponse.candidates.length === 0 ||
    !jsonResponse.candidates[0].content ||
    !jsonResponse.candidates[0].content.parts ||
    jsonResponse.candidates[0].content.parts.length === 0
  ) {
    return [];
  }

  let rawText = jsonResponse.candidates[0].content.parts[0].text.trim();

  // Remove eventuais blocos de código markdown que o modelo possa ter incluído (```json ... ```)
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  let parsedData;
  try {
    parsedData = JSON.parse(rawText);
  } catch (e) {
    Logger.log('Falha no JSON.parse direto da resposta do Gemini. Tentando extração por substring...');
    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      parsedData = JSON.parse(rawText.substring(firstBracket, lastBracket + 1));
    } else {
      throw new Error(`Não foi possível decodificar o JSON retornado pela IA: ${e.message}`);
    }
  }

  const questionsList = Array.isArray(parsedData) ? parsedData : (parsedData.questions || []);

  // Normalização e validação de cada questão
  const normalized = [];
  questionsList.forEach(q => {
    const enunciado = q.enunciado || q.statement || q.question || '';
    const altA = q.alternativaA || q.option_a || q.a || '';
    const altB = q.alternativaB || q.option_b || q.b || '';
    const altC = q.alternativaC || q.option_c || q.c || '';
    const altD = q.alternativaD || q.option_d || q.d || '';
    const altE = q.alternativaE || q.option_e || q.e || '';
    const gabaritoRaw = String(q.gabarito || q.answer_key || q.answer || 'A').toUpperCase().trim();
    const gabarito = gabaritoRaw.charAt(0);
    const comentario = q.comentario || q.comment || q.feedback || '';

    if (enunciado && altA && altB && gabarito) {
      normalized.push({
        enunciado: enunciado,
        alternativaA: altA,
        alternativaB: altB,
        alternativaC: altC,
        alternativaD: altD,
        alternativaE: altE,
        gabarito: gabarito,
        comentario: comentario
      });
    }
  });

  return normalized;
}
