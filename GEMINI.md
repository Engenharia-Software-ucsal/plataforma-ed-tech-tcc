# Code Review & Validation Requirements

Nas etapas de revisão de código (Code Review) ou antes de dar uma tarefa como concluída/validada, o agente deve **SEMPRE** rodar as verificações de tipagem em ambas as camadas do projeto, além de rodar os testes. 

Comandos obrigatórios:
1. **Backend:** `pnpm --filter server run build`
2. **Frontend:** `pnpm --filter native exec tsc --noEmit`

Nunca valide uma tarefa sem antes confirmar que a saída de ambos os comandos é limpa (código de saída 0).
