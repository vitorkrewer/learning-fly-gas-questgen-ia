# -*- coding: utf-8 -*-
"""
Script para gerar mensagens de commit usando a API do Google Gemini.

Este script captura as alterações preparadas (staged) no Git, as envia para a
API do Gemini e gera uma mensagem de commit formatada seguindo o padrão
Conventional Commits.

Pré-requisitos:
- Git inicializado no repositório.
- Python 3.x instalado.
- Pacotes Python: `google-genai`, `python-dotenv`
  (instale com: pip install google-genai python-dotenv)
- Um arquivo .env em tools/ contendo a GEMINI_API_KEY.

Uso:
1. Faça suas alterações no código.
2. Execute o script: `python3 tools/generate_commit.py`
3. Revise a mensagem e confirme para criar o commit.
"""
import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai


PROJECT_ROOT = Path(__file__).resolve().parent.parent
MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024
MAX_JSON_FILE_BYTES = 256 * 1024

SOURCE_EXTENSIONS = {
    ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html",
    ".java", ".js", ".jsx", ".kt", ".md", ".mjs", ".php", ".ps1", ".py",
    ".rb", ".rs", ".scss", ".sh", ".sql", ".swift", ".toml", ".ts", ".tsx",
    ".vue", ".xml", ".yaml", ".yml",
}
DATABASE_AND_DATA_EXTENSIONS = {
    ".7z", ".arrow", ".avro", ".bak", ".csv", ".db", ".duckdb", ".gz",
    ".parquet", ".sqlite", ".sqlite3", ".tar", ".xls", ".xlsx", ".zip",
}
EXCLUDED_DIRECTORY_NAMES = {
    ".git", ".venv", "__pycache__", "build", "cache", "converted", "dist",
    "exportados", "graphify-out", "node_modules", "venv",
}
KNOWN_CONFIG_FILES = {
    ".claspignore", ".dockerignore", ".editorconfig", ".gitignore",
    "AGENTS.md", "Dockerfile", "Makefile", "appsscript.json", "package.json",
    "pyproject.toml", "requirements.txt", "tsconfig.json",
}


