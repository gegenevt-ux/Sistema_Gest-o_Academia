/*
 * Sistema de Gestão - Titan Fit
 * Cadastro, edição, listagem, exportação e painel de alunos e instrutores.
 * Os dados ficam salvos no navegador (localStorage).
 */
(() => {
  'use strict'

  // ---------- Configuração ----------
  const CHAVES = {
    alunos: 'academia_alunos',
    instrutores: 'academia_instrutores'
  }

  const PLANOS = {
    'Básico': 89.90,
    'Intermediário': 129.90,
    'Profissional': 179.90
  }
  const TURNOS = ['Matutino', 'Vespertino', 'Noturno']

  const CAMPOS = {
    alunos: ['nome', 'cpf', 'email', 'telefone', 'plano', 'instrutorId'],
    instrutores: ['nome', 'especialidade', 'email', 'telefone', 'turno']
  }

  const NOMES = {
    alunos: { singular: 'aluno', plural: 'alunos', titulo: 'Aluno', pagina: 'listar_alunos.html', cadastro: 'Cadastro_alunos.html' },
    instrutores: { singular: 'instrutor', plural: 'instrutores', titulo: 'Instrutor', pagina: 'listar_Instrutores.html', cadastro: 'Cadastro_Instrutores.html' }
  }

  // Dados de exemplo, usados apenas na primeira vez que o sistema é aberto.
  const EXEMPLOS = {
    instrutores: [
      { id: 'exemplo-i1', nome: 'Rafael Monteiro', especialidade: 'Personal Trainer', email: 'rafael.monteiro@exemplo.com', telefone: '(92) 90429-8435', turno: 'Matutino' },
      { id: 'exemplo-i2', nome: 'Luana Prado', especialidade: 'Yoga', email: 'luana.prado@exemplo.com', telefone: '(92) 96542-7487', turno: 'Noturno' },
      { id: 'exemplo-i3', nome: 'Diego Albuquerque', especialidade: 'Musculação', email: 'diego.albuquerque@exemplo.com', telefone: '(92) 97652-8746', turno: 'Vespertino' }
    ],
    alunos: [
      { id: 'exemplo-a1', nome: 'Mariana Costa', cpf: '529.982.247-25', email: 'mariana.costa@exemplo.com', telefone: '(92) 99123-4501', plano: 'Profissional', instrutorId: 'exemplo-i1' },
      { id: 'exemplo-a2', nome: 'Pedro Henrique Lima', cpf: '111.444.777-35', email: 'pedro.lima@exemplo.com', telefone: '(92) 99234-5612', plano: 'Básico', instrutorId: '' },
      { id: 'exemplo-a3', nome: 'Camila Rocha', cpf: '123.456.789-09', email: 'camila.rocha@exemplo.com', telefone: '(92) 99345-6723', plano: 'Intermediário', instrutorId: 'exemplo-i3' }
    ]
  }

  const reduzirMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

  // ---------- Armazenamento ----------
  function carregar (tipo) {
    try {
      const bruto = localStorage.getItem(CHAVES[tipo])
      if (bruto === null) {
        const iniciais = EXEMPLOS[tipo].map(item => ({ ...item }))
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

  function mapaInstrutores () {
    return new Map(carregar('instrutores').map(i => [i.id, i]))
  }

  // ---------- Utilidades ----------
  const somenteDigitos = valor => (valor || '').replace(/\D/g, '')

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

  const formatarMoeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const plural = (n, singular, pluralTexto) => `${n} ${n === 1 ? singular : pluralTexto}`

  function mostrarMensagem (texto, tipo = 'success') {
    const caixa = document.getElementById('mensagem')
    if (!caixa) return
    caixa.className = `alert alert-${tipo}`
    caixa.textContent = texto
    caixa.scrollIntoView({ behavior: reduzirMovimento() ? 'auto' : 'smooth', block: 'center' })
  }

  // ---------- Formulários de cadastro e edição ----------
  function preencherInstrutores (select, selecionado = '') {
    if (!select) return
    const instrutores = carregar('instrutores')
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    select.querySelectorAll('option:not([value=""])').forEach(op => op.remove())
    instrutores.forEach(instrutor => {
      const opcao = document.createElement('option')
      opcao.value = instrutor.id
      opcao.textContent = `${instrutor.nome} · ${instrutor.especialidade} (${instrutor.turno})`
      select.appendChild(opcao)
    })
    select.value = instrutores.some(i => i.id === selecionado) ? selecionado : ''
  }

  function configurarFormulario (form, tipo) {
    const nomes = NOMES[tipo]
    const campos = CAMPOS[tipo]
    const cpf = form.querySelector('#cpf')
    const telefone = form.querySelector('#telefone')
    const botao = document.getElementById('botao-salvar')
    const parametros = new URLSearchParams(window.location.search)

    preencherInstrutores(form.querySelector('#instrutorId'))

    // Plano vindo da página de planos (ex.: ?plano=Profissional)
    const planoUrl = parametros.get('plano')
    if (planoUrl && form.elements.plano && PLANOS[planoUrl] !== undefined) {
      form.elements.plano.value = planoUrl
    }

    // Modo edição (ex.: ?editar=ID)
    const idEdicao = parametros.get('editar')
    let emEdicao = null
    if (idEdicao) {
      emEdicao = carregar(tipo).find(item => item.id === idEdicao) || null
      if (!emEdicao) {
        mostrarMensagem(`Não encontramos esse ${nomes.singular}. Ele pode ter sido excluído.`, 'warning')
      } else {
        campos.forEach(campo => {
          if (form.elements[campo]) form.elements[campo].value = emEdicao[campo] || ''
        })
        preencherInstrutores(form.querySelector('#instrutorId'), emEdicao.instrutorId)
        if (botao) botao.textContent = 'Salvar alterações'
        const titulo = document.querySelector('.banner-pagina h1')
        if (titulo) titulo.textContent = `Editar ${nomes.singular}`
        const subtitulo = document.querySelector('.banner-pagina p')
        if (subtitulo) subtitulo.textContent = `Alterando os dados de ${emEdicao.nome}.`
        document.title = `Editar ${nomes.singular} | Titan Fit`
      }
    }

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
        } else if (lista.some(item => item.id !== (emEdicao && emEdicao.id) &&
                   somenteDigitos(item.cpf) === somenteDigitos(cpf.value))) {
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

      const dados = {}
      campos.forEach(campo => {
        if (form.elements[campo]) dados[campo] = form.elements[campo].value.trim()
      })
      dados.email = dados.email.toLowerCase()

      let mensagem
      if (emEdicao) {
        const indice = lista.findIndex(item => item.id === emEdicao.id)
        if (indice === -1) {
          mostrarMensagem(`Esse ${nomes.singular} não existe mais. Nada foi salvo.`, 'danger')
          return
        }
        lista[indice] = { ...lista[indice], ...dados }
        emEdicao = lista[indice]
        mensagem = `Dados de "${dados.nome}" atualizados com sucesso!`
      } else {
        lista.push({ id: novoId(), ...dados })
        mensagem = `${nomes.titulo} "${dados.nome}" cadastrado com sucesso!`
      }

      if (!salvar(tipo, lista)) {
        mostrarMensagem('Não foi possível salvar. Verifique se o navegador permite armazenamento local.', 'danger')
        return
      }

      form.classList.remove('was-validated')
      if (!emEdicao) {
        form.reset()
        preencherInstrutores(form.querySelector('#instrutorId'))
      }
      mostrarMensagem(mensagem)
    })
  }

  // ---------- Listagens ----------
  // Cada coluna: título no CSV e como obter o valor.
  function colunasDe (tipo) {
    if (tipo === 'alunos') {
      const instrutores = mapaInstrutores()
      return [
        ['Nome', a => a.nome],
        ['CPF', a => a.cpf],
        ['Email', a => a.email],
        ['Telefone', a => a.telefone],
        ['Plano', a => a.plano],
        ['Instrutor', a => (instrutores.get(a.instrutorId) || {}).nome || '']
      ]
    }
    const alunos = carregar('alunos')
    return [
      ['Nome', i => i.nome],
      ['Especialidade', i => i.especialidade],
      ['Email', i => i.email],
      ['Telefone', i => i.telefone],
      ['Turno', i => i.turno],
      ['Alunos', i => String(alunos.filter(a => a.instrutorId === i.id).length)]
    ]
  }

  function itensFiltrados (tipo, filtro) {
    const termo = normalizar(filtro.trim())
    const colunas = colunasDe(tipo)
    const itens = carregar(tipo).filter(item =>
      !termo || colunas.some(([, valor]) => normalizar(valor(item)).includes(termo))
    )
    return { itens, colunas, termo }
  }

  function excluir (tipo, item) {
    const nomes = NOMES[tipo]
    let aviso = `Excluir "${item.nome}"?`
    const alunosVinculados = tipo === 'instrutores'
      ? carregar('alunos').filter(a => a.instrutorId === item.id)
      : []
    if (alunosVinculados.length) {
      aviso += `\n\n${plural(alunosVinculados.length, 'aluno ficará', 'alunos ficarão')} sem instrutor.`
    }
    if (!window.confirm(aviso)) return false

    salvar(tipo, carregar(tipo).filter(outro => outro.id !== item.id))
    if (alunosVinculados.length) {
      salvar('alunos', carregar('alunos').map(a => a.instrutorId === item.id ? { ...a, instrutorId: '' } : a))
    }
    console.info(`${nomes.titulo} excluído:`, item.nome)
    return true
  }

  function renderizarTabela (tabela, filtro = '') {
    const tipo = tabela.dataset.tipo
    const nomes = NOMES[tipo]
    const corpo = tabela.querySelector('tbody')
    const vazio = document.getElementById('lista-vazia')
    const { itens, colunas, termo } = itensFiltrados(tipo, filtro)

    corpo.replaceChildren()
    itens.forEach((item, indice) => {
      const linha = document.createElement('tr')
      linha.style.animationDelay = `${Math.min(indice, 10) * 60}ms`

      const numero = document.createElement('th')
      numero.scope = 'row'
      numero.textContent = indice + 1
      linha.appendChild(numero)

      colunas.forEach(([titulo, valor]) => {
        const celula = document.createElement('td')
        const texto = valor(item)
        if (titulo === 'Instrutor' && !texto) {
          celula.innerHTML = '<span class="text-body-secondary">Sem instrutor</span>'
        } else if (titulo === 'Alunos') {
          const selo = document.createElement('span')
          selo.className = 'badge rounded-pill text-bg-secondary'
          selo.textContent = texto
          celula.appendChild(selo)
        } else {
          celula.textContent = texto || '-'
        }
        linha.appendChild(celula)
      })

      const acoes = document.createElement('td')
      acoes.className = 'text-nowrap'

      const editar = document.createElement('a')
      editar.className = 'btn btn-sm btn-outline-primary me-1'
      editar.href = `${nomes.cadastro}?editar=${encodeURIComponent(item.id)}`
      editar.textContent = 'Editar'
      acoes.appendChild(editar)

      const botao = document.createElement('button')
      botao.type = 'button'
      botao.className = 'btn btn-sm btn-outline-danger'
      botao.textContent = 'Excluir'
      botao.addEventListener('click', () => {
        if (!excluir(tipo, item)) return
        if (reduzirMovimento()) {
          renderizarTabela(tabela, filtro)
        } else {
          linha.classList.add('saindo')
          linha.addEventListener('animationend', () => renderizarTabela(tabela, filtro), { once: true })
        }
      })
      acoes.appendChild(botao)
      linha.appendChild(acoes)

      corpo.appendChild(linha)
    })

    const contador = document.getElementById('contador')
    if (contador) {
      const total = carregar(tipo).length
      const base = `${plural(total, nomes.singular, nomes.plural)} ${total === 1 ? 'cadastrado' : 'cadastrados'}`
      contador.textContent = termo ? `${base} · ${plural(itens.length, 'resultado', 'resultados')} na busca` : base
    }

    if (vazio) {
      vazio.textContent = termo ? `Nenhum resultado para "${filtro.trim()}".` : 'Nenhum registro cadastrado ainda.'
      vazio.classList.toggle('d-none', itens.length > 0)
    }

    tabela.dataset.filtro = filtro
  }

  // ---------- Exportar planilha (CSV) ----------
  function exportarCSV (tabela) {
    const tipo = tabela.dataset.tipo
    const { itens, colunas } = itensFiltrados(tipo, tabela.dataset.filtro || '')
    if (!itens.length) {
      window.alert('Não há registros para exportar.')
      return
    }
    // Ponto e vírgula como separador: o Excel em português abre direto nas colunas certas.
    const celula = texto => `"${String(texto ?? '').replace(/"/g, '""')}"`
    const linhas = [
      colunas.map(([titulo]) => celula(titulo)).join(';'),
      ...itens.map(item => colunas.map(([, valor]) => celula(valor(item))).join(';'))
    ]
    const conteudo = '﻿' + linhas.join('\r\n')
    const arquivo = new Blob([conteudo], { type: 'text/csv;charset=utf-8' })
    const hoje = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(arquivo)
    link.download = `${NOMES[tipo].plural}-titan-fit-${hoje}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  // ---------- Busca do menu ----------
  function configurarBusca (tabela) {
    const form = document.getElementById('form-busca')
    const campo = document.getElementById('campo-busca')
    if (!form || !campo) return ''

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

  // ---------- Painel da página inicial ----------
  function animarNumero (elemento, valorFinal, moeda) {
    const exibir = v => { elemento.textContent = moeda ? formatarMoeda(v) : Math.round(v).toLocaleString('pt-BR') }
    if (reduzirMovimento()) { exibir(valorFinal); return }
    const duracao = 1400
    const inicio = performance.now()
    const passo = agora => {
      const t = Math.min((agora - inicio) / duracao, 1)
      const suave = 1 - Math.pow(1 - t, 3)
      exibir(valorFinal * suave)
      if (t < 1) requestAnimationFrame(passo)
      else exibir(valorFinal)
    }
    requestAnimationFrame(passo)
  }

  function desenharBarras (alvo, dados) {
    const maximo = Math.max(1, ...dados.map(d => d.valor))
    alvo.replaceChildren()
    dados.forEach(({ rotulo, valor, detalhe }) => {
      const linha = document.createElement('div')
      linha.className = 'barra-linha'
      const topo = document.createElement('div')
      topo.className = 'd-flex justify-content-between small mb-1'
      const nome = document.createElement('span')
      nome.textContent = rotulo
      const numero = document.createElement('span')
      numero.className = 'fw-semibold'
      numero.textContent = detalhe ? `${valor} · ${detalhe}` : String(valor)
      topo.append(nome, numero)
      const trilho = document.createElement('div')
      trilho.className = 'barra-trilho'
      trilho.setAttribute('role', 'img')
      trilho.setAttribute('aria-label', `${rotulo}: ${valor}`)
      const preenchimento = document.createElement('div')
      preenchimento.className = 'barra-preenchimento'
      preenchimento.style.setProperty('--largura', `${(valor / maximo) * 100}%`)
      trilho.appendChild(preenchimento)
      linha.append(topo, trilho)
      alvo.appendChild(linha)
    })
  }

  function configurarPainel () {
    const painel = document.querySelector('.painel')
    if (!painel) return

    const alunos = carregar('alunos')
    const instrutores = carregar('instrutores')
    const ids = new Set(instrutores.map(i => i.id))
    const valores = {
      alunos: alunos.length,
      instrutores: instrutores.length,
      semInstrutor: alunos.filter(a => !ids.has(a.instrutorId)).length,
      receita: alunos.reduce((soma, a) => soma + (PLANOS[a.plano] || 0), 0)
    }

    const total = Math.max(alunos.length, 1)
    desenharBarras(document.getElementById('grafico-planos'), Object.keys(PLANOS).map(plano => {
      const valor = alunos.filter(a => a.plano === plano).length
      return { rotulo: plano, valor, detalhe: `${Math.round((valor / total) * 100)}%` }
    }))
    desenharBarras(document.getElementById('grafico-turnos'), TURNOS.map(turno => ({
      rotulo: turno, valor: instrutores.filter(i => i.turno === turno).length
    })))

    let iniciado = false
    const iniciar = () => {
      if (iniciado) return
      iniciado = true
      painel.classList.add('animado')
      painel.querySelectorAll('[data-contar]').forEach(el => {
        animarNumero(el, valores[el.dataset.contar] || 0, el.dataset.moeda === '1')
      })
    }
    if ('IntersectionObserver' in window) {
      const observador = new IntersectionObserver(entradas => {
        if (entradas.some(e => e.isIntersecting)) { iniciar(); observador.disconnect() }
      }, { threshold: 0.25 })
      observador.observe(painel)
    } else {
      iniciar()
    }
  }

  // ---------- Animações gerais ----------
  function configurarAnimacoes () {
    const elementos = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      elementos.forEach(el => el.classList.add('visivel'))
    } else {
      const observador = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visivel')
            observador.unobserve(entrada.target)
          }
        })
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
      elementos.forEach(el => observador.observe(el))
    }

    const navbar = document.querySelector('.navbar')
    if (navbar) {
      const atualizar = () => navbar.classList.toggle('rolando', window.scrollY > 10)
      window.addEventListener('scroll', atualizar, { passive: true })
      atualizar()
    }
  }

  // ---------- Inicialização ----------
  document.addEventListener('DOMContentLoaded', () => {
    configurarAnimacoes()

    // Destaca no menu a página atual.
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html'
    document.querySelectorAll('.navbar a[href]').forEach(link => {
      if (link.getAttribute('href') === paginaAtual) {
        link.classList.add('active')
        link.setAttribute('aria-current', 'page')
      }
    })

    const formAluno = document.getElementById('form-aluno')
    if (formAluno) configurarFormulario(formAluno, 'alunos')

    const formInstrutor = document.getElementById('form-instrutor')
    if (formInstrutor) configurarFormulario(formInstrutor, 'instrutores')

    const tabela = document.getElementById('tabela')
    const termoInicial = configurarBusca(tabela)
    if (tabela) {
      renderizarTabela(tabela, termoInicial)
      const botaoExportar = document.getElementById('exportar-csv')
      if (botaoExportar) botaoExportar.addEventListener('click', () => exportarCSV(tabela))
    }

    configurarPainel()
  })
})()
