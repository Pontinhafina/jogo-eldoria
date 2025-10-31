# Eldoria — Notas rápidas e roadmap de melhorias

Este repositório contém um jogo em HTML/JS (arquivo principal com lógica em um script embutido). Abaixo há instruções rápidas e um roadmap de melhorias priorizadas.

## Como rodar
1. Abra `index.html` no navegador (Chrome/Edge/Firefox). No Windows, um duplo-clique no arquivo deve funcionar.
2. Abra o DevTools (F12) para ver logs e erros.

Dica: para um fluxo de desenvolvimento melhor, instale um servidor local (ex.: `live-server` via npm) e rode na pasta do projeto.

## Quick wins (implementações de baixo risco)
- Garantir que o áudio só comece após interação do usuário (click/tap). Evita bloqueio do autoplay.
- Tornar `saveGame`/`loadGame` mais robustos (try/catch, validar schema). Adicionar feedback visual de "salvo".
- Corrigir a sincronização entre `baseAttributes`, `attributes` e equipáveis (usar apenas `recalculateFinalStats`).
- Mostrar mensagens de erro/aviso no UI (pequeno toast) ao invés de só console.log.

## Melhorias de médio prazo
- Sistema de inventário melhor (empilhamento apropriado, máximo de slots, filtros e arrastar/soltar).
- Balanceamento de combate: ajustar fórmulas, estados, cooldowns, inimigos escaláveis.
- Melhorar UI: responsividade, visual dos painéis, atalhos de teclado e acessibilidade.

## Long-term / Features maiores
- Pipeline de build e empacotamento (npm scripts, bundler, minificação).
- Testes automatizados e linting (ESLint + algumas unidades de teste simples).
- Integração com backend (salvamento em nuvem / sincronização de saves) e analytics opcionais.

## Proposta de primeiros passos que posso implementar para você
1. Corrigir início de áudio (gesto do usuário) + fallback para sem Tone.js.
2. Tornar `saveGame`/`loadGame` robustos e adicionar autosave visual.
3. Revisar e corrigir `recalculateFinalStats` para evitar alterar `baseAttributes`.

Se quiser, eu começo aplicando as tarefas 1–3 e envio as alterações aqui. Indique qual conjunto prefere que eu faça primeiro.

---
Arquivo criado: `README.md` — localizado na raiz do projeto.
