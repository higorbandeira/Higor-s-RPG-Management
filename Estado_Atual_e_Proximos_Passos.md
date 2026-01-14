# Estado Atual do Projeto e Próximos Passos

## Resumo do Estado Atual

- **Estrutura geral**: Projeto contendo backend e frontend em `apps/`.
- **Backend (API)**: pasta `apps/api/app` com:
  - `main.py` — ponto de entrada.
  - `core/` — bootstrap, configuração e dependências (`bootstrap.py`, `config.py`, `deps.py`, `security.py`).
  - `db/migrations/versions/0001_init.py` — migração inicial presente.
  - `db/models/` — modelos `user.py`, `asset.py`, `refresh_token.py`.
  - `routes/` — endpoints e componentes relacionados (`admin_users.py`, `assets.py`, `auth.py`) e alguns arquivos TSX (`AppRouter.tsx`, `ProtectedRoute.tsx`).
- **Frontend (Web)**: pasta `apps/web/src` com:
  - `app/providers/AuthProvider.tsx` — provedor de autenticação.
  - `app/routes/ProtectedRoute.tsx` — componente de proteção de rotas.
  - `shared/http.ts` — utilitário HTTP compartilhado.
- **Arquivo raiz**: `package.json` presente; há também `Base_Conhecimento.md` com orientações do projeto.
- **Estado de dependências**: terminal mostrou execução de `npm instal react-router-dom` recentemente.

## Próximos Passos (seguindo Base_Conhecimento.md)

- **Configuração**: Validar e consolidar `.env` e variáveis de ambiente para backend e frontend.
- **Banco de Dados**: Rodar migrações e verificar modelos; aplicar seeds se necessário.
- **Autenticação**: Revisar fluxo de `refresh_token` (modelo/rota), endpoints de `auth.py` e integração com `AuthProvider` no frontend.
- **Proteção de Rotas**: Garantir que `ProtectedRoute.tsx` (front) e `ProtectedRoute.tsx` (API/rotas) estejam coerentes e testados.
- **API Endpoints**: Completar e documentar endpoints administrativos (`admin_users`) e de `assets` conforme necessidades do Base_Conhecimento.md.
- **Frontend Routing**: Finalizar `AppRouter.tsx` e integrar `react-router-dom` (verificar versão instalada e rotas protegidas).
- **Testes**: Adicionar testes unitários e de integração para autenticação, rotas e lógica crítica.
- **Documentação**: Atualizar `Base_Conhecimento.md` e criar README com instruções de setup (instalação, variáveis, migrações, execução local).
- **CI/CD**: Configurar pipeline básico para lint, testes e deploy (opcional: dockerização).

---