def _configure_console_encoding() -> None:
    """Evita falhas ao imprimir mensagens Unicode em consoles Windows legados."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")


_configure_console_encoding()


def _git_paths(*args: str) -> list[str]:
    """Executa um comando Git que retorna caminhos separados por NUL."""
    result = subprocess.run(
        ["git", *args],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=True,
        encoding="utf-8",
    )
    return [path for path in result.stdout.split("\0") if path]


def _staged_file_size(relative_path: str) -> int | None:
    """Obtém o tamanho do conteúdo staged sem materializá-lo no processo."""
    try:
        result = subprocess.run(
            ["git", "cat-file", "-s", f":{relative_path}"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
            encoding="utf-8",
        )
        return int(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return None


def _is_commit_relevant(relative_path: str, *, staged: bool = False) -> bool:
    """Decide se um arquivo deve ser preparado, analisado e incluído no commit."""
    normalized_path = relative_path.replace("\\", "/")
    path = Path(normalized_path)
    path_parts = set(path.parts[:-1])
    file_name = path.name
    suffix = path.suffix.lower()

    if path_parts & EXCLUDED_DIRECTORY_NAMES:
        return False
    if suffix in DATABASE_AND_DATA_EXTENSIONS:
        return False

    absolute_path = PROJECT_ROOT / path
    file_size = _staged_file_size(normalized_path) if staged else (
        absolute_path.stat().st_size if absolute_path.exists() else None
    )

    if suffix == ".json":
        if file_name.lower().startswith(("cache_", "export_")):
            return False
        return file_size is None or file_size <= MAX_JSON_FILE_BYTES

    if file_name in KNOWN_CONFIG_FILES:
        return file_size is None or file_size <= MAX_SOURCE_FILE_BYTES
    if suffix not in SOURCE_EXTENSIONS:
        return False
    return file_size is None or file_size <= MAX_SOURCE_FILE_BYTES


def _run_git_for_paths(command: list[str], paths: list[str]) -> None:
    """Executa comandos Git em lotes para evitar o limite de linha do Windows."""
    for index in range(0, len(paths), 100):
        subprocess.run(
            ["git", *command, "--", *paths[index:index + 100]],
            cwd=PROJECT_ROOT,
            check=True,
        )


def _print_skipped_files(paths: list[str], action: str) -> None:
    if not paths:
        return
    print(f"   - {len(paths)} arquivo(s) {action} por serem dados, binários ou artefatos grandes:")
    for path in paths[:20]:
        print(f"     • {path}")
    if len(paths) > 20:
        print(f"     • ... e mais {len(paths) - 20}")


def get_staged_diff():
    """
    Captura o diff das alterações que estão em 'staging area' (adicionadas com git add).
    """
    try:
        staged_paths = _git_paths("diff", "--staged", "--name-only", "-z")
        relevant_paths = [path for path in staged_paths if _is_commit_relevant(path, staged=True)]
        skipped_paths = [path for path in staged_paths if path not in relevant_paths]
        _print_skipped_files(skipped_paths, "ignorados na leitura do diff")

        diff_parts = []
        for path in relevant_paths:
            result = subprocess.run(
                ["git", "diff", "--staged", "--no-color", "--", path],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                check=True,
                encoding="utf-8",
            )
            if result.stdout:
                diff_parts.append(result.stdout)

        diff = "".join(diff_parts)
        if not diff:
            print("⚠️  Nenhuma alteração de código/configuração encontrada no stage.")
            return None
        return diff
    except FileNotFoundError:
        print("❌ Erro: O Git não foi encontrado. Certifique-se de que ele está instalado e no PATH do sistema.")
        return None
    except subprocess.CalledProcessError:
        print("❌ Erro: Este diretório não parece ser um repositório Git.")
        return None

# Limite conservador de caracteres por lote (~800k tokens ≈ ~3.2M chars, mas usamos
# 3_000_000 chars como margem de segurança para evitar o erro 400 INVALID_ARGUMENT).
_MAX_CHUNK_CHARS = 3_000_000


def _split_diff_into_chunks(diff: str, max_chars: int = _MAX_CHUNK_CHARS) -> list[str]:
    """
    Divide o diff em lotes menores respeitando os limites de arquivo (--- a/ markers).
    Cada lote tem no máximo `max_chars` caracteres.
    """
    # Separa por arquivo: cada bloco começa com 'diff --git'
    import re
    file_blocks = re.split(r'(?=^diff --git )', diff, flags=re.MULTILINE)
    file_blocks = [b for b in file_blocks if b.strip()]

    chunks: list[str] = []
    current_chunk = ""

    for block in file_blocks:
        # Se um único bloco de arquivo já é maior que o limite, divide por linhas
        if len(block) > max_chars:
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            lines = block.splitlines(keepends=True)
            part = ""
            for line in lines:
                if len(part) + len(line) > max_chars:
                    if part:
                        chunks.append(part)
                    part = line
                else:
                    part += line
            if part:
                chunks.append(part)
        elif len(current_chunk) + len(block) > max_chars:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = block
        else:
            current_chunk += block

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def _summarize_chunk(client, chunk: str, index: int, total: int) -> str | None:
    """
    Envia um lote de diff para o Gemini e retorna um resumo classificado por tipo de mudança.
    """
    print(f"   📦 Processando lote {index}/{total} ({len(chunk):,} caracteres)...")
    prompt = f"""
    Você é um expert em Git e Conventional Commits. Analise o trecho de diff abaixo
    (parte {index} de {total}) e produza um **resumo técnico classificado** em Português do Brasil.

    **Para cada arquivo modificado, classifique a mudança com o tipo correto:**
    - `feat`     → novo recurso ou funcionalidade
    - `fix`      → correção de bug ou comportamento incorreto
    - `refactor` → reestruturação de código sem mudar comportamento externo
    - `docs`     → apenas documentação
    - `style`    → formatação, espaçamento, sem lógica alterada
    - `test`     → adição ou correção de testes
    - `chore`    → build, config, dependências, scripts auxiliares

    **Formato esperado da resposta (siga rigorosamente):**
    [tipo] `caminho/do/arquivo` — descrição curta do que foi alterado e por quê

    Exemplo:
    [feat] `src/api/users.js` — adicionada rota POST /users para criação de contas
    [fix] `src/auth/token.js` — corrigida expiração incorreta do JWT em ambiente de produção
    [refactor] `src/db/connection.js` — extraída lógica de pool de conexões para módulo próprio

    **Não gere a mensagem de commit final.** Apenas liste os itens classificados.

    ```diff
    {chunk}
    ```

    **Itens classificados:**
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt
        )
        return response.text.strip() if response.text else None
    except Exception as e:
        print(f"   ❌ Erro no lote {index}/{total}: {e}")
        return None


