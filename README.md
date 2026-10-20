<p align="center">
  <img src="docs/images/learningfly-icon.png" alt="Logo do LearningFly" width="200">
</p>

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat-square&logo=google&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat-square&logo=google-sheets&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white)
 

# LearningFly

LearningFly é uma série de ferramentas desenvolvidas para otimizar processos educacionais de professores, coordenadores e estudantes utilizando recursos de inteligência artificial e tecnologias da web criadas com Google Apps Script — tudo integrado ao ecossistema Google Workspace.

![Status do Projeto](https://img.shields.io/badge/Status-Ativo-brightgreen)


## 🚀 Sobre o Projeto

O **LearningFly** é uma aplicação web desenvolvida com Google Apps Script, criada para auxiliar na gestão inteligente de cursos, materiais didáticos e fluxos educacionais. A ferramenta integra-se ao Google Workspace (Drive, Planilhas, Documentos) para tornar processos pedagógicos mais organizados, eficientes e automatizados, unindo tecnologia, design instrucional e pensamento sistêmico para resolver desafios reais na educação digital.

## QuestGen IA

O **QuestGen IA**, projeto integrante do LearningFly, é uma ferramenta poderosa desenvolvida para educadores, designers instrucionais e instituições de ensino que buscam otimizar a criação de avaliações e bancos de questões. Utilizando a inteligência artificial do Google Gemini, o QuestGen IA transforma conteúdo de estudo em questões de múltipla escolha de alta qualidade, com alternativas plausíveis e comentários pedagógicos, tudo isso integrado ao ecossistema Google Workspace.

<p align="center">
  <img src="/docs/images/login-screen.png" alt="Screenshot Login" width="800">
</p>


## Funcionalidades Principais

*   **Geração Multimodal com IA:** Alimentado pelo Google Gemini (com fallback automático de modelos e suporte a Structured Outputs JSON), o QuestGen IA lê tanto **Google Docs** quanto arquivos **PDF** no Drive e gera questões complexas e contextualizadas.
*   **Cadeia Inteligente de Fallback de Modelos:** Alterna automaticamente entre modelos de última geração e alta estabilidade (`gemini-3.8-flash` ➔ `gemini-3.5-flash` ➔ `gemini-2.5-pro` ➔ `gemini-2.5-flash` ➔ `gemini-1.5-flash`) garantindo alta disponibilidade.
*   **Gerenciamento de Bancos de Dados:** Crie e gerencie múltiplos bancos de questões, cada um armazenado em uma Planilha Google separada com controle de concorrência (`LockService`).
*   **Autenticação Segura:** Acesso controlado por usuário e chave, com sessões baseadas em tokens para garantir a segurança dos dados.
*   **Interface Intuitiva & SPA:** Dashboard informativo, suporte a temas Claro/Escuro (*Dark/Light mode*), design responsivo e modais interativos.
*   **Administração de Questões:** Visualize, edite, exclua e organize questões por disciplina diretamente na interface.
*   **Exportação Flexível:** Exporte suas questões para diversos formatos: **Moodle GIFT**, **Moodle XML** e **Google Docs**, para integração direta com AVAs ou revisão offline.
*   **Configuração Simplificada:** Implante o aplicativo web diretamente no editor do Google Apps Script em sua conta Google, sem dependência de CLASP ou servidores externos.

<p align="center">
  <img src="/docs/images/generate-questions-screen.png" alt="Screenshot Gerador" width="800">
</p>


## Para Quem É o QuestGen IA?

*   **Educadores e Professores:** Reduza o tempo gasto na criação de provas e exercícios.
*   **Designers Instrucionais:** Desenvolva rapidamente materiais avaliativos para cursos online.
*   **Instituições de Ensino:** Padronize e escale a produção de conteúdo avaliativo com eficiência.
*   **Estudantes:** Crie seus próprios bancos de questões para seus materiais de estudo.

## Como Começar

Para instalar e configurar sua própria instância do QuestGen IA, siga o [Guia de Instalação e Configuração](docs/setup.md).

## Documentação

Explore a documentação completa para entender a arquitetura, funcionalidades e como aproveitar ao máximo o QuestGen IA:

*   [Visão Geral e Funcionalidades](docs/features.md)
*   [Guia de Instalação e Configuração](docs/setup.md)
*   [Arquitetura do Sistema](docs/architecture.md)
*   [Estrutura do Banco de Dados](docs/database.md)
*   [API do Back-end (Funções do Servidor)](docs/backend_api.md)
*   [Manifesto de Arquivos do Projeto](docs/manifest.md)

## Contribuição

Este projeto aceita contribuições. Se você tiver ideias para novas funcionalidades, melhorias ou encontrar algum bug, sinta-se à vontade para abrir uma *issue*.


## 📄 Licença

[![Licença: CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

Este projeto está licenciado sob os termos da [Creative Commons Atribuição-NãoComercial 4.0 Internacional (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

Você pode usá-lo, modificá-lo e compartilhá-lo **para fins não comerciais**, desde que com a devida atribuição a **Vitor Krewer**.  
Para qualquer uso comercial, entre em contato diretamente.

---

## Contato

Para dúvidas, sugestões ou suporte, entre em contato através do repositório do GitHub.

[LinkedIn](https://www.linkedin.com/in/vitorkrewer) • [Email](mailto:vitormkrewer@gmail.com)
