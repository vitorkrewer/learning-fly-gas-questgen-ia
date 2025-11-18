/**
 * @description Obtém a chave da API do Gemini armazenada nas Propriedades do Script.
 * @returns {string|null} A chave da API ou nulo se não for encontrada.
 */
function getGeminiApiKey() {
  try {
    // Defina a sua chave de API nas Propriedades do Script.
    // Chave da Propriedade: GEMINI_API_KEY
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    return apiKey;
  } catch (e) {
    console.error("Erro ao obter a chave da API do Gemini: " + e.toString());
    return null;
  }
}

/**
 * @description Verifica se a chave da API do Gemini está configurada.
 * Esta é a função segura para ser chamada pelo lado do cliente.
 * @returns {object} Um objeto indicando o sucesso e a presença (mas não o valor) da chave.
 */
function checkApiKeyConfig() {
  const apiKey = getGeminiApiKey();
  if (apiKey && apiKey.trim() !== '') {
    return { success: true, isConfigured: true, message: "Chave da API pronta." };
  } else {
    return { success: false, isConfigured: false, message: "Chave da API do Gemini não foi configurada nas Propriedades do Script do servidor." };
  }
}

// --- Call Google Gemini API ---
function callGeminiAPI(documentText, subjectName, numQuestions) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Chave da API do Gemini não fornecida ou não configurada nas Propriedades do Script.");
  }
  const geminiModel = "gemini-1.5-flash-latest"; // Modelo Gemini atualizado
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const prompt = `
    Você é um especialista em pedagogia e elaboração de avaliações educacionais, focado em criar questões que testem níveis cognitivos superiores.
    Com base no TEXTO_BASE fornecido abaixo, sobre o tema "${subjectName}", gere EXATAMENTE ${numQuestions} questões de múltipla escolha.
    As questões devem ser COMPLEXAS e os enunciados ELABORADOS, exigindo análise, interpretação, aplicação de conceitos ou avaliação crítica do conteúdo, não apenas memorização.

    Cada questão DEVE OBRIGATORIAMENTE seguir o seguinte formato ESTRITO, incluindo os marcadores ---QUESTAO_START--- e ---QUESTAO_END---:

    ---QUESTAO_START---
    ENUNCIADO: [Desenvolva um enunciado contextualizado e elaborado, possivelmente apresentando um breve cenário, um problema a ser resolvido, ou uma afirmação para análise. O enunciado deve ser claro, mas desafiador.]
    ALTERNATIVA_A: [Texto da alternativa A. Deve ser uma opção plausível.]
    ALTERNATIVA_B: [Texto da alternativa B. Deve ser uma opção plausível.]
    ALTERNATIVA_C: [Texto da alternativa C. Deve ser uma opção plausível.]
    ALTERNATIVA_D: [Texto da alternativa D. Deve ser uma opção plausível.]
    ALTERNATIVA_E: [Texto da alternativa E. Deve ser uma opção plausível.]
    GABARITO: [Apenas a LETRA da alternativa correta, ex: A, B, C, D, ou E]
    COMENTARIO: [Forneça um comentário detalhado e pedagógico. Explique por que a alternativa correta é de fato correta, conectando-a aos conceitos do TEXTO_BASE. Se pertinente, explique brevemente por que as outras alternativas principais são incorretas, destacando os erros de raciocínio ou interpretação que levariam a escolhê-las.]
    ---QUESTAO_END---

    REQUISITOS ADICIONAIS PARA QUALIDADE:
    1.  **Complexidade Cognitiva:** Priorize questões que envolvam:
        * Análise: Decompor informações em partes componentes.
        * Aplicação: Usar conceitos em novas situações.
        * Avaliação: Julgar o valor da informação para um determinado propósito.
        * Interpretação: Explicar o significado da informação.
    2.  **Enunciados Robustos:** Evite perguntas diretas e simples. Crie enunciados que preparem o terreno para uma reflexão mais profunda.
    3.  **Distratores Fortes:** As alternativas incorretas (distratores) devem ser atraentes e baseadas em erros comuns ou interpretações parciais do TEXTO_BASE. Elas não devem ser obviamente erradas.
    4.  **Clareza e Precisão:** Apesar da complexidade, a linguagem deve ser clara, precisa e gramaticalmente correta, evitando ambiguidades.
    5.  **Originalidade:** As questões devem ser originais e não cópias diretas de frases do TEXTO_BASE.
    6.  **Formato Estrito:** Mantenha o formato ---QUESTAO_START--- e ---QUESTAO_END--- e os campos internos exatamente como especificado.
    7.  Gere ${numQuestions} blocos de questão.

    TEXTO_BASE:
    """
    ${documentText.substring(0, 150000)} 
    """
    `;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      "temperature": 0.6,
      "topK": 40,
      "topP": 0.95,
      "maxOutputTokens": 16000,
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(API_ENDPOINT, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode === 200) {
    const jsonResponse = JSON.parse(responseBody);
    if (jsonResponse.candidates && jsonResponse.candidates.length > 0 && jsonResponse.candidates[0].content && jsonResponse.candidates[0].content.parts && jsonResponse.candidates[0].content.parts.length > 0) {
      return jsonResponse.candidates[0].content.parts[0].text;
    } else if (jsonResponse.promptFeedback && jsonResponse.promptFeedback.blockReason) {
      const blockReason = jsonResponse.promptFeedback.blockReason;
      let detailedReason = `Razão: ${blockReason}.`;
      if (jsonResponse.promptFeedback.safetyRatings && jsonResponse.promptFeedback.safetyRatings.length > 0) {
        detailedReason += " Classificações de Segurança: " + jsonResponse.promptFeedback.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ');
      }
      throw new Error(`Conteúdo bloqueado pela API Gemini. ${detailedReason}. Tente refinar o conteúdo do documento ou o prompt.`);
    } else {
      throw new Error("Resposta da API Gemini recebida, mas em formato inesperado ou sem conteúdo gerado.");
    }
  } else {
    throw new Error(`Falha na chamada da API Gemini. Código: ${responseCode}. Resposta: ${responseBody}`);
  }
}


// --- Parse Gemini API Response ---
function parseGeminiResponse(responseText) {
  const questions = [];
  const questionBlocks = responseText.split("---QUESTAO_START---");

  for (let i = 1; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].split("---QUESTAO_END---")[0];
    if (!block) continue;

    const questionData = {};
    const lines = block.trim().split('\n');
    let currentKey = null;
    let currentValue = [];

    for (const line of lines) {
      const match = line.match(/^([A-Z_]+):\s*(.*)/);
      if (match) {
        if (currentKey) {
          questionData[currentKey.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = currentValue.join('\n').trim();
        }
        currentKey = match[1];
        currentValue = [match[2].trim()];
      } else if (currentKey) {
        currentValue.push(line.trim());
      }
    }
    if (currentKey) {
      questionData[currentKey.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = currentValue.join('\n').trim();
    }

    if (questionData.enunciado && questionData.alternativaA && questionData.gabarito) {
      questions.push({
        enunciado: questionData.enunciado || "",
        alternativaA: questionData.alternativaA || "",
        alternativaB: questionData.alternativaB || "",
        alternativaC: questionData.alternativaC || "",
        alternativaD: questionData.alternativaD || "",
        alternativaE: questionData.alternativaE || "",
        gabarito: (questionData.gabarito || "").toUpperCase().charAt(0),
        comentario: questionData.comentario || ""
      });
    }
  }
  return questions;
}
