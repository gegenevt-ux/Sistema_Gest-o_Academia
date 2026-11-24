/*
 * Titan Fit - App de treino do aluno
 * Treino do dia, execução com timer de descanso, fichas, progresso e perfil.
 * Os dados de cada aluno ficam só no aparelho dele (localStorage).
 */
(() => {
  'use strict'

  const TF = window.TitanFit
  if (!TF) return
  let aluno = TF.alunoLogado()
  if (!aluno) { window.location.replace('entrar.html'); return }

  const ICONE_CHECK = '<svg class="bi" aria-hidden="true" focusable="false"><use href="#i-check-lg"></use></svg>'

  // ---------- Banco de exercícios ----------
  const FICHAS_BASE = {
    A: {
      nome: 'Peito e Tríceps',
      exercicios: ['Supino reto com barra', 'Supino inclinado com halteres', 'Crucifixo na máquina', 'Tríceps na polia (corda)', 'Tríceps francês', 'Flexão de braço']
    },
    B: {
      nome: 'Costas e Bíceps',
      exercicios: ['Puxada frontal', 'Remada curvada', 'Remada baixa sentada', 'Rosca direta', 'Rosca martelo', 'Prancha abdominal']
    },
    C: {
      nome: 'Pernas e Ombros',
      exercicios: ['Agachamento livre', 'Leg press 45°', 'Cadeira extensora', 'Mesa flexora', 'Desenvolvimento com halteres', 'Elevação lateral', 'Panturrilha em pé']
    }
  }

  const OBJETIVOS = {
    Hipertrofia: { series: 4, reps: '8 a 12', descanso: 90, extra: null },
    Emagrecimento: { series: 3, reps: '15', descanso: 45, extra: { nome: 'Esteira (ritmo moderado)', series: 1, reps: '20 min', descanso: 0 } },
    Condicionamento: { series: 3, reps: '15', descanso: 45, extra: { nome: 'Bike ergométrica (tiros)', series: 1, reps: '15 min', descanso: 0 } }
  }

  const NIVEIS = {
    Iniciante: { quantidade: 4, ajusteSeries: -1 },
    'Intermediário': { quantidade: 5, ajusteSeries: 0 },
    'Avançado': { quantidade: 7, ajusteSeries: 1 }
  }

  function montarFicha (letra) {
    const objetivo = OBJETIVOS[aluno.objetivo] || OBJETIVOS.Hipertrofia
    const nivel = NIVEIS[aluno.nivel] || NIVEIS['Intermediário']
    const base = FICHAS_BASE[letra]
    const series = Math.max(2, objetivo.series + nivel.ajusteSeries)
    const exercicios = base.exercicios.slice(0, nivel.quantidade).map(nome => ({
      nome, series, reps: objetivo.reps, descanso: objetivo.descanso
    }))
    if (objetivo.extra) exercicios.push({ ...objetivo.extra })
    const totalSeries = exercicios.reduce((s, e) => s + e.series, 0)
    const minutos = Math.round(totalSeries * (1 + objetivo.descanso / 60) + (objetivo.extra ? parseInt(objetivo.extra.reps, 10) : 0))
    return { letra, nome: base.nome, exercicios, minutos }
  }

  // ---------- Dados do aluno ----------
  function carregarDados () {
    try {
      const dados = JSON.parse(localStorage.getItem(TF.chaveTreinos(aluno.id)) || 'null')
      return { historico: [], pesos: [], emAndamento: null, ...(dados || {}) }
    } catch (erro) {
      return { historico: [], pesos: [], emAndamento: null }
    }
  }
  let dados = carregarDados()
  const guardar = () => {
    try { localStorage.setItem(TF.chaveTreinos(aluno.id), JSON.stringify(dados)) } catch (erro) { console.error(erro) }
  }

  // ---------- Datas ----------
  const DIA = 86400000
  const inicioDoDia = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
  const inicioDaSemana = t => { const d = new Date(inicioDoDia(t)); const dia = (d.getDay() + 6) % 7; return d.getTime() - dia * DIA }
  const formatarData = t => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  function proximaFicha () {
    const ultimo = dados.historico[dados.historico.length - 1]
    if (!ultimo) return 'A'
    return { A: 'B', B: 'C', C: 'A' }[ultimo.ficha] || 'A'
  }

  function sequenciaDias () {
    const dias = new Set(dados.historico.map(h => inicioDoDia(h.fim)))
    let dia = inicioDoDia(Date.now())
    if (!dias.has(dia)) dia -= DIA // ainda dá tempo de treinar hoje
    let total = 0
    while (dias.has(dia)) { total++; dia -= DIA }
    return total
  }

  // Mensagens para leitores de tela
  function anunciar (texto) {
    const regiao = document.getElementById('anuncio')
    if (!regiao) return
    regiao.textContent = ''
    setTimeout(() => { regiao.textContent = texto }, 50)
  }

  // Sobreposições (descanso e comemoração): o resto da página fica inativo e o foco volta depois.
  let focoAnterior = null
  function abrirSobreposicao (el, focar) {
    focoAnterior = document.activeElement
    el.classList.remove('d-none')
    document.querySelectorAll('.app-topo, main, .app-nav, .barra-acessibilidade').forEach(x => x.setAttribute('inert', ''))
    if (focar) focar.focus()
  }
  function fecharSobreposicao (el) {
    el.classList.add('d-none')
    document.querySelectorAll('[inert]').forEach(x => x.removeAttribute('inert'))
    if (focoAnterior && document.contains(focoAnterior)) focoAnterior.focus()
    focoAnterior = null
  }

  // ---------- Navegação entre telas ----------
  const telas = document.querySelectorAll('.app-tela')
  const botoesNav = document.querySelectorAll('.app-nav [data-ir]')

  let primeiraTela = true
  function irPara (nome) {
    telas.forEach(t => t.classList.toggle('d-none', t.dataset.tela !== nome))
    botoesNav.forEach(b => {
      b.classList.toggle('ativo', b.dataset.ir === nome)
      if (b.dataset.ir === nome) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current')
    })
    document.querySelector('.app-nav').classList.toggle('d-none', nome === 'execucao')
    document.body.classList.toggle('executando', nome === 'execucao')
    window.scrollTo(0, 0)
    const atual = document.querySelector(`[data-tela="${nome}"]`)
    if (atual) { atual.classList.remove('entrando'); void atual.offsetWidth; atual.classList.add('entrando') }
    if (nome === 'hoje') desenharHoje()
    if (nome === 'treinos') desenharTreinos()
    if (nome === 'progresso') desenharProgresso()
    if (nome === 'perfil') desenharPerfil()
    // Leva o foco ao título da tela (o leitor de tela anuncia onde a pessoa está).
    const titulo = atual && atual.querySelector('[data-titulo-tela]')
    if (titulo && !primeiraTela) titulo.focus({ preventScroll: true })
    primeiraTela = false
    document.title = `${{ hoje: 'Hoje', execucao: 'Treino em andamento', treinos: 'Meus treinos', progresso: 'Progresso', perfil: 'Perfil' }[nome]} | Titan Fit`
  }
  botoesNav.forEach(b => b.addEventListener('click', () => irPara(b.dataset.ir)))

  // ---------- Tela: Hoje ----------
  function desenharHoje () {
    const hora = new Date().getHours()
    const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
    document.getElementById('saudacao').textContent = `${cumprimento}, ${aluno.nome.split(' ')[0]}`
    document.getElementById('resumo-plano').textContent = `Plano ${aluno.plano} · ${aluno.objetivo || 'Hipertrofia'} · ${aluno.nivel || 'Intermediário'}`

    const ficha = montarFicha(proximaFicha())
    const emAndamento = dados.emAndamento
    document.getElementById('hoje-titulo').textContent = `Treino ${ficha.letra} · ${ficha.nome}`
    document.getElementById('hoje-info').textContent = `${TF.plural(ficha.exercicios.length, 'exercício', 'exercícios')} · cerca de ${ficha.minutos} min`
    const botao = document.getElementById('botao-iniciar')
    if (emAndamento) {
      const f = montarFicha(emAndamento.ficha)
      document.getElementById('hoje-titulo').textContent = `Treino ${f.letra} · ${f.nome}`
      document.getElementById('hoje-info').textContent = 'Você tem um treino em andamento.'
      botao.textContent = 'Continuar treino'
    } else {
      const treinouHoje = dados.historico.some(h => inicioDoDia(h.fim) === inicioDoDia(Date.now()))
      botao.textContent = treinouHoje ? 'Treinar de novo' : 'Iniciar treino'
    }

    document.getElementById('chama-dias').textContent = sequenciaDias()

    const semana = inicioDaSemana(Date.now())
    const daSemana = dados.historico.filter(h => h.fim >= semana)
    document.getElementById('stat-semana').textContent = daSemana.length
    document.getElementById('stat-total').textContent = dados.historico.length
    document.getElementById('stat-minutos').textContent = Math.round(dados.historico.reduce((s, h) => s + (h.fim - h.inicio) / 60000, 0))

    const caixaSemana = document.getElementById('semana')
    caixaSemana.replaceChildren()
    const dias = new Set(daSemana.map(h => inicioDoDia(h.fim)))
    ;['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].forEach((letra, i) => {
      const dia = semana + i * DIA
      const bolinha = document.createElement('div')
      bolinha.className = 'dia' + (dias.has(dia) ? ' feito' : '') + (dia === inicioDoDia(Date.now()) ? ' hoje' : '')
      bolinha.innerHTML = `<span>${letra}</span><i aria-hidden="true">${dias.has(dia) ? ICONE_CHECK : ''}</i>`
      bolinha.title = new Date(dia).toLocaleDateString('pt-BR') + (dias.has(dia) ? ': treinou' : '')
      caixaSemana.appendChild(bolinha)
    })

    const lista = document.getElementById('historico')
    lista.replaceChildren()
    const recentes = dados.historico.slice(-5).reverse()
    if (!recentes.length) {
      const vazio = document.createElement('li')
      vazio.className = 'list-group-item text-body-secondary'
      vazio.textContent = 'Nenhum treino ainda. Que tal começar hoje?'
      lista.appendChild(vazio)
    }
    recentes.forEach(h => {
      const item = document.createElement('li')
      item.className = 'list-group-item d-flex justify-content-between align-items-center'
      const f = FICHAS_BASE[h.ficha]
      const titulo = document.createElement('span')
      titulo.innerHTML = `<span class="letra-ficha">${h.ficha}</span>`
      titulo.append(f ? f.nome : 'Treino')
      const detalhe = document.createElement('small')
      detalhe.className = 'text-body-secondary text-end'
      detalhe.textContent = `${formatarData(h.fim)} · ${Math.round((h.fim - h.inicio) / 60000)} min`
      item.append(titulo, detalhe)
      lista.appendChild(item)
    })
  }

  document.getElementById('botao-iniciar').addEventListener('click', () => {
    if (!dados.emAndamento) {
      const letra = proximaFicha()
      const ficha = montarFicha(letra)
      dados.emAndamento = { ficha: letra, inicio: Date.now(), feitas: ficha.exercicios.map(() => 0) }
      guardar()
    }
    irPara('execucao')
    desenharExecucao()
  })

  // ---------- Tela: treino em andamento ----------
  let intervaloCronometro = null

  function desenharExecucao () {
    const andamento = dados.emAndamento
    if (!andamento) { irPara('hoje'); return }
    const ficha = montarFicha(andamento.ficha)
    if (andamento.feitas.length !== ficha.exercicios.length) {
      andamento.feitas = ficha.exercicios.map((_, i) => Math.min(andamento.feitas[i] || 0, ficha.exercicios[i].series))
    }
    document.getElementById('exec-titulo').textContent = `Treino ${ficha.letra} · ${ficha.nome}`

    const caixa = document.getElementById('exec-exercicios')
    caixa.replaceChildren()
    ficha.exercicios.forEach((ex, i) => {
      const cartao = document.createElement('div')
      cartao.className = 'cartao-exercicio' + (andamento.feitas[i] >= ex.series ? ' concluido' : '')
      cartao.style.animationDelay = `${i * 50}ms`

      const topo = document.createElement('div')
      topo.className = 'd-flex justify-content-between align-items-start mb-2'
      const nome = document.createElement('strong')
      nome.textContent = ex.nome
      const meta = document.createElement('small')
      meta.className = 'text-body-secondary text-nowrap ms-2'
      meta.textContent = `${ex.series} × ${ex.reps}` + (ex.descanso ? ` · ${ex.descanso}s` : '')
      topo.append(nome, meta)

      const series = document.createElement('div')
      series.className = 'series'
      for (let s = 0; s < ex.series; s++) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'serie' + (s < andamento.feitas[i] ? ' feita' : '')
        if (s < andamento.feitas[i]) b.innerHTML = ICONE_CHECK; else b.textContent = String(s + 1)
        b.setAttribute('aria-label', `${ex.nome}, série ${s + 1} de ${ex.series}`)
        b.setAttribute('aria-pressed', String(s < andamento.feitas[i]))
        b.addEventListener('click', () => marcarSerie(i, s, ficha))
        series.appendChild(b)
      }
      cartao.append(topo, series)
      caixa.appendChild(cartao)
    })
    atualizarProgresso(ficha)

    clearInterval(intervaloCronometro)
    const cron = document.getElementById('cronometro')
    const tick = () => { cron.textContent = mmss((Date.now() - andamento.inicio) / 1000) }
    tick()
    intervaloCronometro = setInterval(tick, 1000)
  }

  function atualizarProgresso (ficha) {
    const total = ficha.exercicios.reduce((s, e) => s + e.series, 0)
    const feitas = dados.emAndamento.feitas.reduce((s, n) => s + n, 0)
    const pct = Math.round((feitas / total) * 100)
    document.getElementById('exec-progresso').style.width = `${pct}%`
    const barra = document.getElementById('exec-progresso-barra')
    if (barra) { barra.setAttribute('aria-valuenow', String(pct)); barra.setAttribute('aria-valuetext', `${feitas} de ${total} séries`) }
    return { total, feitas }
  }

  function marcarSerie (i, s, ficha) {
    const andamento = dados.emAndamento
    const ex = ficha.exercicios[i]
    const desmarcar = s < andamento.feitas[i]
    andamento.feitas[i] = desmarcar ? s : s + 1
    guardar()
    desenharExecucao()
    const botaoAtual = document.querySelectorAll('.cartao-exercicio')[i]?.querySelectorAll('.serie')[s]
    if (botaoAtual) botaoAtual.focus({ preventScroll: true })
    if (desmarcar) { anunciar(`Série ${s + 1} de ${ex.nome} desmarcada.`); return }
    anunciar(`Série ${s + 1} de ${ex.nome} concluída.`)
    if (navigator.vibrate) navigator.vibrate(30)
    const { total, feitas } = atualizarProgresso(ficha)
    if (feitas >= total) { finalizar(); return }
    if (ex.descanso) {
      let proximo
      if (andamento.feitas[i] < ex.series) proximo = `Próximo: ${ex.nome}, série ${andamento.feitas[i] + 1}`
      else {
        const seguinte = ficha.exercicios.findIndex((e, j) => andamento.feitas[j] < e.series)
        proximo = seguinte >= 0 ? `Próximo: ${ficha.exercicios[seguinte].nome}` : ''
      }
      iniciarDescanso(ex.descanso, proximo)
    }
  }

  // Timer de descanso
  const telaDescanso = document.getElementById('descanso')
  const anel = document.getElementById('anel-valor')
  const CIRCUNFERENCIA = 2 * Math.PI * 52
  anel.style.strokeDasharray = CIRCUNFERENCIA
  let descanso = null

  function iniciarDescanso (segundos, proximo) {
    pararDescanso()
    descanso = { fim: Date.now() + segundos * 1000, total: segundos }
    document.getElementById('descanso-proximo').textContent = proximo
    abrirSobreposicao(telaDescanso, document.getElementById('descanso-pular'))
    anunciar(`Descanso de ${segundos} segundos. ${proximo}`)
    const tick = () => {
      const restante = Math.max(0, (descanso.fim - Date.now()) / 1000)
      document.getElementById('descanso-tempo').textContent = mmss(Math.ceil(restante))
      anel.style.strokeDashoffset = CIRCUNFERENCIA * (1 - restante / descanso.total)
      if (restante <= 0) {
        if (navigator.vibrate) navigator.vibrate([120, 80, 120])
        bip()
        pararDescanso()
        anunciar('Descanso terminado. Hora da próxima série!')
      }
    }
    tick()
    descanso.intervalo = setInterval(tick, 200)
  }

  function pararDescanso () {
    const estavaAberto = Boolean(descanso)
    if (descanso) clearInterval(descanso.intervalo)
    descanso = null
    if (estavaAberto) fecharSobreposicao(telaDescanso)
    else telaDescanso.classList.add('d-none')
  }

  function bip () {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.frequency.value = 880
      vol.gain.setValueAtTime(0.2, ctx.currentTime)
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(vol).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (erro) {}
  }

  document.getElementById('descanso-pular').addEventListener('click', pararDescanso)
  document.getElementById('descanso-mais').addEventListener('click', () => {
    if (!descanso) return
    descanso.fim += 15000
    descanso.total += 15
  })
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    if (descanso) pararDescanso()
    else if (!document.getElementById('comemoracao').classList.contains('d-none')) document.getElementById('comemoracao-ok').click()
  })

  document.getElementById('botao-pausar').addEventListener('click', () => {
    clearInterval(intervaloCronometro)
    pararDescanso()
    irPara('hoje')
  })

  document.getElementById('botao-cancelar').addEventListener('click', () => {
    if (!window.confirm('Cancelar este treino? O que você marcou não será salvo.')) return
    clearInterval(intervaloCronometro)
    pararDescanso()
    dados.emAndamento = null
    guardar()
    irPara('hoje')
  })

  document.getElementById('botao-finalizar').addEventListener('click', () => {
    const feitas = dados.emAndamento ? dados.emAndamento.feitas.reduce((s, n) => s + n, 0) : 0
    if (!feitas) {
      window.alert('Marque pelo menos uma série antes de finalizar.')
      return
    }
    finalizar()
  })

  function finalizar () {
    const andamento = dados.emAndamento
    if (!andamento) return
    clearInterval(intervaloCronometro)
    pararDescanso()
    const registro = {
      id: TF.novoId(),
      ficha: andamento.ficha,
      inicio: andamento.inicio,
      fim: Date.now(),
      series: andamento.feitas.reduce((s, n) => s + n, 0)
    }
    dados.historico.push(registro)
    dados.emAndamento = null
    guardar()
    const minutos = Math.max(1, Math.round((registro.fim - registro.inicio) / 60000))
    const dias = sequenciaDias()
    document.getElementById('comemoracao-texto').textContent =
      `${TF.plural(registro.series, 'série', 'séries')} em ${minutos} min. ` +
      (dias > 1 ? `Você está há ${dias} dias seguidos treinando.` : 'Volte amanhã para começar uma sequência.')
    soltarConfete()
    abrirSobreposicao(document.getElementById('comemoracao'), document.getElementById('comemoracao-ok'))
  }

  function soltarConfete () {
    const caixa = document.getElementById('confete')
    caixa.replaceChildren()
    if (TF.reduzirMovimento()) return
    const cores = ['#ff6a1a', '#ffb347', '#5eead4', '#c084fc', '#fde68a']
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('i')
      p.style.left = `${Math.random() * 100}%`
      p.style.background = cores[i % cores.length]
      p.style.animationDelay = `${Math.random() * 0.6}s`
      p.style.animationDuration = `${2 + Math.random() * 1.5}s`
      p.style.setProperty('--giro', `${Math.random() * 720 - 360}deg`)
      caixa.appendChild(p)
    }
  }

  document.getElementById('comemoracao-ok').addEventListener('click', () => {
    fecharSobreposicao(document.getElementById('comemoracao'))
    irPara('hoje')
  })

  // ---------- Tela: Treinos (fichas) ----------
  let fichaAberta = 'A'
  function desenharTreinos () {
    document.getElementById('treinos-info').textContent =
      `Divisão ABC para ${(aluno.objetivo || 'Hipertrofia').toLowerCase()}, nível ${(aluno.nivel || 'Intermediário').toLowerCase()}. O próximo é o treino ${proximaFicha()}.`
    const abas = document.getElementById('abas-fichas')
    abas.replaceChildren()
    Object.keys(FICHAS_BASE).forEach(letra => {
      const li = document.createElement('li')
      li.className = 'nav-item'
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'nav-link' + (letra === fichaAberta ? ' active' : '')
      b.textContent = `Treino ${letra}`
      b.setAttribute('aria-pressed', String(letra === fichaAberta))
      b.addEventListener('click', () => {
        fichaAberta = letra
        desenharTreinos()
        const novo = [...document.querySelectorAll('#abas-fichas button')].find(x => x.textContent === `Treino ${letra}`)
        if (novo) novo.focus()
      })
      li.appendChild(b)
      abas.appendChild(li)
    })
    const ficha = montarFicha(fichaAberta)
    const det = document.getElementById('ficha-detalhe')
    det.replaceChildren()
    const titulo = document.createElement('p')
    titulo.className = 'fw-semibold mb-2'
    titulo.textContent = `${ficha.nome} · cerca de ${ficha.minutos} min`
    det.appendChild(titulo)
    const lista = document.createElement('ol')
    lista.className = 'list-group list-group-numbered'
    ficha.exercicios.forEach(ex => {
      const li = document.createElement('li')
      li.className = 'list-group-item d-flex justify-content-between align-items-start'
      const nome = document.createElement('div')
      nome.className = 'ms-2 me-auto'
      nome.textContent = ex.nome
      const meta = document.createElement('span')
      meta.className = 'badge text-bg-secondary rounded-pill'
      meta.textContent = `${ex.series} × ${ex.reps}`
      li.append(nome, meta)
      lista.appendChild(li)
    })
    det.appendChild(lista)
    const instrutor = TF.mapaInstrutores().get(aluno.instrutorId)
    const nota = document.createElement('p')
    nota.className = 'small text-body-secondary mt-3'
    nota.textContent = instrutor
      ? `Dúvidas na execução? Fale com ${instrutor.nome} (${instrutor.especialidade}, turno ${instrutor.turno.toLowerCase()}).`
      : 'Dúvidas na execução? Peça ajuda a um instrutor na academia.'
    det.appendChild(nota)
  }

  // ---------- Tela: Progresso ----------
  function desenharProgresso () {
    // Treinos por semana (últimas 8 semanas)
    const grafico = document.getElementById('grafico-semanas')
    grafico.replaceChildren()
    const estaSemana = inicioDaSemana(Date.now())
    const semanas = Array.from({ length: 8 }, (_, i) => estaSemana - (7 - i) * 7 * DIA)
    const contagens = semanas.map(ini => dados.historico.filter(h => h.fim >= ini && h.fim < ini + 7 * DIA).length)
    const maximo = Math.max(3, ...contagens)
    grafico.setAttribute('role', 'img')
    grafico.setAttribute('aria-label', 'Treinos por semana nas últimas 8 semanas: ' +
      semanas.map((ini, i) => `semana de ${new Date(ini).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${contagens[i]}`).join('; '))
    semanas.forEach((ini, i) => {
      const coluna = document.createElement('div')
      coluna.className = 'coluna-semana'
      const barra = document.createElement('div')
      barra.className = 'barra-semana' + (i === 7 ? ' atual' : '')
      barra.style.setProperty('--altura', `${(contagens[i] / maximo) * 100}%`)
      barra.style.animationDelay = `${i * 60}ms`
      barra.title = `${contagens[i]} treino(s)`
      const valor = document.createElement('small')
      valor.textContent = contagens[i]
      const rotulo = document.createElement('span')
      rotulo.textContent = new Date(ini).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      coluna.append(valor, barra, rotulo)
      grafico.appendChild(coluna)
    })

    // Peso (dado de saúde: só com consentimento específico, art. 11 da LGPD)
    const consentiu = Boolean(dados.consentimentoPeso)
    document.getElementById('consentimento-peso').classList.toggle('d-none', consentiu)
    document.getElementById('area-peso').classList.toggle('d-none', !consentiu)
    if (!consentiu) return
    const pesos = dados.pesos.slice().sort((a, b) => a.data - b.data)
    const caixa = document.getElementById('grafico-peso')
    const variacao = document.getElementById('peso-variacao')
    if (pesos.length < 2) {
      caixa.innerHTML = '<p class="text-body-secondary small mb-0">Registre seu peso pelo menos duas vezes para ver o gráfico.</p>'
      variacao.textContent = pesos.length ? `${pesos[0].kg.toLocaleString('pt-BR')} kg` : ''
      return
    }
    const L = 320; const A = 140; const m = 24
    const ks = pesos.map(p => p.kg)
    const min = Math.min(...ks) - 0.5; const max = Math.max(...ks) + 0.5
    const x = i => m + (i / (pesos.length - 1)) * (L - 2 * m)
    const y = kg => A - m - ((kg - min) / (max - min)) * (A - 2 * m)
    const pontos = pesos.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
    const ultimos = pesos.slice(-1)[0]
    const diff = ultimos.kg - pesos[0].kg
    variacao.textContent = `${ultimos.kg.toLocaleString('pt-BR')} kg (${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg)`
    caixa.innerHTML = `<svg viewBox="0 0 ${L} ${A}" class="grafico-linha" role="img" aria-label="Evolução do peso: de ${pesos[0].kg} para ${ultimos.kg} kg">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a1a" stop-opacity=".35"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${x(0)},${A - m} ${pontos} ${x(pesos.length - 1)},${A - m}" fill="url(#area)"/>
      <polyline points="${pontos}" fill="none" stroke="#ff6a1a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="linha-peso"/>
      ${pesos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.kg)}" r="4" fill="#fff" stroke="#ff6a1a" stroke-width="2"><title>${new Date(p.data).toLocaleDateString('pt-BR')}: ${p.kg} kg</title></circle>`).join('')}
      <text x="${x(0)}" y="${A - 6}" font-size="10" fill="currentColor" opacity=".6">${new Date(pesos[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>
      <text x="${x(pesos.length - 1)}" y="${A - 6}" font-size="10" fill="currentColor" opacity=".6" text-anchor="end">${new Date(ultimos.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>
    </svg>`
  }

  document.getElementById('botao-autoriza-peso').addEventListener('click', () => {
    const caixa = document.getElementById('autoriza-peso')
    if (!caixa.checked) {
      caixa.setAttribute('aria-invalid', 'true')
      caixa.focus()
      anunciar('Marque a autorização para registrar o peso.')
      return
    }
    caixa.removeAttribute('aria-invalid')
    dados.consentimentoPeso = { data: new Date().toISOString() }
    guardar()
    desenharProgresso()
    document.getElementById('peso').focus()
  })

  document.getElementById('botao-revogar-peso').addEventListener('click', () => {
    if (!window.confirm('Apagar todos os seus registros de peso e retirar a autorização?')) return
    dados.pesos = []
    dados.consentimentoPeso = null
    guardar()
    document.getElementById('autoriza-peso').checked = false
    desenharProgresso()
    anunciar('Registros de peso apagados e autorização retirada.')
  })

  document.getElementById('form-peso').addEventListener('submit', e => {
    e.preventDefault()
    const campo = document.getElementById('peso')
    const kg = Math.round(parseFloat(String(campo.value).replace(',', '.')) * 10) / 10
    if (!dados.consentimentoPeso) return
    if (!(kg >= 30 && kg <= 300)) { campo.classList.add('is-invalid'); campo.setAttribute('aria-invalid', 'true'); campo.focus(); return }
    campo.classList.remove('is-invalid')
    campo.removeAttribute('aria-invalid')
    const hoje = inicioDoDia(Date.now())
    dados.pesos = dados.pesos.filter(p => inicioDoDia(p.data) !== hoje) // um registro por dia
    dados.pesos.push({ data: Date.now(), kg })
    guardar()
    campo.value = ''
    desenharProgresso()
    anunciar(`Peso de ${kg.toLocaleString('pt-BR')} quilos registrado.`)
  })

  // ---------- Tela: Perfil ----------
  function desenharPerfil () {
    aluno = TF.alunoLogado() || aluno
    const iniciais = aluno.nome.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
    document.getElementById('avatar').textContent = iniciais
    document.getElementById('perfil-nome').textContent = aluno.nome
    document.getElementById('perfil-email').textContent = aluno.email
    const instrutor = TF.mapaInstrutores().get(aluno.instrutorId)
    const linhas = [
      ['Plano', `${aluno.plano} (${TF.formatarMoeda(TF.PLANOS[aluno.plano] || 0)}/mês)`],
      ['Instrutor', instrutor ? instrutor.nome : 'Sem instrutor'],
      ['Telefone', aluno.telefone],
      ['CPF', aluno.cpf ? aluno.cpf.replace(/^\d{3}\.\d{3}/, '***.***') : '-']
    ]
    const dl = document.getElementById('perfil-dados')
    dl.replaceChildren()
    linhas.forEach(([t, v]) => {
      const dt = document.createElement('dt'); dt.className = 'col-4 text-body-secondary fw-normal'; dt.textContent = t
      const dd = document.createElement('dd'); dd.className = 'col-8 mb-1'; dd.textContent = v
      dl.append(dt, dd)
    })
    document.getElementById('perfil-objetivo').value = aluno.objetivo || 'Hipertrofia'
    document.getElementById('perfil-nivel').value = aluno.nivel || 'Intermediário'
    document.getElementById('corrigir-nome').value = aluno.nome
    document.getElementById('corrigir-email').value = aluno.email
    document.getElementById('corrigir-telefone').value = aluno.telefone
    const c = aluno.consentimentos
    const dataBR = iso => new Date(iso).toLocaleDateString('pt-BR')
    document.getElementById('info-consentimentos').textContent =
      (c ? `Você aceitou os termos e a política de privacidade em ${dataBR(c.data)}. ` : 'Cadastro feito pela academia. ') +
      (dados.consentimentoPeso ? `Autorizou o registro de peso em ${dataBR(dados.consentimentoPeso.data)}.` : 'Você não autorizou o registro de peso.')
    if (aluno.demo) {
      TF.mostrarMensagem('Você está na conta de demonstração. Para salvar seus próprios treinos, crie a sua conta.', 'info')
    }
  }

  document.getElementById('form-perfil').addEventListener('submit', e => {
    e.preventDefault()
    const alunos = TF.carregar('alunos')
    const i = alunos.findIndex(a => a.id === aluno.id)
    if (i === -1) { TF.sairAluno(); return }
    alunos[i].objetivo = document.getElementById('perfil-objetivo').value
    alunos[i].nivel = document.getElementById('perfil-nivel').value
    TF.salvar('alunos', alunos)
    aluno = alunos[i]
    TF.mostrarMensagem('Pronto! Seus treinos foram ajustados.')
  })

  const campoTel = document.getElementById('corrigir-telefone')
  campoTel.addEventListener('input', () => { campoTel.value = TF.mascaraTelefone(campoTel.value) })
  document.getElementById('form-corrigir').addEventListener('submit', e => {
    e.preventDefault()
    const form = e.currentTarget
    const email = document.getElementById('corrigir-email')
    const alunos = TF.carregar('alunos')
    const repetido = alunos.some(a => a.id !== aluno.id && (a.email || '').toLowerCase() === email.value.trim().toLowerCase())
    email.setCustomValidity(repetido ? 'repetido' : '')
    document.getElementById('corrigir-email-erro').textContent = repetido ? 'Este email já está em uso por outra conta.' : 'Informe um email válido.'
    TF.marcarInvalidos(form)
    if (!form.checkValidity()) {
      form.classList.add('was-validated')
      form.querySelector('input:invalid, select:invalid').focus()
      return
    }
    const i = alunos.findIndex(a => a.id === aluno.id)
    if (i === -1) { TF.sairAluno(); return }
    alunos[i].nome = document.getElementById('corrigir-nome').value.trim()
    alunos[i].email = email.value.trim().toLowerCase()
    alunos[i].telefone = campoTel.value.trim()
    TF.salvar('alunos', alunos)
    aluno = alunos[i]
    form.classList.remove('was-validated')
    desenharPerfil()
    TF.mostrarMensagem('Seus dados foram corrigidos.')
  })
  document.getElementById('corrigir-email').addEventListener('input', e => e.target.setCustomValidity(''))

  // Portabilidade / acesso (art. 18 da LGPD): baixa tudo o que existe sobre o aluno, sem a senha.
  document.getElementById('botao-baixar-dados').addEventListener('click', () => {
    const { senha, ...cadastro } = aluno
    const instrutor = TF.mapaInstrutores().get(aluno.instrutorId)
    const conteudo = {
      geradoEm: new Date().toISOString(),
      controlador: 'Titan Fit (empresa fictícia, projeto acadêmico)',
      cadastro: { ...cadastro, instrutor: instrutor ? instrutor.nome : null },
      treinos: dados.historico.map(h => ({ ...h, inicio: new Date(h.inicio).toISOString(), fim: new Date(h.fim).toISOString() })),
      pesos: dados.pesos.map(p => ({ data: new Date(p.data).toISOString(), kg: p.kg })),
      consentimentoPeso: dados.consentimentoPeso || null
    }
    const arquivo = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(arquivo)
    link.download = `meus-dados-titan-fit-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    anunciar('Arquivo com os seus dados baixado.')
  })

  // Tema escolhido no perfil (no celular, o botão flutuante de tema fica escondido)
  function marcarTemaPerfil () {
    let tema = 'auto'
    try { tema = localStorage.getItem('theme') || 'auto' } catch (erro) {}
    document.querySelectorAll('[data-tema-perfil]').forEach(b => {
      const ativo = b.dataset.bsThemeValue === tema
      b.classList.toggle('active', ativo)
      b.setAttribute('aria-pressed', String(ativo))
    })
  }
  document.querySelectorAll('[data-tema-perfil]').forEach(b => b.addEventListener('click', () => setTimeout(marcarTemaPerfil, 0)))
  document.querySelectorAll('.bd-mode-toggle [data-bs-theme-value]').forEach(b => b.addEventListener('click', () => setTimeout(marcarTemaPerfil, 0)))
  marcarTemaPerfil()

  document.getElementById('botao-sair').addEventListener('click', () => TF.sairAluno())
  document.getElementById('botao-excluir-conta').addEventListener('click', () => {
    if (!window.confirm('Excluir sua conta e todo o seu histórico de treinos? Isso não pode ser desfeito.')) return
    TF.salvar('alunos', TF.carregar('alunos').filter(a => a.id !== aluno.id))
    try { localStorage.removeItem(TF.chaveTreinos(aluno.id)) } catch (erro) {}
    TF.sairAluno()
  })

  // ---------- Início ----------
  if (dados.emAndamento) {
    irPara('execucao')
    desenharExecucao()
  } else {
    irPara('hoje')
  }
})()
