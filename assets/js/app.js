/*
 * Sistema de Gestão - Titan Fit
 * Cadastro e listagem de alunos e instrutores, salvos no navegador (localStorage).
 */
(() => {
  'use strict'

  // ---------- Armazenamento ----------
  const CHAVES = {
    alunos: 'academia_alunos',
    instrutores: 'academia_instrutores'
  }

  // Dados de exemplo, usados apenas na primeira vez que o sistema é aberto.
  const EXEMPLOS = {
    alunos: [
      { nome: 'Mario Chaves', cpf: '529.982.247-25', email: 'mario.chaves@exemplo.com', telefone: '(92) 90429-8435', plano: 'Profissional' },
      { nome: 'Bella Swan', cpf: '111.444.777-35', email: 'bella.swan@exemplo.com', telefone: '(92) 96542-7487', plano: 'Básico' },
      { nome: 'Jonas Brothers', cpf: '123.456.789-09', email: 'jonas.brothers@exemplo.com', telefone: '(92) 97652-8746', plano: 'Intermediário' }
    ],
    instrutores: [
      { nome: 'Mario Chaviscoo', especialidade: 'Personal Trainer', email: 'mario.personal@exemplo.com', telefone: '(92) 90429-8435', turno: 'Matutino' },
      { nome: 'Bella Swan', especialidade: 'Yoga', email: 'bella.yoga@exemplo.com', telefone: '(92) 96542-7487', turno: 'Noturno' },
      { nome: 'Jonas Brothers', especialidade: 'Musculação', email: 'jonas.musculacao@exemplo.com', telefone: '(92) 97652-8746', turno: 'Vespertino' }
    ]
  }

  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  function carregar (tipo) {
    try {
      const bruto = localStorage.getItem(CHAVES[tipo])
      if (bruto === null) {
        const iniciais = EXEMPLOS[tipo].map(item => ({ id: novoId(), ...item }))
        salvar(tipo, iniciais)
        return iniciais
      }
      const dados = JSON.parse(bruto)
      return Array.isArray(dados) ? dados : []
    } catch (erro) {
      console.error('Não foi possível ler os dados salvos:', erro)
      return []
    }
  }

  function salvar (tipo, lista) {
    try {
      localStorage.setItem(CHAVES[tipo], JSON.stringify(lista))
      return true
    } catch (erro) {
      console.error('Não foi possível salvar os dados:', erro)
      return false
    }
  }

  // ---------- Utilidades ----------
  const somenteDigitos = valor => valor.replace(/\D/g, '')

  function mascaraCPF (valor) {
    const d = somenteDigitos(valor).slice(0, 11)
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  function mascaraTelefone (valor) {
    const d = somenteDigitos(valor).slice(0, 11)
    if (d.length <= 2) return d.length ? `(${d}` : ''
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  // Validação oficial dos dígitos verificadores do CPF.
  function cpfValido (valor) {
    const cpf = somenteDigitos(valor)
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    const digito = tamanho => {
      let soma = 0
      for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
      const resto = (soma * 10) % 11
      return resto === 10 ? 0 : resto
    }
    return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
  }

  const normalizar = texto => (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

  function mostrarMensagem (texto, tipo = 'success') {
    const caixa = document.getElementById('mensagem')
    if (!caixa) return
    caixa.className = `alert alert-${tipo}`
    caixa.textContent = texto
    caixa.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // ---------- Formulários de cadastro ----------
  function configurarFormulario (form, tipo, campos, nomeItem) {
    const cpf = form.querySelector('#cpf')
    const telefone = form.querySelector('#telefone')

    if (cpf) {
      cpf.addEventListener('input', () => {
        cpf.value = mascaraCPF(cpf.value)
        cpf.setCustomValidity('')
      })
    }
    if (telefone) {
      telefone.addEventListener('input', () => {
        telefone.value = mascaraTelefone(telefone.value)
      })
    }

    form.addEventListener('submit', evento => {
      evento.preventDefault()
      const lista = carregar(tipo)

      if (cpf) {
        const feedback = document.getElementById('cpf-feedback')
        let erro = ''
        if (!cpfValido(cpf.value)) {
          erro = 'Informe um CPF válido.'
        } else if (lista.some(item => somenteDigitos(item.cpf || '') === somenteDigitos(cpf.value))) {
          erro = 'Já existe um aluno cadastrado com este CPF.'
        }
        cpf.setCustomValidity(erro)
        if (feedback && erro) feedback.textContent = erro
      }

      if (!form.checkValidity()) {
        form.classList.add('was-validated')
        const primeiroInvalido = form.querySelector(':invalid')
        if (primeiroInvalido) primeiroInvalido.focus()
        return
      }

      const registro = { id: novoId() }
      campos.forEach(campo => {
        registro[campo] = form.elements[campo].value.trim()
      })
      registro.email = registro.email.toLowerCase()

      lista.push(registro)
      if (!salvar(tipo, lista)) {
        mostrarMensagem('Não foi possível salvar. Verifique se o navegador permite armazenamento local.', 'danger')
        return
      }

      form.reset()
      form.classList.remove('was-validated')
      mostrarMensagem(`${nomeItem} "${registro.nome}" cadastrado com sucesso!`)
    })
  }

  // ---------- Listagens ----------
  const COLUNAS = {
    alunos: ['nome', 'cpf', 'email', 'telefone', 'plano'],
    instrutores: ['nome', 'especialidade', 'email', 'telefone', 'turno']
  }

  function renderizarTabela (tabela, filtro = '') {
    const tipo = tabela.dataset.tipo
    const corpo = tabela.querySelector('tbody')
    const vazio = document.getElementById('lista-vazia')
    const termo = normalizar(filtro.trim())

    const itens = carregar(tipo).filter(item =>
      !termo || COLUNAS[tipo].some(c => normalizar(item[c]).includes(termo))
    )

    corpo.replaceChildren()
    itens.forEach((item, indice) => {
      const linha = document.createElement('tr')

      const numero = document.createElement('th')
      numero.scope = 'row'
      numero.textContent = indice + 1
      linha.appendChild(numero)

      COLUNAS[tipo].forEach(coluna => {
        const celula = document.createElement('td')
        celula.textContent = item[coluna] || '-'
        linha.appendChild(celula)
      })

      const acoes = document.createElement('td')
      const botao = document.createElement('button')
      botao.type = 'button'
      botao.className = 'btn btn-sm btn-outline-danger'
      botao.textContent = 'Excluir'
      botao.addEventListener('click', () => {
        if (!window.confirm(`Excluir "${item.nome}"?`)) return
        salvar(tipo, carregar(tipo).filter(outro => outro.id !== item.id))
        renderizarTabela(tabela, filtro)
      })
      acoes.appendChild(botao)
      linha.appendChild(acoes)

      corpo.appendChild(linha)
    })

    if (vazio) {
      vazio.textContent = termo ? `Nenhum resultado para "${filtro.trim()}".` : 'Nenhum registro cadastrado ainda.'
      vazio.classList.toggle('d-none', itens.length > 0)
    }
  }

  // ---------- Busca do menu ----------
  function configurarBusca (tabela) {
    const form = document.getElementById('form-busca')
    const campo = document.getElementById('campo-busca')
    if (!form || !campo) return

    const termoUrl = new URLSearchParams(window.location.search).get('busca') || ''

    if (tabela) {
      campo.value = termoUrl
      campo.addEventListener('input', () => renderizarTabela(tabela, campo.value))
      form.addEventListener('submit', evento => {
        evento.preventDefault()
        renderizarTabela(tabela, campo.value)
      })
      return termoUrl
    }

    // Fora das listagens, a busca leva para a lista de alunos já filtrada.
    form.addEventListener('submit', evento => {
      evento.preventDefault()
      const termo = campo.value.trim()
      window.location.href = 'listar_alunos.html' + (termo ? `?busca=${encodeURIComponent(termo)}` : '')
    })
    return ''
  }

  // ---------- Inicialização ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Destaca no menu a página atual.
    const paginaAtual = window.location.pathname.split('/').pop() || 'Index.html'
    document.querySelectorAll('.navbar a[href]').forEach(link => {
      if (link.getAttribute('href') === paginaAtual) {
        link.classList.add('active')
        link.setAttribute('aria-current', 'page')
      }
    })

    const formAluno = document.getElementById('form-aluno')
    if (formAluno) {
      configurarFormulario(formAluno, 'alunos', ['nome', 'cpf', 'email', 'telefone', 'plano'], 'Aluno')
    }

    const formInstrutor = document.getElementById('form-instrutor')
    if (formInstrutor) {
      configurarFormulario(formInstrutor, 'instrutores', ['nome', 'especialidade', 'email', 'telefone', 'turno'], 'Instrutor')
    }

    const tabela = document.getElementById('tabela')
    const termoInicial = configurarBusca(tabela)
    if (tabela) renderizarTabela(tabela, termoInicial)
  })
})()