def _consolidate_summaries(client, summaries: list[str]) -> str | None:
    """
    Recebe os itens classificados de todos os lotes e gera a mensagem de commit final consolidada,
    com múltiplos tipos no título e corpo segmentado por seção.
    """
    print("   🔗 Consolidando resumos e gerando mensagem de commit final...")
    joined = "\n".join(summaries)
    prompt = f"""
    Você é um expert em Git e em escrever mensagens de commit seguindo o padrão Conventional Commits.
    Abaixo está uma lista de mudanças já classificadas por tipo (feat, fix, refactor, etc.),
    provenientes de diferentes arquivos do mesmo commit.

    Gere UMA ÚNICA mensagem de commit final em Português do Brasil seguindo estas regras:

    **1. Título (Header) — regras estritas:**
    - Se houver apenas UM tipo distinto: use o formato padrão `tipo(escopo): resumo geral`.
    - Se houver MÚLTIPLOS tipos distintos: liste todos separados por ` & ` em ordem de relevância,
      seguidos de um escopo opcional e um resumo geral que englobe tudo.
      Exemplo com múltiplos tipos: `feat & fix & refactor(api): melhorias gerais no módulo de usuários`
    - O resumo deve ser curto (máx. 50 caracteres), em minúsculas, sem ponto final.

    **2. Corpo (Body) — segmentado por tipo e área:**
    - Após uma linha em branco, organize as alterações em **seções por tipo**.
    - Cada seção começa com um cabeçalho em maiúsculas: `FEAT:`, `FIX:`, `REFACTOR:`, etc.
    - **Separação Frontend/Backend**: Dentro de cada seção, crie divisões explícitas para `Frontend:` e `Backend:` (caso se aplique).
    - Dentro dessas subdivisões, use bullet points (-) listando as mudanças.
    - Inclua o arquivo afetado quando relevante.
    - **Para Frontend**: Especifique detalhes e impactos na interface do usuário (UI), interações (UX), estilos e comportamento no cliente.
    - **Para Backend**: Especifique detalhes e impactos nas regras de negócio, consultas ao banco de dados (SQL/queries), integrações e APIs.
    - Explique o **motivo** e o **contexto** de cada alteração, não apenas o que mudou.

    **3. Não repita os itens brutos da entrada.** Apenas a mensagem de commit formatada.

    **Exemplo de saída esperada:**
    ```
    feat & fix(auth): adiciona oauth e corrige expiração de token

    FEAT:
    Backend:
    - `src/auth/oauth.js` — implementado fluxo OAuth 2.0 com Google para simplificar o login (nova rota da API).
    Frontend:
    - `src/views/login.html` — adicionado botão de login social na interface, melhorando a experiência do usuário.

    FIX:
    Backend:
    - `src/auth/token.js` — corrigida expiração incorreta do JWT em produção que causava logout inesperado nas requisições.
    ```

    **Itens classificados para consolidar:**
    {joined}

    **Mensagem de Commit Final:**
    """
    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt
        )
        return response.text.strip() if response.text else None
    except Exception as e:
        print(f"❌ Erro ao consolidar resumos: {e}")
        return None


