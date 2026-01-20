# Higor - Central de Módulos IA (React + FastAPI)

## Visão geral
Este repositório é a central de módulos que compartilham um **login único** e concentram dashboards e sistemas específicos, com evolução contínua apoiada por IA.

## O que já está pronto
- Login por **nickname + senha** (único para todos os módulos)
- Roles: **USER** e **ADMIN**
- Admin: lista/cria USER, edita nickname, ativa/inativa, reseta senha
- USER: Dashboard MVP (placeholder do tabuleiro) + Upload de assets (MAP/AVATAR) e lista (visível a todos)
- Refresh token em cookie HttpOnly, armazenado como hash no Postgres
- `nickname_norm` para unicidade (trim + collapse espaços + lowercase)
- Docker Compose local e template de deploy via Terraform (AWS EC2 exemplo)

## Atenção (pendências funcionais)
- O login ainda **não direciona** o usuário para o dashboard correto do módulo com base nas permissões.

## Módulos
- **apps/web**: Dashboard principal (atualmente, o módulo de campo grid para administrar partidas de RPG).
- **apps/api**: API e autenticação compartilhada.

## Documentação por módulo
A documentação geral e os direcionadores de IA ficam no módulo principal:
- `apps/web/docs/`

## Rodar local (Docker)
```bash
docker compose up --build
```
Acesse:
- Web: http://localhost:3000
- API: http://localhost:8000 (Nginx usa /api)

Bootstrap do ADMIN (dev) vem no `docker-compose.yml`:
- Nickname: `Admin Master`
- Senha: `admin123`

## Rotas
- `/login`
- `/dashboard` (USER)
- `/admin/users` (ADMIN)
- `/admin/users/:id` (ADMIN)

## API (prefixo /api)
- POST `/api/auth/login`
- POST `/api/auth/refresh`
- GET  `/api/auth/me`
- POST `/api/auth/logout`
- GET  `/api/admin/users`
- POST `/api/admin/users`
- GET  `/api/admin/users/{id}`
- PATCH `/api/admin/users/{id}`
- GET  `/api/assets`
- POST `/api/assets/upload`

## Próximos passos
1) Implementar redirecionamento por permissão para o módulo correto
2) Melhorar Dashboard MVP para começar o grid 2D (canvas/drag/drop)
3) Modelar "mapa ativo" e "avatares no mapa" (posição/escala/camadas)
4) Websocket (tempo real) para sincronizar o tabuleiro
