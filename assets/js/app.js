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

  const SESSAO_ALUNO = 'academia_sessao_aluno' // localStorage: continua logado, como nos apps
  const SESSAO_GESTAO = 'academia_sessao_gestao' // sessionStorage: sai ao fechar o navegador
  const SENHA_GESTAO = 'academia_gestao_senha'
  const chaveTreinos = idAluno => `academia_treinos_${idAluno}`

  const CAMPOS = {
    alunos: ['nome', 'cpf', 'email', 'telefone', 'plano', 'instrutorId', 'objetivo', 'nivel'],
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

  // ---------- Contas e sessões ----------
  // A senha nunca é guardada: guardamos só um "hash" (SHA-256) misturado com um sal aleatório.
  async function gerarHash (senha, sal) {
    const texto = `${sal}:${senha}`
    if (window.crypto && window.crypto.subtle) {
      const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
      return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    // Navegadores muito antigos: hash simples, só para não guardar a senha em texto.
    let h = 2166136261
    for (const c of texto) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 }
    return 'fnv' + h.toString(16)
  }

  async function criarSenha (senha) {
    const sal = novoId() + novoId()
    return { sal, hash: await gerarHash(senha, sal) }
  }

  async function conferirSenha (senha, guardada) {
    return Boolean(guardada && guardada.sal) && (await gerarHash(senha, guardada.sal)) === guardada.hash
  }

  function alunoLogado () {
    try {
      const id = localStorage.getItem(SESSAO_ALUNO)
      if (!id) return null
      const aluno = carregar('alunos').find(a => a.id === id)
      if (!aluno) localStorage.removeItem(SESSAO_ALUNO)
      return aluno || null
    } catch (erro) { return null }
  }

  function entrarComo (idAluno) {
    localStorage.setItem(SESSAO_ALUNO, idAluno)
    window.location.href = 'app.html'
  }

  function sairAluno () {
    try { localStorage.removeItem(SESSAO_ALUNO) } catch (erro) {}
    window.location.href = 'index.html'
  }

  const gestaoLogada = () => {
    try { return sessionStorage.getItem(SESSAO_GESTAO) === 'ok' } catch (erro) { return false }
  }

  function sairGestao () {
    try { sessionStorage.removeItem(SESSAO_GESTAO) } catch (erro) {}
    window.location.href = 'gestao.html'
  }

  // Conta de demonstração, com histórico de exemplo, para conhecer o app sem se cadastrar.
  async function contaDemo () {
    const email = 'demo@titanfit.com.br'
    const alunos = carregar('alunos')
    let demo = alunos.find(a => a.email === email)
    if (!demo) {
      demo = {
        id: 'demo-aluno',
        nome: 'Aluno Demonstração',
        cpf: '714.602.380-01',
        email,
        telefone: '(92) 99999-0000',
        plano: 'Intermediário',
        instrutorId: 'exemplo-i3',
        objetivo: 'Hipertrofia',
        nivel: 'Intermediário',
        demo: true,
        senha: await criarSenha(novoId())
      }
      alunos.push(demo)
      salvar('alunos', alunos)
      const dia = 86400000
      const agora = Date.now()
      const historico = [13, 11, 9, 6, 4, 2, 1].map((d, i) => ({
        id: novoId(),
        ficha: 'ABC'[i % 3],
        inicio: agora - d * dia,
        fim: agora - d * dia + (45 + (i % 3) * 5) * 60000,
        series: 20 + i
      }))
      const pesos = [28, 21, 14, 7, 0].map((d, i) => ({ data: agora - d * dia, kg: [82.4, 81.9, 81.1, 80.6, 80.2][i] }))
      localStorage.setItem(chaveTreinos(demo.id), JSON.stringify({ historico, pesos, emAndamento: null }))
    }
    entrarComo(demo.id)
  }

  function configurarEntrar (form) {
    const botaoDemo = document.getElementById('entrar-demo')
    if (botaoDemo) botaoDemo.addEventListener('click', () => contaDemo())
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      contaDemo()
      return
    }
    if (alunoLogado()) { window.location.replace('app.html'); return }

    form.addEventListener('submit', async evento => {
      evento.preventDefault()
      const email = form.elements.email.value.trim().toLowerCase()
      const senha = form.elements.senha.value
      const aluno = carregar('alunos').find(a => a.email === email)
      if (aluno && !aluno.demo && await conferirSenha(senha, aluno.senha)) {
        entrarComo(aluno.id)
        return
      }
      form.elements.senha.value = ''
      form.classList.add('tremer')
      setTimeout(() => form.classList.remove('tremer'), 500)
      mostrarMensagem(
        aluno && !aluno.senha
          ? 'Esse cadastro foi feito pela academia e ainda não tem senha. Fale com a recepção.'
          : 'Email ou senha incorretos.',
        'danger')
    })
  }

  function configurarGestao () {
    const acesso = document.getElementById('gestao-acesso')
    const painel = document.getElementById('gestao-painel')
    const form = document.getElementById('form-gestao')
    const confirmar = document.getElementById('grupo-confirmar')
    const navGestao = document.getElementById('nav-gestao')
    const navPublica = document.getElementById('nav-publica')

    const mostrarPainel = () => {
      acesso.classList.add('d-none')
      painel.classList.remove('d-none')
      if (navGestao) navGestao.classList.remove('d-none')
      if (navPublica) navPublica.classList.add('d-none')
      configurarPainel()
    }
    if (gestaoLogada()) { mostrarPainel(); return }

    acesso.classList.remove('d-none')
    let guardada = null
    try { guardada = JSON.parse(localStorage.getItem(SENHA_GESTAO) || 'null') } catch (erro) {}
    const primeiroAcesso = !guardada
    if (primeiroAcesso) {
      document.getElementById('gestao-titulo').textContent = 'Primeiro acesso'
      document.getElementById('gestao-ajuda').textContent = 'Crie a senha da gestão neste aparelho. Ela será pedida sempre que alguém abrir esta área.'
      confirmar.classList.remove('d-none')
      document.getElementById('botao-gestao').textContent = 'Criar senha e entrar'
    }

    form.addEventListener('submit', async evento => {
      evento.preventDefault()
      const senha = document.getElementById('senha-gestao').value
      if (senha.length < 6) { mostrarMensagem('A senha precisa ter pelo menos 6 caracteres.', 'danger'); return }
      if (primeiroAcesso) {
        if (senha !== document.getElementById('senha-gestao2').value) { mostrarMensagem('As senhas não conferem.', 'danger'); return }
        localStorage.setItem(SENHA_GESTAO, JSON.stringify(await criarSenha(senha)))
      } else if (!(await conferirSenha(senha, guardada))) {
        document.getElementById('senha-gestao').value = ''
        mostrarMensagem('Senha incorreta.', 'danger')
        return
      }
      sessionStorage.setItem(SESSAO_GESTAO, 'ok')
      document.getElementById('mensagem').className = 'alert d-none'
      mostrarPainel()
    })
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
    // Só a equipe (gestão) pode editar o cadastro de um aluno.
    if (idEdicao && tipo === 'alunos' && !gestaoLogada()) {
      window.location.replace('gestao.html')
      return
    }
    const cadastroPublico = tipo === 'alunos' && !idEdicao
    const camposSenha = document.getElementById('campos-senha')
    if (idEdicao) {
      if (camposSenha) {
        camposSenha.classList.add('d-none')
        camposSenha.querySelectorAll('input').forEach(campo => { campo.required = false })
      }
      const link = document.getElementById('link-secundario')
      if (link) { link.textContent = 'Voltar à lista'; link.href = nomes.pagina }
    }
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
    ;['email', 'senha2'].forEach(nome => {
      if (form.elements[nome]) form.elements[nome].addEventListener('input', () => form.elements[nome].setCustomValidity(''))
    })
    if (form.elements.senha && form.elements.senha2) {
      form.elements.senha.addEventListener('input', () => form.elements.senha2.setCustomValidity(''))
    }
    if (telefone) {
      telefone.addEventListener('input', () => {
        telefone.value = mascaraTelefone(telefone.value)
      })
    }

    form.addEventListener('submit', async evento => {
      evento.preventDefault()
      const lista = carregar(tipo)

      if (form.elements.email) {
        const repetido = lista.some(item => item.id !== (emEdicao && emEdicao.id) &&
          (item.email || '').toLowerCase() === form.elements.email.value.trim().toLowerCase())
        form.elements.email.setCustomValidity(repetido ? 'repetido' : '')
        const aviso = form.elements.email.parentElement.querySelector('.invalid-feedback')
        if (aviso) aviso.textContent = repetido ? 'Este email já está cadastrado. Use outro ou entre na sua conta.' : 'Informe um email válido.'
      }

      if (cadastroPublico && form.elements.senha2) {
        const iguais = form.elements.senha.value === form.elements.senha2.value
        form.elements.senha2.setCustomValidity(iguais ? '' : 'diferentes')
      }

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
        const novo = { id: novoId(), ...dados }
        if (cadastroPublico) novo.senha = await criarSenha(form.elements.senha.value)
        lista.push(novo)
        if (cadastroPublico) {
          if (!salvar(tipo, lista)) {
            mostrarMensagem('Não foi possível salvar. Verifique se o navegador permite armazenamento local.', 'danger')
            return
          }
          entrarComo(novo.id)
          return
        }
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
    if (tipo === 'alunos') {
      try {
        localStorage.removeItem(chaveTreinos(item.id))
        if (localStorage.getItem(SESSAO_ALUNO) === item.id) localStorage.removeItem(SESSAO_ALUNO)
      } catch (erro) {}
    }
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

    const formEntrar = document.getElementById('form-entrar')
    if (formEntrar) configurarEntrar(formEntrar)

    if (document.body.dataset.pagina === 'gestao') configurarGestao()

    document.querySelectorAll('[data-sair-gestao]').forEach(botao => botao.addEventListener('click', sairGestao))

    // Menu público: mostra "Meu treino" para quem já está logado.
    if (alunoLogado()) {
      document.querySelectorAll('[data-visitante]').forEach(el => el.classList.add('d-none'))
      document.querySelectorAll('[data-logado]').forEach(el => { el.classList.remove('d-none'); el.classList.add('d-flex') })
    }
  })

  // Funções usadas também pelo app de treino (treino.js).
  window.TitanFit = {
    carregar, salvar, alunoLogado, sairAluno, chaveTreinos, PLANOS,
    mapaInstrutores, mostrarMensagem, reduzirMovimento, formatarMoeda, plural, novoId
  }
})()
