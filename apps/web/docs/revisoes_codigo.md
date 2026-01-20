# Revisões de código (estado atual)

## Pontos observados
- O dashboard estava com placeholder visual sem interação de grid ou posicionamento de avatares.
- O upload de assets já existe e é reutilizável para mapas e avatares.
- Não havia seleção de mapa ou gerenciamento visual de avatares no tabuleiro.

## Melhorias iniciadas (roadmap)
- Criação de tabuleiro 2D simples com grid visível.
- Seleção de mapa de fundo a partir dos assets do tipo MAP.
- Adição de avatares e movimentação por arraste e setas.

## Próximos incrementos sugeridos
- Persistir a posição de avatares e mapa ativo no backend.
- Permitir múltiplos mapas e camadas (avatares/objetos).
- Sincronização em tempo real (websocket) entre usuários.
