# SportConnect MVP 🏆

Plataforma unificada para gerenciamento, criação e acompanhamento de torneios esportivos. O aplicativo permite que organizadores criem chaves em árvore e acompanhem pontuações ao vivo, enquanto atletas conseguem inscrever seus times de forma contínua e sem atritos.

## 🚀 Funcionalidades Desenvolvidas

* **Chaveamento em Árvore Bi-direcional (SVG):** Visualização interativa e responsiva das chaves de torneio tanto para Organizadores quanto Atletas. As partidas dividem-se de forma simétrica entre lados esquerdo e direito, convergindo para a Grande Final no centro da tela. A renderização utiliza linhas conectoras em ângulo reto via coordenadas cartesianas no `react-native-svg`.
* **Sistema Automático de *Byes*:** O motor lógico de torneio preenche automaticamente posições vazias (quando o número de participantes não é uma potência exata de 2), promovendo times de forma automática sem gerar exceções visuais.
* **Fluxo de Inscrição Inteligente:** Redirecionamento automático e aprovação instantânea de times em torneios com `valor_inscricao = 0`. O aplicativo elimina "dead-ends" de navegação, utilizando `navigation.reset` para evitar que o usuário volte para o loop de pagamento indevidamente.
* **Mídia Centralizada em Nuvem (Supabase):** Implementação do upload de imagens de torneio para o bucket público do Supabase, substituindo caminhos de galeria locais para garantir a visualização multiplataforma (iOS/Android).
* **Safe Area Universal:** Layout responsivo otimizado, prevenindo a sobreposição de botões cruciais do rodapé e ferramentas de status contra botões virtuais, barras de navegação ou Home Indicators.

## 🧪 Testes Realizados

* **Testes Algorítmicos (Unitário/Integração):** Verificação lógica da matriz do chaveamento cartesiano (`calculateBracketLayout`) garantindo simetria perfeita dos nós, com validação de renderização entre `TournamentBracket` (Organizador) e `BracketScreen` (Atleta). Teste de políticas RLS em Storage Buckets via inserções cruzadas.
* **Testes SUS (System Usability Scale) / Thumb Zone:** Testes ergonômicos em áreas seguras validando que a área de toque (CTA) de aprovação e avanço no fluxo pós-inscrição fique inteiramente contida na margem de alcance flexível dos dedos polegares (thumb zone), livre dos gestos de saída do aplicativo.

## 🏆 Resultados Alcançados

* **Design State-of-the-Art:** O modelo bi-direcional transmite uma estética premium às competições orgânicas locais, simulando uma tabela em nível de software profissional.
* **Redução de Fricção de UX:** Inscrições de torneio completadas em fluxo único e sem erros de preenchimento duplo de stack, refletindo em menos frustração e mais atletas concluindo inscrições no MVP.
* **Consistência Visual e Backend Sólido:** Todos os artefatos de imagem carregados remotamente sem falhas de galeria e com controle responsivo adaptável (do notch do iPhone aos botões de navegação de Androids antigos).

## 🔮 Implementações Futuras

* **Exportação Nativa em PDF:** Conectar a tabela renderizada à geração de súmulas via `expo-print`, permitindo compartilhamento fácil pelo WhatsApp via `expo-sharing`.
* **Seeding Manual (Drag-and-Drop):** Implementação de arrastar e soltar (Drag and Drop) na tela do Organizador para definir o pareamento de times de alta qualificação antes do chaveamento ser congelado.
* **Callbacks de Pagamento (Webhooks):** Interligação com sistemas financeiros para mudar `status` das `inscricoes` via confirmação de recebimento PIX autônoma.
* **Notificações Push Reativas:** Informar times automaticamente via *Expo Push Notifications* quando sua próxima chave do chaveamento for ativada (status "AO VIVO").
