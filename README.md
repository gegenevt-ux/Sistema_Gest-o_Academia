# Sistema de Gestão de Academia

Site da **Titan Fit**, feito com HTML, Bootstrap 5 e JavaScript puro.

## Como o site está organizado

**Parte pública** (qualquer visitante)

| Página | Arquivo |
| --- | --- |
| Início, com "Quer fazer parte da Titan Fit? Cadastre-se" | `index.html` |
| Planos | `planos.html` |
| Cadastro do aluno (cria a conta com senha) | `Cadastro_alunos.html` |
| Entrar (login e conta de demonstração) | `entrar.html` |

**App do aluno** (só depois de entrar): `app.html`

- **Hoje:** treino do dia (divisão ABC), sequência de dias 🔥, treinos da semana e histórico.
- **Treino em andamento:** marque cada série; o timer de descanso começa sozinho (com som e vibração), e no fim tem comemoração. Se fechar a página, o treino continua de onde parou.
- **Treinos:** fichas A, B e C montadas para o objetivo (hipertrofia, emagrecimento ou condicionamento) e o nível do aluno.
- **Progresso:** gráfico de treinos por semana e evolução do peso.
- **Perfil:** dados (CPF mascarado), ajuste de objetivo e nível, sair e excluir conta.

**Gestão** (só a equipe, com senha): `gestao.html`, `listar_alunos.html`, `listar_Instrutores.html`, `Cadastro_Instrutores.html`

- Painel com números e gráficos, listas com busca, edição, exclusão e exportação em CSV, cadastro de instrutores.
- No primeiro acesso de cada aparelho, a equipe cria a senha da gestão. O acesso fica no link "Área da academia", no rodapé.

## Acessibilidade

Segue a Lei Brasileira de Inclusão (Lei nº 13.146/2015), o eMAG e a WCAG 2.2 nível AA:

- Barra de acessibilidade em todas as páginas: pular para conteúdo, menu e rodapé (teclas de atalho 1, 2 e 3), tamanho do texto (A+, A−, A) e alto contraste.
- Contraste mínimo de 4,5:1, foco sempre visível, navegação completa por teclado, um título principal por página e tabelas com legenda.
- Formulários com rótulos, campos obrigatórios marcados e erros anunciados para leitores de tela.
- App com anúncios para leitores de tela (séries, descanso, registros), foco levado ao título de cada tela e janelas de descanso que deixam o fundo inativo.
- Carrossel com botão de pausa. Quem reduz movimento no sistema não vê animações.
- Tradutor de Libras VLibras (Governo Federal).
- Verificado com o axe-core em 21 telas, nos temas claro, escuro e alto contraste, sem nenhum problema.

## Leis e privacidade

- **LGPD (Lei nº 13.709/2018):** [Política de privacidade](privacidade.html) com finalidade e base legal de cada dado; aceite dos termos registrado com versão e data; confirmação de maioridade (art. 14); consentimento específico para o peso, que é dado de saúde (art. 11); direitos do titular no app (acessar, corrigir, baixar os dados, revogar o consentimento e excluir a conta); CPF mascarado nas listas da gestão; aviso antes de exportar dados pessoais.
- **Marco Civil da Internet (Lei nº 12.965/2014):** aviso sobre o armazenamento local, sem cookies de rastreamento.
- **Código de Defesa do Consumidor (Lei nº 8.078/1990):** [Termos de uso](termos.html) com preços, cancelamento e direito de arrependimento.
- Aviso de projeto acadêmico no rodapé: a Titan Fit é fictícia, e os dados da empresa nas páginas legais são exemplos que precisam ser trocados antes de qualquer uso real.

## Limites

- As senhas não são guardadas: o site guarda só um hash SHA-256 com sal.
- Os dados ficam no navegador (`localStorage`) de cada aparelho. Ninguém vê os dados de outra pessoa pela internet, mas também não há sincronização entre aparelhos.
- Como o site é estático (GitHub Pages, sem servidor), as senhas servem para separar as áreas no mesmo aparelho, e não substituem a segurança de um servidor. Para um sistema real com vários usuários, o próximo passo é um back-end (por exemplo, Firebase ou Supabase) com login no servidor.

## Como rodar

Site publicado no GitHub Pages: https://gegenevt-ux.github.io/Sistema_Gest-o_Academia/

Para rodar no seu computador, basta abrir o `index.html` no navegador. Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000/
```

## Estrutura

```
assets/
  dist/       Bootstrap (CSS e JS)
  img/        ilustrações e logo (SVG)
  js/
    app.js          contas, cadastros, listas, busca, painel e gestão
    treino.js       app de treino do aluno
    color-modes.js  troca de tema claro/escuro
  style/      estilos do site
```
