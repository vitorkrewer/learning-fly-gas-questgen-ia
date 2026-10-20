# Arquitetura do Sistema

O **QuestGen IA** foi projetado com uma arquitetura cliente-servidor, inteiramente contida no ecossistema do **Google Apps Script (GAS)**. Isso permite que ele funcione como um aplicativo web autônomo (SPA - *Single Page Application*), sem custos de infraestrutura ou necessidade de servidores externos.

---

## Estrutura de Arquivos

```
/
├── src/                          # Código do lado do servidor (Back-end GAS)
│   ├── geminiServices.js         # Módulo central de IA (modelos, fallback, multimodal e JSON Schema)
│   ├── ScriptServices.js         # Orquestrador principal, doGet, leitura de Docs/PDFs
│   ├── questionServices.js       # CRUD de questões, dashboard e LockService
│   ├── configServices.js         # Gerencia a criação e leitura dos bancos de dados
│   ├── exportFiles.js            # Exportação para Moodle (XML/GIFT) e Google Docs
│   ├── authenticateServices.js   # Autenticação e validação de tokens de sessão
│   ├── apiServices.js            # Ponte de compatibilidade retroativa para IA
│   ├── constants.js              # Constantes globais (nomes de abas, cabeçalhos)
│   └── setupUserKeys.js          # Script de configuração inicial das credenciais
│
├── html/                         # Interface do lado do cliente (Front-end)
│   └── index.html                # Estrutura principal da SPA e modais
│
├── assets/
│   ├── css/
│   │   └── stylesheet.css        # Estilos personalizados (Dark/Light mode, layout)
│   └── js/
│       └── application.js        # Lógica de front-end, DOM e chamadas assíncronas
│
└── data/
    └── appsscript.json           # Manifesto oficial, escopos mínimos e dependências
```

---

## Componentes Principais

### Back-end (Lado do Servidor)

* **Execução:** O código em `/src` é executado nos servidores do Google pelo Runtime V8 do Apps Script, integrado com as APIs nativas do Google Drive, Google Sheets, Google Docs e `UrlFetchApp`.
* **Módulo Central de IA (`geminiServices.js`):**
  * **Multimodalidade:** Lê tanto arquivos nativos do **Google Docs** quanto arquivos **PDF** armazenados no Google Drive (enviados em base64 como `inlineData`).
  * **Cadeia de Fallback Automática:** Tenta em sequência:
    1. `gemini-3.8-flash` (alta velocidade)
    2. `gemini-3.5-flash` (eficiência energética/latência)
    3. `gemini-2.5-pro` (raciocínio complexo)
    4. `gemini-2.5-flash` (alta estabilidade)
    5. `gemini-1.5-flash` (disponibilidade garantida)
  * **Structured Outputs:** Utiliza `responseMimeType: "application/json"` com `responseSchema` rigoroso, eliminando falhas de parsing por regex.
* **Segurança Concorrente:** Operações críticas de escrita e exclusão nas planilhas utilizam `LockService.getScriptLock()` para evitar condições de corrida (*race conditions*).

### Front-end (Lado do Cliente)

* **SPA Responsiva:** O `index.html` contém as visualizações dinâmicas (Boas-vindas/Dashboard, Gerador de Questões, Modais de Gestão).
* **Gestão de Sessão e Configurações:** `sessionToken`, `questGenTheme` (Dark/Light) e `questGenActiveConfigId` são gerenciados via JavaScript nativo e `localStorage`.
* **Comunicação Assíncrona:** Toda a troca de dados com o back-end ocorre através do canal nativo assíncrono `google.script.run` com `withSuccessHandler` e `withFailureHandler`.

---

## Fluxo de Execução e Dados

```
[ Usuário submete ID do Doc/PDF e Disciplina ]
                    │
                    ▼
          [ application.js ]
                    │  google.script.run.processDocumentAndGenerateQuestions
                    ▼
          [ ScriptServices.js ]
                    │
                    ├──► DriveApp: detecta MIME e extrai Conteúdo (Texto ou Blob PDF)
                    │
                    ▼
          [ geminiServices.js ]
                    │
                    ├──► Tenta modelo primário (ex: 3.8-flash) com schema JSON estrito
                    ├──► Se 404/429/500/503: aciona fallback para 3.5-flash ➔ 2.5-pro ➔ 2.5-flash ➔ 1.5-flash
                    ├──► Valida e normaliza o JSON retornado
                    │
                    ▼
          [ ScriptServices.js ]
                    │
                    ├──► LockService: adquire bloqueio transacional
                    ├──► SpreadsheetApp: grava questões em 'db_questoes'
                    └──► Grava log de execução em 'data_logs'
                    │
                    ▼
          [ Retorno de Sucesso para application.js ]
                    │
                    ▼
          [ Atualização da Interface / Dashboard ]
```
