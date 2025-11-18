# Guia de Instalação e Configuração
Siga este guia para implantar e configurar o QuestGen IA em sua própria conta Google.

## Pré-requisitos
**Conta Google:** Você precisa de uma conta Google (Gmail, Google Workspace, etc.).

**Chave de API do Google Gemini:** Você precisará de uma chave de API para o Gemini. Você pode obter uma no Google AI Studio.

**Passo 1: Copiar o Projeto**
Acesse o projeto no Google Apps Script.

Clique em Visão geral > Criar uma cópia. Isso criará uma cópia do projeto em seu Google Drive e a abrirá no editor de scripts.

**Passo 2: Configurar o Back-end**
2.1. Configurar as Chaves de Acesso
No editor do Apps Script, abra o arquivo src/setupUserKeys.js.

Edite a lista users para definir os nomes de usuário e senhas (chaves) que terão acesso à aplicação.

```
const users = [
  { user: "seu_usuario", key: "sua_senha_segura", typeAcess: "userAdmin" },
  { user: "outro_usuario", key: "outra_senha", typeAcess: "userClient"},
];
```

Com o arquivo setupUserKeys.js aberto, selecione a função setupUserKeys na barra de ferramentas e clique em Executar.

O Google pode pedir autorização para que o script modifique suas propriedades. Conceda a permissão. Isso salvará suas credenciais de forma segura.

2.2. Configurar a Chave da API do Gemini
No menu à esquerda do editor, clique em Configurações do projeto (ícone de engrenagem).

Role para baixo até a seção Propriedades do script.

Clique em Adicionar propriedade do script.

No campo Propriedade, digite `GEMINI_API_KEY`.

No campo Valor, cole a sua chave de API do Google Gemini.

Clique em Salvar propriedades do script.

**Passo 3: Implantar como Aplicativo Web**
No canto superior direito do editor, clique em Implantar > Nova implantação.

Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha App da Web.

Preencha as informações:

Descrição: QuestGen IA - Gerador de Questões (ou o que preferir).

Executar como: Eu (seu_email@dominio.com).

Quem pode acessar: Qualquer pessoa. Importante: Isso não torna seus dados públicos. A segurança é controlada pelo nosso sistema de login.

Clique em Implantar.

O Google pode pedir autorização novamente. Conceda as permissões necessárias.

Após a conclusão, copie a URL do app da Web. Este é o link para acessar sua aplicação.

**Passo 4: Configuração Inicial na Aplicação**
Abra a URL do app da Web que você copiou.

Faça o login com um dos usuários que você configurou no Passo 2.1.

A aplicação pedirá a configuração da Pasta Raiz:

No seu Google Drive, crie uma nova pasta onde todos os arquivos do QuestGen IA serão armazenados.

Obtenha o ID dessa pasta (geralmente, a parte final da URL quando você abre a pasta).

Cole o ID no campo Pasta Raiz dentro da aplicação e clique em "Salvar Pasta".

Pronto! Sua instância do QuestGen IA está configurada e pronta para ser usada.