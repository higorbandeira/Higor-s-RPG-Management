# Higor - Monorepo (React + FastAPI)

## O que já está pronto
- Login por **nickname + senha**
- Roles: **USER** e **ADMIN**
- Redirect/Guard por role:
  - USER -> `/dashboard`
  - ADMIN -> `/admin/users`
- Admin: lista/cria USER, edita nickname, ativa/inativa, reseta senha
- USER: Dashboard MVP (placeholder do tabuleiro) + Upload de assets (MAP/AVATAR) e lista (visível a todos)
- Refresh token em cookie HttpOnly, armazenado como hash no Postgres
- `nickname_norm` para unicidade (trim + collapse espaços + lowercase)
- Docker Compose local e template de deploy via Terraform (AWS EC2 exemplo)

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
1) Melhorar Dashboard MVP para começar o grid 2D (canvas/drag/drop)
2) Modelar "mapa ativo" e "avatares no mapa" (posição/escala/camadas)
3) Websocket (tempo real) para sincronizar o tabuleiro