def generate_commit_message(diff, api_key):
    """
    Envia o diff para a API do Gemini e gera a mensagem de commit.
    Caso o diff exceda o limite de tokens, divide em lotes e consolida no final.
    """
    if not api_key:
        print("❌ Erro: A chave 'GEMINI_API_KEY' não foi encontrada no arquivo tools/.env.")
        sys.exit(1)

    print("🧠 Conectando à API do Gemini para gerar a mensagem de commit...")
    client = genai.Client(api_key=api_key)

    chunks = _split_diff_into_chunks(diff)

    if len(chunks) == 1:
        # Caminho feliz: diff cabe em um único lote
        prompt = f"""
        Você é um expert em Git e em escrever mensagens de commit seguindo o padrão Conventional Commits.
        Analise o diff abaixo e gere uma mensagem de commit clara e informativa em Português do Brasil.

        **Classificação por arquivo:**
        Para cada arquivo modificado, identifique internamente o tipo da mudança:
        - `feat`     → novo recurso ou funcionalidade
        - `fix`      → correção de bug ou comportamento incorreto
        - `refactor` → reestruturação sem mudança de comportamento externo
        - `docs`     → apenas documentação
        - `style`    → formatação, espaçamento, sem lógica alterada
        - `test`     → adição ou correção de testes
        - `chore`    → build, config, dependências, scripts auxiliares

        **Regras para o Título (Header):**
        - Se todas as mudanças forem do mesmo tipo: use `tipo(escopo): resumo`.
        - Se houver múltiplos tipos distintos: liste todos separados por ` & ` em ordem de relevância.
          Exemplo: `feat & fix & refactor(api): melhorias no módulo de usuários`
        - Escopo é opcional. Resumo: máx. 50 caracteres, minúsculas, sem ponto final.

        **Regras para o Corpo (Body):**
        - Após uma linha em branco, organize as alterações em **seções por tipo**.
        - Cada seção começa com o cabeçalho em maiúsculas: `FEAT:`, `FIX:`, `REFACTOR:`, etc.
        - **Separação Frontend/Backend**: Dentro de cada seção, crie divisões explícitas para `Frontend:` e `Backend:` (caso se aplique).
        - Dentro dessas subdivisões, use bullet points (-) listando as mudanças com o arquivo afetado e a descrição contextual.
        - **Para Frontend**: Especifique detalhes e impactos na interface do usuário (UI), interações (UX), estilos e comportamento no cliente.
        - **Para Backend**: Especifique detalhes e impactos nas regras de negócio, consultas ao banco de dados (SQL/queries), integrações e APIs.
        - Explique o **motivo** e o **impacto** de cada mudança, não apenas o que foi feito.
        - Omita seções de tipos que não ocorreram.

        **Exemplo de saída:**
        ```
        feat & fix(auth): adiciona oauth e corrige expiração de token

        FEAT:
        Backend:
        - `src/auth/oauth.js` — implementado fluxo OAuth 2.0 com Google para simplificar o login (nova rota da API).
        Frontend:
        - `src/views/login.html` — adicionado botão de login social na interface, melhorando a experiência do usuário.

        FIX:
        Backend:
        - `src/auth/token.js` — corrigida expiração incorreta do JWT em produção que causava logout inesperado nas requisições.
        ```

        **Não inclua o diff no output.** Apenas a mensagem formatada.

        **Diff para analisar:**
        ```diff
        {diff}
        ```

        **Mensagem de Commit Gerada:**
        """
        try:
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt
            )
            return response.text.strip() if response.text else None
        except Exception as e:
            print(f"❌ Ocorreu um erro ao chamar a API do Gemini: {e}")
            return None
    else:
        # Diff grande: processa em lotes e consolida
        print(f"⚠️  Diff muito grande — dividido em {len(chunks)} lotes para processamento.")
        summaries = []
        for i, chunk in enumerate(chunks, start=1):
            summary = _summarize_chunk(client, chunk, i, len(chunks))
            if summary:
                summaries.append(summary)
            else:
                print(f"   ⚠️  Lote {i} falhou, continuando com os demais...")

        if not summaries:
            print("❌ Todos os lotes falharam. Nenhuma mensagem de commit gerada.")
            return None

        return _consolidate_summaries(client, summaries)

