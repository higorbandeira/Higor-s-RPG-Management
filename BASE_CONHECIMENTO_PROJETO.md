# Base de Conhecimento do Projeto (Higor)

## Objetivo do MVP
Construir uma SPA web com:
- Login por **nickname + senha**
- Autorização por roles: **USER** e **ADMIN**
- USER acessa **/dashboard** (tabuleiro 2D em tempo real no futuro)
- ADMIN acessa **/admin/users** (CRUD de usuários)
- Upload de assets (mapas/avatares) por USER, visíveis para todos

## Decisões de Arquitetura
- **Frontend**: React + React Router (SPA)
- **Backend**: FastAPI (Python)
- **DB**: PostgreSQL
- **Monorepo**: `apps/api` + `apps/web` + `infra/terraform`
- Deploy: containers (Docker) e infraestrutura com Terraform (template)

## Regras de Autenticação & Autorização
- Login via `/api/auth/login` retorna:
  - `accessToken` (JWT no client)
  - `refresh_token` em **cookie HttpOnly**
- Refresh: `/api/auth/refresh` lê cookie e retorna novo `accessToken`
- `refresh_token` é armazenado no banco **como hash (sha256)**
- `withCredentials: true` no client para enviar cookie

### Roles
- **ADMIN**
  - Acessa somente painel de administração
  - CRUD de usuários (criar/editar/desativar/reset senha)
  - **ADMIN não cria outro ADMIN** (apenas USER)

- **USER**
  - Acessa `/dashboard`
  - Pode fazer upload de assets (MAP/AVATAR)

## Nickname
- Nickname é **livre** (pode conter espaços e caracteres especiais)
- Validação: **não permite vazio** ou somente espaços
- Unicidade via `nickname_norm`:
  - trim
  - collapse de espaços múltiplos
  - lowercase

## Upload de Assets
- Storage: **local no servidor** (pasta `apps/api/storage/uploads`)
- Tipos permitidos: `image/png`, `image/jpeg`, `image/webp`
- Limite de tamanho: **sem limite inicialmente** (pode ser adicionado depois)

## Rotas Frontend
- `/login`
- `/dashboard` (USER)
- `/admin/users` (ADMIN)
- `/admin/users/:id` (ADMIN)
- `/(root)` redireciona por role

## Bootstrap do ADMIN
- Estratégia: ENV var no startup
- Comportamento:
  - ENV=dev: se faltar nickname/senha ou nickname inválido/conflitante → log warning e sobe sem criar admin
  - ENV=prod: se faltar nickname/senha ou nickname inválido/conflitante → falha e aplicação não sobe

## Próximos Passos Prioritários
1. Criar telas mínimas (Login, Dashboard, Admin Users, Edit User)
2. Validar fluxo completo: bootstrap admin → login → redirect por role
3. Garantir CRUD funcional de usuários via painel admin
4. Implementar upload de assets no dashboard (UI simples)
5. Só então iniciar implementação real do grid 2D
