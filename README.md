# Sistema de Gestão de Academia

Site da **Titan Fit**, feito com HTML, Bootstrap 5 e JavaScript puro.

## Páginas

| Página | Arquivo |
| --- | --- |
| Início (com painel) | `index.html` |
| Planos | `planos.html` |
| Cadastro de alunos | `Cadastro_alunos.html` |
| Lista de alunos | `listar_alunos.html` |
| Cadastro de instrutores | `Cadastro_Instrutores.html` |
| Lista de instrutores | `listar_Instrutores.html` |

## Funcionalidades

- Cadastro de alunos (nome, CPF, email, telefone e plano) e de instrutores (nome, especialidade, email, telefone e turno).
- Validação dos campos, máscara de CPF e telefone, verificação de CPF válido e de CPF repetido.
- Edição de cadastros pelo botão "Editar" nas listas.
- Aluno pode ter um instrutor responsável. A lista de instrutores mostra quantos alunos cada um acompanha, e ao excluir um instrutor os alunos dele ficam "Sem instrutor".
- Listagem com busca (pelo campo do menu), botão para excluir e exportação para planilha (CSV, abre direto no Excel).
- Painel na página inicial: total de alunos e instrutores, alunos sem instrutor, receita mensal estimada e gráficos por plano e por turno.
- Página de planos com preços; o botão de cada plano já abre o cadastro com o plano escolhido.
- Os dados ficam salvos no próprio navegador (`localStorage`). Na primeira vez que o site abre, ele já vem com 3 alunos e 3 instrutores de exemplo.
- Tema claro, escuro ou automático (botão no canto inferior direito).
- Ilustrações próprias em SVG (logo, carrossel, modalidades e destaques) e animações: zoom no carrossel, elementos que aparecem ao rolar, efeitos ao passar o mouse, linhas da tabela entrando e saindo. Quem ativa "reduzir movimento" no sistema não vê as animações.

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
    app.js          lógica de cadastro, listagem e busca
    color-modes.js  troca de tema claro/escuro
  style/      estilos do site
```
