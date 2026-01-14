# BASE_CONHECIMENTO_PROJETO.md
Base de conhecimento viva do projeto.  
Registra decisões, regras de negócio, arquitetura, contratos de API, estrutura do repositório e próximos passos.

---

## 1. Visão Geral do Projeto

**Descrição resumida:**  
Aplicação web (SPA) com autenticação/autorização e dois fluxos principais:
- **USER**: acessa um **dashboard** com um **tabuleiro 2D em grid** (tempo real futuramente).
- **ADMIN**: acessa um **painel administrativo** para **criar/editar/listar** usuários (ADMIN não acessa o dashboard).

**Objetivo final do produto:**  
Evoluir para um tabuleiro 2D colaborativo que permite:
- Upload e carregamento de imagens (mapas e avatares)
- Inserção e movimentação de avatares no grid (drag & drop)
- Rolagem de dados
- Eventos em tempo real (fase futura)

---

## 2. Decisões Confirmadas (Jan/2026)

### 2.1 Tipo de aplicação
- SPA (Single Page Application)

### 2.2 Stack
- **Frontend**: React (preferido para melhor “desenho” do produto, e compatibilidade futura com grid/canvas/drag)
- **Backend**: FastAPI (Python)
- **Banco**: PostgreSQL
- **Monorepo**: frontend + backend no mesmo repositório
- **Infra**: Terraform (projeto único)

### 2.3 Autenticação
- Login por **nickname + senha**
- Sem login social (Google/Discord) por enquanto
- Sem auto-cadastro: **somente ADMIN cria e edita usuários**
- Estratégia recomendada:
  - Access token JWT curto (ex.: 15 minutos) no frontend (em memória)
  - Refresh token em cookie HttpOnly (para renovar sessão)

### 2.4 Roles e Rotas
- Roles existentes: **USER** e **ADMIN**.

**USER**
- Acessa apenas `/dashboard`
- Não acessa rotas administrativas

**ADMIN**
- Acessa apenas `/admin/*`
- Não acessa dashboard do tabuleiro

### 2.5 Tabuleiro 2D (futuro próximo)
- Grid fixo + drag & drop
- Mapas adicionados como imagem de fundo
- Avatares com “tamanho” (ocupam N quadrados do grid)
- A imagem deve se ajustar ao retângulo correspondente ao tamanho do avatar

### 2.6 Assets (mapas e avatares)
- Qualquer USER pode subir assets
- Assets são globais (todos veem o que for enviado por qualquer usuário)

---

## 3. Regras de Negócio

### 3.1 Criação e edição de usuários
- Não existe endpoint de auto-cadastro para usuários
- ADMIN pode:
  - Criar USER
  - Editar nickname do USER
  - Alterar senha do USER diretamente na tela de edição
  - Ativar/Desativar USER (recomendado)

### 3.2 Nickname
- Nickname é “livre” (pode conter espaços, emojis etc.)
- Será armazenado o valor original (`nickname`)
- Será armazenado um valor normalizado (`nickname_norm`) para garantir unicidade

> Decisão pendente: permitir nickname vazio ou só espaços (recomendado: proibir).

---

## 4. Contrato de API (Request/Response)

### 4.1 Auth

#### POST `/auth/login`
**Request**
```json
{ "nickname": "string", "password": "string" }

## Bootstrap do ADMIN (Jan/2026)
- Estratégia escolhida: opção 3 (env var no startup)
- No startup do FastAPI:
  - Se não existir nenhum usuário com role=ADMIN, criar o admin padrão com:
    - BOOTSTRAP_ADMIN_NICKNAME
    - BOOTSTRAP_ADMIN_PASSWORD
  - Processo idempotente (se já existe ADMIN, não altera nada)

## Bootstrap do ADMIN (Jan/2026)
- Estratégia: ENV var no startup (opção 3)
- Comportamento:
  - ENV=dev: se faltar nickname/senha ou nickname inválido/conflitante → log warning e sobe sem criar admin
  - ENV=prod: se faltar nickname/senha ou nickname inválido/conflitante → falha e aplicação não sobe
