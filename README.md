# Sistema de Gestão de Academia

Site da **Titan Fit**, feito com HTML, Bootstrap 5 e JavaScript puro.

## Páginas

| Página | Arquivo |
| --- | --- |
| Início | `Index.html` |
| Cadastro de alunos | `Cadastro_alunos.html` |
| Lista de alunos | `listar_alunos.html` |
| Cadastro de instrutores | `Cadastro_Instrutores.html` |
| Lista de instrutores | `listar_Instrutores.html` |

## Funcionalidades

- Cadastro de alunos (nome, CPF, email, telefone e plano) e de instrutores (nome, especialidade, email, telefone e turno).
- Validação dos campos, máscara de CPF e telefone, verificação de CPF válido e de CPF repetido.
- Listagem com busca (pelo campo do menu) e botão para excluir.
- Os dados ficam salvos no próprio navegador (`localStorage`). Na primeira vez que o site abre, ele já vem com 3 alunos e 3 instrutores de exemplo.
- Tema claro, escuro ou automático (botão no canto inferior direito).

## Como rodar

Basta abrir o `Index.html` no navegador. Se preferir um servidor local:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000/Index.html
```

## Estrutura

```
assets/
  dist/       Bootstrap (CSS e JS)
  js/
    app.js          lógica de cadastro, listagem e busca
    color-modes.js  troca de tema claro/escuro
  style/      estilos do site
```