def find_and_stage_changes():
    """
    Detecta arquivos modificados ou novos (untracked) e os adiciona ao stage.
    """
    print("🔍 Detectando alterações no repositório...")
    try:
        tracked_changes = _git_paths("diff", "HEAD", "--name-only", "-z")
        untracked_changes = _git_paths("ls-files", "--others", "--exclude-standard", "-z")
        candidate_paths = list(dict.fromkeys(tracked_changes + untracked_changes))

        if not candidate_paths:
            print("✅ Nenhum arquivo modificado ou novo encontrado.")
            return False

        relevant_paths = [path for path in candidate_paths if _is_commit_relevant(path)]
        skipped_paths = [path for path in candidate_paths if path not in relevant_paths]
        _print_skipped_files(skipped_paths, "excluídos do stage")

        if relevant_paths:
            _run_git_for_paths(["add"], relevant_paths)
            print(f"   - {len(relevant_paths)} arquivo(s) de código/configuração adicionados ao stage.")

        staged_paths = _git_paths("diff", "--staged", "--name-only", "-z")
        irrelevant_staged = [path for path in staged_paths if not _is_commit_relevant(path, staged=True)]
        if irrelevant_staged:
            _run_git_for_paths(["restore", "--staged"], irrelevant_staged)
            _print_skipped_files(irrelevant_staged, "removidos do stage")

        return bool(relevant_paths)

    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Erro ao interagir com o Git. Verifique se é um repositório válido.")
        return False


def main():
    """Função principal do script."""
    # Define o diretório de trabalho como a raiz do projeto (um nível acima de /tools)
    script_dir = Path(__file__).parent.resolve()
    project_root = script_dir.parent
    os.chdir(project_root)

    # Carrega .env de tools/ — é onde o arquivo realmente está
    env_path = script_dir / '.env'
    if not env_path.exists():
        print(f"⚠️  Arquivo .env não encontrado em {env_path}")
        print("   Crie o arquivo tools/.env com: GEMINI_API_KEY=sua_chave_aqui")
    load_dotenv(dotenv_path=env_path)

    # Passo 1: Detectar e preparar as mudanças automaticamente
    if not find_and_stage_changes():
        # Se não houver mudanças, não há o que fazer.
        # Mas ainda checamos o stage, caso o usuário tenha adicionado algo manualmente antes.
        pass

    api_key = os.getenv("GEMINI_API_KEY")
    diff = get_staged_diff()

    if diff:
        commit_message = generate_commit_message(diff, api_key)

        if commit_message:
            print("\n" + "="*50)
            print("✅ Commit Sugerido:")
            print("="*50)
            print(commit_message)
            print("="*50 + "\n")

            try:
                answer = input("Deseja usar esta mensagem para o commit? (s/N): ").lower()
                if answer == 's':
                    # Usar -F - para passar a mensagem multi-linha via stdin, é mais seguro
                    subprocess.run(
                        ["git", "commit", "-F", "-"],
                        input=commit_message,
                        text=True,
                        check=True,
                        encoding='utf-8'
                    )
                    print("\n✅ Commit realizado com sucesso!")
                else:
                    print("\nCommit cancelado pelo usuário.")
            except subprocess.CalledProcessError as e:
                print(f"\n❌ Erro ao tentar commitar: {e}")
            except (KeyboardInterrupt, EOFError):
                 print("\n\nOperação cancelada.")


if __name__ == "__main__":
    main()
