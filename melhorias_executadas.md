# Melhorias executadas

## Lista de melhorias aplicadas
1. **Logout visível em telas de administração**: adicionamos botão de sair no topo das páginas de lista e edição de usuários para reduzir o caminho de saída e melhorar a segurança percebida.
2. **Header com ação primária clara**: o cabeçalho agora alinha título, descrição e ação (logout) para melhorar a leitura e o fluxo visual.
3. **Consistência de botões**: reutilizamos o estilo “ghost” do botão para ações secundárias, mantendo coerência visual nas telas admin.
4. **Dashboard em tela cheia com ações flutuantes**: o campo 2D ocupa toda a viewport e as ações ficam em botões flutuantes, reduzindo distrações.
5. **Popup central de ações**: mapas e avatares agora são gerenciados em um modal com miniaturas e upload integrado.

## Onde foi aplicado
- `apps/web/src/features/admin/pages/UsersListPage.tsx`
- `apps/web/src/features/admin/pages/UserEditPage.tsx`
- `apps/web/src/features/dashboard/pages/DashboardPage.tsx`
