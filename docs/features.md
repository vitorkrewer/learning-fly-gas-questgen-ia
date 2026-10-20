# Visão Geral e Funcionalidades

O **QuestGen IA** é uma ferramenta de produtividade educacional criada para acelerar e qualificar o processo de elaboração de avaliações e bancos de questões. Integrado ao ecossistema Google Workspace e potencializado pelo Google Gemini, o sistema transforma materiais didáticos brutos em questões formatadas, comentadas e prontas para uso em ambientes virtuais de aprendizagem.

---

## Público-Alvo

* **Educadores e Professores:** Criam rapidamente provas, listas de exercícios e simulados aderentes aos seus planos de aula.
* **Designers Instrucionais & Conteudistas:** Produzem com velocidade e consistência bancos de questões para cursos EaD e treinamentos corporativos.
* **Instituições de Ensino:** Padronizam a qualidade pedagógica de suas avaliações em escala com custo zero de infraestrutura.

---

## Lista de Funcionalidades

### 1. Autenticação e Segurança
* **Login por Usuário e Chave:** Acesso controlado por credenciais individuais armazenadas em `USER_KEYS`.
* **Sessão por Token:** Tokens de sessão temporários validados a cada requisição de servidor.
* **Escopos OAuth Mínimos:** Permissões restritas estritamente ao Google Drive, Google Sheets, Google Docs e chamadas externas, sem acesso a dados pessoais ou e-mails.

### 2. Geração Inteligente com Google Gemini (Módulo Centralizado)
* **Suporte Multimodal a Documentos e PDFs:** Capacidade de processar nativamente:
  * Arquivos **Google Docs** vinculados ao Drive.
  * Arquivos **PDF** completos no Google Drive (enviados em base64 via `inlineData`).
  * Arquivos de texto puro (.txt, .md) e apresentações Google Slides (convertidas automaticamente).
* **Cadeia de Fallback Automática entre Modelos:**
  1. `gemini-3.8-flash` (alta velocidade)
  2. `gemini-3.5-flash` (eficiência e latência reduzida)
  3. `gemini-2.5-pro` (raciocínio complexo para itens avançados)
  4. `gemini-2.5-flash` (estabilidade)
  5. `gemini-1.5-flash` (disponibilidade contínua de segurança)
* **Structured Outputs (Geração em JSON Nativo):** Utiliza `responseSchema` obrigatório na API do Gemini. As questões chegam estruturadas diretamente em formato de objeto, eliminando falhas de regex e perda de dados.
* **Diretrizes Pedagógicas Avançadas:** Instruções embutidas para avaliação de níveis cognitivos superiores (análise, interpretação, julgamento), distratores plausíveis e comentários formativos detalhados.

### 3. Gestão Descentralizada de Bancos de Dados
* **Arquitetura Multi-Banco:** Permite criar múltiplos bancos isolados (ex: por disciplina, semestre ou curso), cada um armazenado em uma Planilha Google dedicada.
* **Planilha Mestra de Configuração:** Centraliza o catálogo de bancos e vinculações com pastas do Drive.
* **Bloqueio Concorrente (`LockService`):** Gravações e exclusões concorrentes utilizam bloqueio transacional do Google para prevenir corrupção ou inconsistência de dados.

### 4. Interface do Usuário (UI/UX)
* **Single Page Application (SPA):** Navegação fluida sem recarregamento de página.
* **Dashboard em Tempo Real:** Totalizadores de questões, disciplinas cadastradas e histórico de itens.
* **Seletor de Tema Dinâmico:** Alternância instantânea entre modo Claro (*Light*) e Escuro (*Dark*) com persistência no `localStorage`.
* **Design Responsivo:** Adaptável a telas de desktop, tablets e smartphones (Bootstrap 5).

### 5. Administração e Curadoria de Questões
* **Exploração por Disciplina:** Listagem e filtragem de questões por disciplina.
* **Edição em Modal:** Correção rápida de enunciados, opções (A a E), gabarito e comentários explicativos.
* **Exclusão Segura e Limpeza Geral:** Exclusão individual com confirmação ou purga completa dos dados de um banco mantendo sua estrutura.

### 6. Exportação Flexível para Plataformas EaD
* **Moodle GIFT:** Formato texto leve com escape de caracteres reservados, gabarito e feedbacks integrados.
* **Moodle XML:** Padrão com blocos CDATA para importação direta no Banco de Questões do Moodle.
* **Google Docs:** Geração direta de documento formatado com cabeçalhos, enumerações e gabaritos, ideal para revisão colaborativa ou impressão.
