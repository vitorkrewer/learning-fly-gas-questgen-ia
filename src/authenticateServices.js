// =================== LÓGICA DE AUTENTICAÇÃO ===================
/**
 * @description Verifica o usuário e a chave e, se corretos, gera um token de sessão.
 * @param {string} username - O nome de usuário inserido.
 * @param {string} clientKey - A chave inserida.
 * @returns {object} Um objeto com o status do sucesso e o token, se aplicável.
 */
function authenticate(username, clientKey) {
  const usersJSON = PropertiesService.getScriptProperties().getProperty('USER_KEYS');
  if (!usersJSON) throw new Error("As chaves de usuário ainda não foram configuradas.");
  
  const users = JSON.parse(usersJSON);
  const foundUser = users.find(u => u.user === username);

  if (foundUser && foundUser.key === clientKey) {
    const token = Utilities.getUuid();
    // Armazena o token em cache por 6 horas (21600 segundos), associado ao nome de usuário.
    CacheService.getScriptCache().put(token, username, 21600); 
    return { success: true, token: token };
  } else {
    return { success: false, message: "Usuário ou chave inválida." };
  }
}

/**
 * @description Função auxiliar para validar um token de sessão.
 * @param {string} token - O token de sessão a ser validado.
 * @returns {boolean} Verdadeiro se o token for válido.
 */
function isTokenValid(token) {
  if (!token) return false;
  // Verifica se o token existe no cache do script.
  const user = CacheService.getScriptCache().get(token);
  return user !== null;
}
