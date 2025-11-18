/**
 * @description Função de configuração para definir as chaves de cada usuário.
 * RODE ESTA FUNÇÃO MANUALMENTE UMA VEZ PELO EDITOR DO APPS SCRIPT.
 */
function setupUserKeys() {
  // Defina aqui os usuários e as suas chaves individuais.
  const users = [
    { user: "admin", key: "admin", typeAcess: "userAdmin" },
    { user: "user", key: "user", typeAcess: "userClient"},
    // Adicione mais usuários conforme necessário
  ];
  
  // Armazena a lista de usuários como um texto JSON nas propriedades do script.
  PropertiesService.getScriptProperties().setProperty('USER_KEYS', JSON.stringify(users));
  Logger.log('Chaves de usuário definidas com sucesso.');
}