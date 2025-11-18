# Visão Geral e Funcionalidades
O QuestGen IA é uma ferramenta de produtividade educacional que visa reduzir drasticamente o tempo e o esforço necessários para criar avaliações de alta qualidade. A aplicação serve como uma ponte entre o conteúdo de estudo bruto e um banco de questões estruturado e pronto para uso em plataformas de e-learning.

## Público-Alvo
**Educadores e Professores:** Para criar rapidamente avaliações para suas turmas.

**Designers Instrucionais:** Para desenvolver materiais de e-learning e bancos de questões para cursos online.

**Instituições de Ensino:** Para padronizar e escalar a produção de conteúdo avaliativo.

## Lista de Funcionalidades
### 1. Autenticação e Segurança
**Login por Usuário e Chave:** Acesso à aplicação controlado por credenciais individuais.

**Sessão por Token:** Utilização de tokens de sessão temporários (CacheService) para autenticar as requisições, garantindo que apenas usuários logados possam realizar ações.

### 2. Geração de Conteúdo com IA
**Motor Gemini do Google:** Integração direta com a API do Gemini para processamento de linguagem natural e geração de conteúdo.

**Base em Google Docs:** Capacidade de ler o conteúdo de qualquer Documento Google fornecido como material base.

**Prompt de Engenharia:** Um prompt robusto e detalhado que instrui a IA a criar questões complexas, com alternativas plausíveis e comentários pedagógicos.

### 3. Gerenciamento de Bancos de Dados
**Sistema Multi-Banco:** O usuário pode criar e gerenciar múltiplos bancos de questões, cada um contido em sua própria Planilha Google.

**Configuração Centralizada:** Uma única Planilha Google (QuestGen AI - Configurações) gerencia o acesso a todos os outros bancos.

**Criação e Seleção Dinâmica:** A interface permite criar novos bancos e alternar entre os existentes de forma fluida.

### 4. Interface do Usuário (UI) e Experiência (UX)
**Dashboard Informativo:** Uma tela inicial que exibe estatísticas em tempo real sobre o banco de questões selecionado.

**Design Responsivo:** A interface se adapta a diferentes tamanhos de tela (desktop, tablet, mobile) graças ao Bootstrap 5.

**Sidebar Recolhível:** O menu lateral pode ser expandido ou recolhido para otimizar o espaço de tela.

**Feedback Visual:** Indicadores de carregamento (spinner) e alertas dinâmicos informam o usuário sobre o status das operações.

**Modais Interativos:** Todas as funcionalidades (configurações, exportação, ajuda) são acessadas através de modais, mantendo a interface limpa.

### 5. Administração de Questões
- **Visualização por Disciplina:** Capacidade de listar todas as questões pertencentes a uma disciplina específica.

- **Edição em Linha:** O usuário pode clicar em um botão "Editar" para abrir um modal e corrigir ou aprimorar o enunciado, as alternativas ou o gabarito de uma questão.

- **Exclusão Segura:** As questões podem ser excluídas individualmente, com uma confirmação para evitar ações acidentais.

- **Limpeza de Dados:** Opção para apagar todas as questões de um banco de dados, mantendo a estrutura da planilha.

### 6. Exportação de Dados
- **Moodle GIFT:** Exporta as questões no formato de texto simples GIFT, ideal para importação rápida no Moodle.

- **Moodle XML:** Gera um arquivo XML estruturado, compatível com o sistema de importação do Moodle, que preserva mais detalhes de formatação.

- **Google Docs:** Exporta as questões formatadas para um Documento Google, ideal para impressão ou revisão manual.