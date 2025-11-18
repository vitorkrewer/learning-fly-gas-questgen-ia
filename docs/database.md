# **Estrutura do Banco de Dados (Google Sheets)**

O **QuestGen IA** utiliza o Google Sheets como seu sistema de banco de dados principal, aproveitando sua flexibilidade e integração nativa com o Google Apps Script. A estrutura é dividida em uma planilha de configuração mestra e múltiplas planilhas que funcionam como bancos de questões independentes.

## **1\. Planilha de Configuração Mestra**

Esta é a espinha dorsal do sistema de gerenciamento de múltiplos bancos de dados.

* **Nome do Arquivo:** QuestGen AI \- Configurações  
* **Localização:** É criada automaticamente na **Pasta Raiz** que o usuário configura na primeira vez que usa a aplicação.

<p align="center">
  <img src="/docs/images/database-config-screen.png" alt="Screenshot kanbanAgil" width="800">
</p>


### **Aba: db\_configs**

Esta aba contém um registro de todos os bancos de questões criados pelo usuário.

| Nome da Coluna | Tipo | Descrição |
| :---- | :---- | :---- |
| config\_id | String | Um identificador único universal (UUID) para o banco de dados. (Chave Primária) |
| config\_name | String | O nome amigável que o usuário deu ao banco de dados (ex: "Concurso 2025"). |
| spreadsheet\_id | String | O ID da Planilha Google que armazena as questões para este banco. |
| folder\_id | String | O ID da Pasta Raiz onde esta configuração e seus arquivos associados estão localizados. |
| created\_at | Date | A data e hora em que o banco de dados foi criado. |

## **2\. Planilha de Banco de Questões**

Cada linha na planilha db\_configs aponta para uma planilha de banco de questões separada.

* **Nome do Arquivo:** QuestGen DB \- \[Nome do Banco\] (ex: QuestGen DB \- Concurso 2025\)  
* **Localização:** Criada automaticamente na **Pasta Raiz**.

### **Aba: db\_questoes**

Esta é a aba principal onde as questões geradas pela IA são armazenadas.

| Nome da Coluna | Tipo | Descrição |
| :---- | :---- | :---- |
| code | String | Um código único de 8 caracteres para cada questão. (Chave Primária) |
| subject | String | A disciplina ou tópico da questão. |
| statement | String | O enunciado completo da questão. |
| option\_a | String | O texto da alternativa A. |
| option\_b | String | O texto da alternativa B. |
| option\_c | String | O texto da alternativa C. |
| option\_d | String | O texto da alternativa D. |
| option\_e | String | O texto da alternativa E. |
| answer\_key | String | A letra da alternativa correta (A, B, C, D ou E). |
| comment | String | O comentário pedagógico explicando a resposta. |

### **Aba: data\_logs**

Esta aba registra as principais ações realizadas no banco de dados, servindo como um log para depuração e auditoria.

| Nome da Coluna | Tipo | Descrição |
| :---- | :---- | :---- |
| timestamp | Date | A data e hora em que o evento ocorreu. |
| document\_id | String | O ID do Google Doc usado como base, se aplicável. |
| message | String | A descrição do evento (ex: "Iniciando geração...", "Erro..."). |