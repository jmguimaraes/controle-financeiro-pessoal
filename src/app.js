(function () {
  const logica = typeof require !== 'undefined' ? require('./logic.js') : window;
  const renderizacao = typeof require !== 'undefined' ? require('./render.js') : window;
  const { uid, applyAction, estadoInicial, hashSimples } = logica;
  const {
    renderResumo,
    renderLancamentos,
    renderNovoLancamento,
    renderCategoriaDetalhe,
    renderMetas,
    renderConfiguracoes,
    renderImportarPlanilha,
    renderAbertura,
    renderInvestimentos,
    renderAtivoDetalhe,
    renderPin,
    renderCalculadoras,
  } = renderizacao;

  const CHAVE_ONBOARDING = 'nuvra-onboarding-visto';
  const CHAVE_PIN = 'nuvra-pin-hash';

  let state = estadoInicial();
  let artifactApi = null;
  let anoAtual;
  let mesAtual;
  let somenteLeitura = false;

  let abaAtual = 'resumo'; // resumo | lancamentos | carteira | metas — última aba principal visitada
  let telaAtual = 'resumo'; // aba atual + categoria | novo-lancamento | configuracoes | ativo-detalhe
  let categoriaAberta = null;
  let ativoAberto = null;
  let diaAberto = null; // data YYYY-MM-DD aberta a partir do calendário
  let busca = '';
  let filtroLancamentos = 'todos';
  let contaSelecionada = null;
  let rascunhoLancamento = null; // dados em edição na tela de novo lançamento
  let descricaoSincronizacao = 'Verificando…';
  let calculadoraAtiva = 'compostos'; // compostos | simples | porcentagem | milhao
  let importCSV = null; // tela de importação: null | {texto,colunas,linhas,sugestao} | {...,resultado}
  let modoMilhao = 'tempo'; // tempo | aporte — qual variável a calculadora "primeiro milhão" resolve

  async function iniciar() {
    const hoje = new Date();
    anoAtual = hoje.getFullYear();
    mesAtual = hoje.getMonth() + 1;

    await carregarEstado();
    try {
      artifactApi = window.claude ? await window.claude.use('artifact') : null;
    } catch (erro) {
      artifactApi = null;
    }
    descricaoSincronizacao = artifactApi ? 'Ativa' : 'Indisponível neste dispositivo';
    aplicarTema(state.tema);
    inicializarCombosEstaticos();
    ligarEventos();

    if (localStorage_get(CHAVE_PIN)) {
      mostrarTelaPin();
    } else {
      prosseguirAposPin();
    }
  }

  function prosseguirAposPin() {
    if (localStorage_get(CHAVE_ONBOARDING)) {
      mostrarApp();
    } else {
      mostrarAbertura();
    }
  }

  function mostrarTelaPin(erro) {
    document.getElementById('tela-pin').hidden = false;
    document.getElementById('tela-pin').innerHTML = renderPin(erro);
    document.getElementById('tela-abertura').hidden = true;
    document.getElementById('app-shell').hidden = true;
    const campo = document.querySelector('#formulario-pin [name="pin"]');
    if (campo) campo.focus();
  }

  function localStorage_get(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (erro) {
      return null;
    }
  }

  function localStorage_set(chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch (erro) {
      // localStorage indisponível — onboarding vai reaparecer, sem problema
    }
  }

  function mostrarAbertura() {
    document.getElementById('tela-pin').hidden = true;
    document.getElementById('tela-abertura').hidden = false;
    document.getElementById('tela-abertura').innerHTML = renderAbertura();
    document.getElementById('app-shell').hidden = true;
  }

  function mostrarApp() {
    document.getElementById('tela-pin').hidden = true;
    document.getElementById('tela-abertura').hidden = true;
    document.getElementById('app-shell').hidden = false;
    renderizarTudo();
  }

  async function carregarEstado() {
    let carregado = null;
    try {
      const resposta = await fetch('data/state.json');
      if (resposta.ok) carregado = await resposta.json();
    } catch (erro) {
      // sem dado publicado ainda, ou sem rede — segue com estado vazio/local
    }
    if (!carregado) carregado = lerBackupLocal();
    // Semente da build de demonstração (ver build-demo.js): entra por último, então quem abrir a
    // demo e mexer nos dados continua vendo as próprias alterações nas visitas seguintes. Na build
    // normal window.NUVRA_SEED não existe e esta linha não faz nada.
    if (!carregado && typeof window !== 'undefined' && window.NUVRA_SEED) carregado = window.NUVRA_SEED;
    if (carregado) state = { ...estadoInicial(), ...carregado };
  }

  function lerBackupLocal() {
    try {
      const bruto = localStorage.getItem('controle-financeiro-backup');
      return bruto ? JSON.parse(bruto) : null;
    } catch (erro) {
      return null;
    }
  }

  function salvarBackupLocal() {
    try {
      localStorage.setItem('controle-financeiro-backup', JSON.stringify(state));
    } catch (erro) {
      // localStorage indisponível — não é a fonte da verdade, pode ignorar
    }
  }

  // Campos de valor monetário (.nv-campo-moeda) são <input type="text">, não number, porque um
  // number input nunca exibe vírgula decimal (só ponto, mesmo em pt-BR) — essas duas funções
  // convertem entre o texto exibido ("1.234,56") e o número usado no resto do app.
  function numeroDoCampoMoeda(texto) {
    if (!texto) return 0;
    const numero = Number(String(texto).trim().replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarCampoMoeda(elemento) {
    const bruto = elemento.value.trim();
    if (!bruto) return;
    const numero = numeroDoCampoMoeda(bruto);
    elemento.value = renderizacao.formatNumero(numero);
  }

  // Combobox custom (ver render.js renderComboSelect/renderComboBusca) — funções de apoio pra
  // abrir/fechar, selecionar item e definir valor programaticamente (prefill em modo de edição).
  function fecharTodosCombos() {
    document.querySelectorAll('.nv-combo-lista').forEach((lista) => {
      lista.hidden = true;
    });
  }

  function selecionarItemCombo(combo, valor, rotulo) {
    const inputBusca = combo.querySelector('.nv-combo-input');
    if (inputBusca) {
      inputBusca.value = valor;
      return;
    }
    definirComboPorValor(combo, valor, rotulo);
  }

  function definirComboPorValor(combo, valor, rotuloConhecido) {
    if (!combo) return;
    const oculto = combo.querySelector('input[type="hidden"]');
    if (oculto) oculto.value = valor;
    const item = combo.querySelector(`.nv-combo-item[data-valor="${(window.CSS && CSS.escape) ? CSS.escape(String(valor)) : valor}"]`);
    const rotulo = rotuloConhecido || (item ? item.dataset.rotulo : valor);
    const gatilhoValor = combo.querySelector('.nv-combo-valor');
    if (gatilhoValor) gatilhoValor.textContent = rotulo;
    combo.querySelectorAll('.nv-combo-item').forEach((it) => it.classList.toggle('ativo', it.dataset.valor === valor));
  }

  const OPCOES_TIPO_OPERACAO = [
    { valor: 'compra', rotulo: 'Compra' },
    { valor: 'venda', rotulo: 'Venda' },
  ];
  const OPCOES_TIPO_CONTA = [
    { valor: 'conta', rotulo: 'Conta corrente' },
    { valor: 'cartao', rotulo: 'Cartão' },
    { valor: 'carteira', rotulo: 'Carteira' },
  ];
  const OPCOES_TIPO_PROVENTO = [
    { valor: 'dividendo', rotulo: 'Dividendo' },
    { valor: 'jcp', rotulo: 'JCP' },
  ];
  const OPCOES_TIPO_DIVIDA = [
    { valor: 'financiamento_imobiliario', rotulo: 'Financiamento imobiliário' },
    { valor: 'financiamento_veiculo', rotulo: 'Financiamento de veículo' },
    { valor: 'emprestimo', rotulo: 'Empréstimo' },
    { valor: 'consignado', rotulo: 'Consignado' },
    { valor: 'cartao', rotulo: 'Cartão de crédito' },
    { valor: 'outro', rotulo: 'Outra dívida' },
  ];
  const CATEGORIAS_META = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Vestuário', 'Outras Despesas'];

  // Combos com opções fixas (não dependem de nenhum outro campo) — populados uma única vez no
  // início. O de nome do ativo (busca) é populado de novo sempre que o tipo de ativo muda.
  function inicializarCombosEstaticos() {
    document.getElementById('combo-tipo-investimento').innerHTML = renderizacao.renderComboSelect('tipo', renderizacao.opcoesTipoInvestimento(), 'acao', 'campo-tipo-investimento');
    document.getElementById('combo-tipo-operacao').innerHTML = renderizacao.renderComboSelect('tipo', OPCOES_TIPO_OPERACAO, 'compra', 'campo-tipo-operacao');
    document.getElementById('combo-tipo-conta').innerHTML = renderizacao.renderComboSelect('tipo', OPCOES_TIPO_CONTA, 'conta', 'campo-tipo-conta');
    document.getElementById('combo-tipo-divida').innerHTML = renderizacao.renderComboSelect('tipo', OPCOES_TIPO_DIVIDA, 'financiamento_imobiliario', 'campo-tipo-divida');
    document.getElementById('combo-tipo-provento').innerHTML = renderizacao.renderComboSelect('tipo', OPCOES_TIPO_PROVENTO, 'dividendo', 'campo-tipo-provento');
    document.getElementById('combo-categoria-meta').innerHTML = renderizacao.renderComboSelect(
      'categoria',
      CATEGORIAS_META.map((c) => ({ valor: c, rotulo: c })),
      'Moradia',
      'campo-categoria-meta'
    );
    atualizarSugestoesAtivo('acao');
  }

  // Repopula o combo de busca de nome/ticker de acordo com o tipo de ativo escolhido — é só um
  // ponto de partida (lista fixa embutida no app, sem cotação nenhuma); o campo continua
  // aceitando qualquer texto digitado que não esteja na lista.
  function atualizarSugestoesAtivo(tipo) {
    const container = document.getElementById('combo-nome-ativo');
    if (!container) return;
    const inputAnterior = container.querySelector('.nv-combo-input');
    const valorAtual = inputAnterior ? inputAnterior.value : '';
    container.innerHTML = renderizacao.renderComboBusca('nome', valorAtual, logica.listaSugeridaPorTipo(tipo), 'campo-nome-ativo');
    // Reaplica o filtro do que já tinha sido digitado em cima da lista nova (a lista em si vem
    // fechada por padrão — só isso já evita mostrar sugestões de um tipo antigo se a pessoa
    // reabrir o campo depois de trocar o tipo).
    if (valorAtual) filtrarComboBusca(container, valorAtual);
  }

  // Esconde/mostra os itens de um combo de busca conforme o texto digitado, e mostra a
  // mensagem de "nenhuma sugestão" quando o filtro não bate com nada da lista.
  function filtrarComboBusca(combo, textoDigitado) {
    const lista = combo.querySelector('.nv-combo-lista');
    const termo = textoDigitado.trim().toUpperCase();
    let algumVisivel = false;
    lista.querySelectorAll('.nv-combo-item').forEach((item) => {
      const visivel = !termo || item.dataset.valor.toUpperCase().includes(termo);
      item.hidden = !visivel;
      if (visivel) algumVisivel = true;
    });
    const vazio = lista.querySelector('.nv-combo-vazio');
    if (vazio) vazio.hidden = algumVisivel;
  }

  function aplicarTema(tema) {
    const raiz = document.documentElement;
    if (tema === 'claro') raiz.dataset.theme = 'light';
    else if (tema === 'escuro') raiz.dataset.theme = 'dark';
    else delete raiz.dataset.theme;
  }

  function renderizarTudo() {
    document.getElementById('tela-resumo').innerHTML = renderResumo(state, anoAtual, mesAtual);
    document.getElementById('tela-lancamentos').innerHTML = renderLancamentos(state, anoAtual, mesAtual, {
      busca,
      filtro: filtroLancamentos,
      contaSelecionada,
    });
    document.getElementById('tela-carteira').innerHTML = renderInvestimentos(state);
    document.getElementById('tela-metas').innerHTML = renderMetas(state, anoAtual, mesAtual);

    if (telaAtual === 'categoria' && categoriaAberta) {
      document.getElementById('tela-categoria').innerHTML = renderCategoriaDetalhe(state, categoriaAberta, anoAtual, mesAtual);
    }
    if (telaAtual === 'ativo-detalhe' && ativoAberto) {
      document.getElementById('tela-ativo-detalhe').innerHTML = renderAtivoDetalhe(state, ativoAberto);
    }
    if (telaAtual === 'novo-lancamento') {
      document.getElementById('tela-novo-lancamento').innerHTML = renderNovoLancamento(state, rascunhoLancamento);
      atualizarSaldoProjetado();
    }
    if (telaAtual === 'configuracoes') {
      document.getElementById('tela-configuracoes').innerHTML = renderConfiguracoes(state, !!localStorage_get(CHAVE_PIN));
      const statusEl = document.getElementById('status-sincronizacao');
      if (statusEl) statusEl.textContent = descricaoSincronizacao;
    }
    document.getElementById('tela-calendario').innerHTML = renderizacao.renderCalendario(state, anoAtual, mesAtual, state.idioma);
    if (telaAtual === 'dia' && diaAberto) {
      document.getElementById('tela-dia').innerHTML = renderizacao.renderDiaDetalhe(state, diaAberto, state.idioma);
    }
    if (telaAtual === 'calculadoras') {
      document.getElementById('tela-calculadoras').innerHTML = renderCalculadoras(calculadoraAtiva, modoMilhao);
    }
    if (telaAtual === 'importar') {
      document.getElementById('tela-importar').innerHTML = renderImportarPlanilha(state, importCSV);
    }

    const telas = ['resumo', 'lancamentos', 'carteira', 'metas', 'calendario', 'dia', 'categoria', 'ativo-detalhe', 'novo-lancamento', 'configuracoes', 'importar', 'calculadoras'];
    for (const nome of telas) {
      document.getElementById(`tela-${nome}`).hidden = nome !== telaAtual;
    }
    document.body.classList.toggle('somente-leitura', somenteLeitura);
  }

  function irParaAba(nome) {
    abaAtual = nome;
    telaAtual = nome;
    categoriaAberta = null;
    renderizarTudo();
  }

  function abrirCategoria(categoria) {
    categoriaAberta = categoria;
    telaAtual = 'categoria';
    renderizarTudo();
  }

  function fecharCategoria() {
    categoriaAberta = null;
    telaAtual = abaAtual;
    renderizarTudo();
  }

  function abrirAtivo(id) {
    ativoAberto = id;
    telaAtual = 'ativo-detalhe';
    renderizarTudo();
  }

  function fecharAtivo() {
    ativoAberto = null;
    telaAtual = abaAtual;
    renderizarTudo();
  }

  function abrirConfiguracoes() {
    telaAtual = 'configuracoes';
    renderizarTudo();
  }

  function fecharConfiguracoes() {
    telaAtual = abaAtual;
    renderizarTudo();
  }

  function abrirCalculadoras() {
    calculadoraAtiva = 'compostos';
    modoMilhao = 'tempo';
    telaAtual = 'calculadoras';
    renderizarTudo();
  }

  function fecharCalculadoras() {
    telaAtual = abaAtual;
    renderizarTudo();
  }

  function abrirImportacao() {
    importCSV = null;
    telaAtual = 'importar';
    renderizarTudo();
  }

  function fecharImportacao() {
    importCSV = null;
    telaAtual = 'configuracoes';
    renderizarTudo();
  }

  function analisarCSVDaTela() {
    const area = document.getElementById('campo-texto-csv');
    const texto = area ? area.value.trim() : '';
    if (!texto) {
      alert('Escolha um arquivo CSV ou cole o conteúdo.');
      return;
    }
    aplicarAnaliseCSV(texto);
  }

  function lerArquivoCSV(arquivo) {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => aplicarAnaliseCSV(String(leitor.result || ''));
    leitor.onerror = () => alert('Não consegui ler esse arquivo.');
    leitor.readAsText(arquivo);
  }

  function aplicarAnaliseCSV(texto) {
    const analise = logica.analisarPlanilha(texto);
    if (!analise.colunas.length || !analise.linhas.length) {
      alert('A planilha parece vazia ou sem linhas de dados.');
      return;
    }
    importCSV = { texto, ...analise };
    renderizarTudo();
  }

  function confirmarImportacao() {
    const indiceDoCampo = (id) => {
      const el = document.getElementById(id);
      return el && el.value !== '' ? Number(el.value) : null;
    };
    const mapa = {
      data: indiceDoCampo('map-data'),
      valor: indiceDoCampo('map-valor'),
      descricao: indiceDoCampo('map-descricao'),
      categoria: indiceDoCampo('map-categoria'),
      parcelas: indiceDoCampo('map-parcelas'),
      conta: indiceDoCampo('map-conta'),
    };
    if (mapa.data === null || mapa.valor === null) {
      alert('Escolha pelo menos as colunas de data e valor.');
      return;
    }
    const contaEl = document.getElementById('import-conta-padrao');
    const { lancamentos, ignoradas } = logica.converterLinhasEmLancamentos(importCSV.linhas, mapa, {
      contaPadraoId: contaEl && contaEl.value ? contaEl.value : null,
      contas: state.contas || [],
    });
    if (!lancamentos.length) {
      alert('Nenhuma linha pôde ser importada. Confira o mapeamento das colunas.');
      return;
    }
    despachar({ type: 'importarLancamentos', lancamentos });
    importCSV = { ...importCSV, resultado: { total: lancamentos.length, ignoradas } };
    renderizarTudo();
  }

  // Lê um campo numérico em texto no padrão pt-BR (vírgula decimal) — mesma regra de
  // numeroDoCampoMoeda, reaproveitada aqui pros campos de taxa/percentual da calculadora, que não
  // são .nv-campo-moeda (não fazem sentido com formatação de milhar tipo "1.234,56").
  function numeroPtBR(elemento) {
    return elemento ? numeroDoCampoMoeda(elemento.value) : 0;
  }

  // Campos de taxa/percentual (não são .nv-campo-moeda) usam um parser mais tolerante: aceita
  // ponto OU vírgula como decimal, porque o teclado numérico de celular normalmente digita ponto —
  // com numeroPtBR (que trata ponto como separador de milhar), digitar "1.5" virava 15 em silêncio.
  function numeroTaxa(elemento) {
    return elemento ? logica.numeroDecimalFlexivel(elemento.value) : 0;
  }

  function mostrarResultadoCalculadora(idResultado, linhasHtml) {
    const resultado = document.getElementById(idResultado);
    resultado.hidden = false;
    resultado.innerHTML = linhasHtml;
  }

  // Escapa mesmo só recebendo rótulo fixo e número formatado hoje: o retorno vai direto pro
  // innerHTML em mostrarResultadoCalculadora, então no dia em que alguém passar texto digitado
  // pelo usuário (o nome de uma meta, por exemplo) isso viraria XSS sem ninguém perceber.
  function linhaResultado(rotulo, valor) {
    const esc = renderizacao.escapeHtml;
    return `<div class="nv-row-plain"><span>${esc(rotulo)}</span><span>${esc(valor)}</span></div>`;
  }

  function calcularJurosCompostos() {
    const r = logica.jurosCompostos({
      capitalInicial: numeroPtBR(document.getElementById('campo-calc-compostos-capital')),
      aporteMensal: numeroPtBR(document.getElementById('campo-calc-compostos-aporte')),
      taxaMensal: numeroTaxa(document.getElementById('campo-calc-compostos-taxa')) / 100,
      meses: Number(document.getElementById('campo-calc-compostos-meses').value) || 0,
    });
    mostrarResultadoCalculadora(
      'resultado-calc-compostos',
      linhaResultado('Montante final', renderizacao.formatCurrency(r.montanteFinal)) +
        linhaResultado('Total investido', renderizacao.formatCurrency(r.totalInvestido)) +
        linhaResultado('Total em juros', renderizacao.formatCurrency(r.totalJuros))
    );
  }

  function calcularJurosSimples() {
    const r = logica.jurosSimples({
      capitalInicial: numeroPtBR(document.getElementById('campo-calc-simples-capital')),
      taxaMensal: numeroTaxa(document.getElementById('campo-calc-simples-taxa')) / 100,
      meses: Number(document.getElementById('campo-calc-simples-meses').value) || 0,
    });
    mostrarResultadoCalculadora(
      'resultado-calc-simples',
      linhaResultado('Montante final', renderizacao.formatCurrency(r.montanteFinal)) +
        linhaResultado('Juros total', renderizacao.formatCurrency(r.jurosTotal))
    );
  }

  function calcularPercentualDeValor() {
    const percentual = numeroTaxa(document.getElementById('campo-calc-pct1-percentual'));
    const valor = numeroPtBR(document.getElementById('campo-calc-pct1-valor'));
    const r = logica.percentualDeValor(percentual, valor);
    mostrarResultadoCalculadora(
      'resultado-calc-pct1',
      linhaResultado(`${renderizacao.formatNumero(percentual)}% de ${renderizacao.formatCurrency(valor)}`, renderizacao.formatCurrency(r))
    );
  }

  function calcularValorEQuePercentualDoTotal() {
    const valor = numeroPtBR(document.getElementById('campo-calc-pct2-valor'));
    const total = numeroPtBR(document.getElementById('campo-calc-pct2-total'));
    const r = logica.valorEQuePercentualDoTotal(valor, total);
    mostrarResultadoCalculadora(
      'resultado-calc-pct2',
      linhaResultado(`${renderizacao.formatCurrency(valor)} de ${renderizacao.formatCurrency(total)}`, `${renderizacao.formatNumero(r)}%`)
    );
  }

  function calcularVariacaoPercentual() {
    const valor = numeroPtBR(document.getElementById('campo-calc-pct3-valor'));
    const percentual = numeroTaxa(document.getElementById('campo-calc-pct3-percentual'));
    const r = logica.aplicarVariacaoPercentual(valor, percentual);
    mostrarResultadoCalculadora('resultado-calc-pct3', linhaResultado('Novo valor', renderizacao.formatCurrency(r)));
  }

  function calcularPrimeiroMilhao() {
    const valorAlvo = numeroPtBR(document.getElementById('campo-calc-milhao-alvo'));
    const capitalInicial = numeroPtBR(document.getElementById('campo-calc-milhao-capital'));
    const taxaMensal = numeroTaxa(document.getElementById('campo-calc-milhao-taxa')) / 100;
    if (modoMilhao === 'tempo') {
      const aporteMensal = numeroPtBR(document.getElementById('campo-calc-milhao-aporte'));
      const r = logica.mesesParaAtingirMeta({ capitalInicial, aporteMensal, taxaMensal, valorAlvo });
      mostrarResultadoCalculadora(
        'resultado-calc-milhao',
        r.meses === null
          ? linhaResultado('Tempo necessário', 'Não atingível nesse ritmo (teto de 100 anos)')
          : linhaResultado('Tempo necessário', `${r.meses} meses (${renderizacao.formatAnos(r.anos)} anos)`)
      );
    } else {
      const meses = Number(document.getElementById('campo-calc-milhao-meses').value) || 0;
      const r = logica.aporteNecessarioParaMeta({ capitalInicial, meses, taxaMensal, valorAlvo });
      mostrarResultadoCalculadora(
        'resultado-calc-milhao',
        r.aporteMensal === null
          ? linhaResultado('Aporte mensal necessário', 'Informe um prazo válido')
          : linhaResultado('Aporte mensal necessário', renderizacao.formatCurrency(r.aporteMensal))
      );
    }
  }

  function abrirNovoLancamento(id) {
    if (id) {
      const item = state.lancamentos.find((l) => l.id === id);
      rascunhoLancamento = { ...item };
    } else {
      rascunhoLancamento = { data: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`, tipo: 'despesa', parcelas: 1 };
    }
    telaAtual = 'novo-lancamento';
    renderizarTudo();
  }

  function fecharNovoLancamento() {
    rascunhoLancamento = null;
    telaAtual = abaAtual;
    renderizarTudo();
  }

  function coletarRascunhoDoFormulario() {
    const form = document.getElementById('formulario-lancamento');
    if (!form) return rascunhoLancamento || {};
    const dados = new FormData(form);
    return {
      id: dados.get('id') || (rascunhoLancamento && rascunhoLancamento.id) || '',
      data: dados.get('data') || '',
      descricao: dados.get('descricao') || '',
      categoria: dados.get('categoria') || '',
      tipo: dados.get('tipo') || 'despesa',
      valorTotal: numeroDoCampoMoeda(dados.get('valorTotal')),
      contaId: dados.get('contaId') || null,
      parcelas: dados.get('parcelado') === 'on' ? Number(dados.get('parcelas')) || 2 : 1,
    };
  }

  function atualizarSaldoProjetado() {
    const rodape = document.querySelector('#tela-novo-lancamento .nv-rodape-saldo span:last-child');
    if (!rodape) return;
    const form = document.getElementById('formulario-lancamento');
    if (!form) return;
    const valorTotal = numeroDoCampoMoeda(form.elements.valorTotal.value);
    const parcelado = form.elements.parcelado.checked;
    const parcelas = parcelado ? Number(document.getElementById('campo-parcelas').value) || 2 : 1;
    const valorParcela = valorTotal / parcelas;
    const tipo = form.elements.tipo.value;
    const resumoAtual = logica.resumoMensal(state.lancamentos, anoAtual, mesAtual);
    const projetado = resumoAtual.saldo + (tipo === 'receita' ? valorParcela : -valorParcela);
    rodape.textContent = renderizacao.formatCurrency(projetado);
  }

  function mudarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 12) { mesAtual = 1; anoAtual += 1; }
    if (mesAtual < 1) { mesAtual = 12; anoAtual -= 1; }
    renderizarTudo();
  }

  async function despachar(acao) {
    state = applyAction(state, acao);
    renderizarTudo();
    salvarBackupLocal();
    await salvarNoServidor(acao);
  }

  async function salvarNoServidor(acao, tentativa = 1) {
    // Na build de demonstração nada é publicado: cada visitante mexe numa cópia que vive só no
    // navegador dele (salvarBackupLocal já rodou), então ninguém altera o que os outros veem e
    // nenhum dado sai do aparelho. Na build normal esta condição é sempre falsa.
    if (typeof window !== 'undefined' && window.NUVRA_DEMO) {
      descricaoSincronizacao = 'Demonstração — dados só neste aparelho';
      return;
    }
    if (!artifactApi) {
      descricaoSincronizacao = 'Indisponível neste dispositivo';
      mostrarBanner('Sincronização indisponível nesta visualização — os dados ficam só neste aparelho.');
      return;
    }
    try {
      await artifactApi.publish({ 'data/state.json': JSON.stringify(state) });
      descricaoSincronizacao = 'Ativa';
      esconderBanner();
    } catch (erro) {
      if (erro.code === 'conflict' && tentativa <= 3) {
        await reidratarDeOutraVersao();
        state = applyAction(state, acao);
        renderizarTudo();
        const espera = 200 * tentativa + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, espera));
        await salvarNoServidor(acao, tentativa + 1);
        return;
      }
      if (erro.code === 'not_writer' || erro.code === 'not_granted') {
        somenteLeitura = true;
        renderizarTudo();
        mostrarBanner('Modo leitura — você não pode editar este artifact.');
        return;
      }
      descricaoSincronizacao = 'Erro ao sincronizar';
      mostrarBanner('Não foi possível sincronizar agora. Suas alterações estão salvas neste aparelho.', () => salvarNoServidor(acao, 1));
    }
  }

  async function reidratarDeOutraVersao() {
    try {
      const resposta = await fetch(`data/state.json?t=${Date.now()}`);
      if (resposta.ok) state = { ...estadoInicial(), ...(await resposta.json()) };
    } catch (erro) {
      // mantém o estado local se não conseguir buscar a versão mais nova
    }
  }

  function mostrarBanner(texto, aoTentarNovamente) {
    const banner = document.getElementById('banner-sync');
    if (aoTentarNovamente) {
      banner.innerHTML = '';
      const spanTexto = document.createElement('span');
      spanTexto.textContent = texto;
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'banner-retry';
      botao.textContent = 'Tentar novamente';
      botao.addEventListener('click', aoTentarNovamente);
      banner.appendChild(spanTexto);
      banner.appendChild(botao);
    } else {
      banner.textContent = texto;
    }
    banner.hidden = false;
  }

  function esconderBanner() {
    document.getElementById('banner-sync').hidden = true;
  }

  function abrirFormularioInvestimento(id) {
    const form = document.getElementById('formulario-investimento');
    form.reset();
    fecharTodosCombos();
    const comboTipo = document.getElementById('combo-tipo-investimento');
    if (id) {
      const item = state.investimentos.find((i) => i.id === id);
      const migrado = logica.migrarInvestimentoLegado(item);
      form.elements.id.value = item.id;
      atualizarSugestoesAtivo(item.tipo);
      form.elements.nome.value = item.nome;
      definirComboPorValor(comboTipo, item.tipo);
      form.elements.precoAtual.value = renderizacao.formatNumero(migrado.precoAtual);
    } else {
      form.elements.id.value = '';
      atualizarSugestoesAtivo('acao');
      definirComboPorValor(comboTipo, 'acao');
    }
    document.getElementById('botao-excluir-investimento').hidden = !id;
    document.getElementById('form-investimento').showModal();
  }

  function abrirFormularioOperacao(ativoId) {
    const form = document.getElementById('formulario-operacao');
    form.reset();
    fecharTodosCombos();
    definirComboPorValor(document.getElementById('combo-tipo-operacao'), 'compra');
    form.elements.ativoId.value = ativoId;
    form.elements.data.value = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    document.getElementById('form-operacao').showModal();
  }

  function abrirFormularioAlocacao() {
    const form = document.getElementById('formulario-alocacao');
    form.reset();
    const alvo = state.alocacaoAlvo || {};
    for (const tipo of logica.tiposAlocacao()) {
      form.elements[tipo].value = alvo[tipo] || '';
    }
    document.getElementById('form-alocacao').showModal();
  }

  // Guarda a alocação sugerida entre "ver resultado" e "usar como minha meta" — só vira estado
  // de verdade se a pessoa confirmar; ver resultado sozinho não altera nada da carteira dela.
  let alocacaoSugeridaPendente = null;

  function abrirTestePerfil() {
    const form = document.getElementById('formulario-perfil');
    form.reset();
    document.getElementById('perfil-perguntas').innerHTML = renderizacao.renderPerguntasPerfil();
    document.getElementById('form-perfil').showModal();
  }

  function mostrarResultadoPerfil(respostas) {
    const { perfil, pontos } = logica.perfilDeInvestidor(respostas);
    alocacaoSugeridaPendente = logica.alocacaoSugeridaPorPerfil(perfil);
    document.getElementById('perfil-resultado-conteudo').innerHTML = renderizacao.renderResultadoPerfil(
      perfil,
      pontos,
      alocacaoSugeridaPendente
    );
    document.getElementById('resultado-perfil').showModal();
  }

  function aplicarAlocacaoDoPerfil() {
    if (!alocacaoSugeridaPendente) return;
    despachar({ type: 'setAlocacaoAlvo', alocacaoAlvo: { ...alocacaoSugeridaPendente } });
    document.getElementById('resultado-perfil').close();
  }

  function abrirFormularioDivida(id) {
    const form = document.getElementById('formulario-divida');
    form.reset();
    fecharTodosCombos();
    const existente = id ? (state.dividas || []).find((d) => d.id === id) : null;
    form.elements.id.value = existente ? existente.id : '';
    form.elements.nome.value = existente ? existente.nome : '';
    form.elements.saldoDevedor.value = existente ? renderizacao.formatNumero(existente.saldoDevedor || 0) : '';
    form.elements.valorParcela.value = existente && existente.valorParcela ? renderizacao.formatNumero(existente.valorParcela) : '';
    form.elements.parcelasRestantes.value = existente && existente.parcelasRestantes ? existente.parcelasRestantes : '';
    definirComboPorValor(document.getElementById('combo-tipo-divida'), existente ? existente.tipo : 'financiamento_imobiliario');
    // Só faz sentido oferecer "excluir" no que já existe.
    document.querySelector('[data-acao="excluir-divida"]').hidden = !existente;
    document.getElementById('form-divida').showModal();
  }

  function abrirFormularioProvento(ativoId) {
    const form = document.getElementById('formulario-provento');
    form.reset();
    fecharTodosCombos();
    definirComboPorValor(document.getElementById('combo-tipo-provento'), 'dividendo');
    form.elements.ativoId.value = ativoId;
    form.elements.data.value = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    document.getElementById('form-provento').showModal();
  }

  function abrirFormularioProventoPrevisto(ativoId) {
    const form = document.getElementById('formulario-provento-previsto');
    form.reset();
    form.elements.ativoId.value = ativoId;
    document.getElementById('form-provento-previsto').showModal();
  }

  function abrirFormularioConta(id) {
    const form = document.getElementById('formulario-conta');
    form.reset();
    fecharTodosCombos();
    const comboTipo = document.getElementById('combo-tipo-conta');
    if (id) {
      const item = state.contas.find((c) => c.id === id);
      form.elements.id.value = item.id;
      form.elements.nome.value = item.nome;
      definirComboPorValor(comboTipo, item.tipo);
      form.elements.fechamento.value = item.fechamento || '';
    } else {
      form.elements.id.value = '';
      definirComboPorValor(comboTipo, 'conta');
    }
    document.getElementById('form-conta').showModal();
  }

  function abrirFormularioMeta(id) {
    const form = document.getElementById('formulario-meta');
    form.reset();
    fecharTodosCombos();
    const comboCategoria = document.getElementById('combo-categoria-meta');
    if (id) {
      const item = state.metas.find((m) => m.id === id);
      form.elements.id.value = item.id;
      definirComboPorValor(comboCategoria, item.categoria);
      form.elements.nome.value = item.nome || '';
      form.elements.limite.value = renderizacao.formatNumero(item.limite);
    } else {
      form.elements.id.value = '';
      definirComboPorValor(comboCategoria, 'Moradia');
    }
    document.getElementById('botao-excluir-meta').hidden = !id;
    document.getElementById('form-meta').showModal();
  }

  function ligarEventos() {
    document.body.addEventListener('click', (evento) => {
      const alvo = evento.target.closest('[data-acao]');
      if (!alvo) return;
      const acao = alvo.dataset.acao;

      if (acao === 'ir-tab') irParaAba(alvo.dataset.tab);
      if (acao === 'abrir-dia') { diaAberto = alvo.dataset.dia; telaAtual = 'dia'; renderizarTudo(); }
      if (acao === 'fechar-dia') { diaAberto = null; telaAtual = 'calendario'; renderizarTudo(); }
      if (acao === 'mes-anterior') mudarMes(-1);
      if (acao === 'mes-seguinte') mudarMes(1);
      if (acao === 'abrir-configuracoes') abrirConfiguracoes();
      if (acao === 'fechar-configuracoes') fecharConfiguracoes();
      if (acao === 'abrir-calculadoras') abrirCalculadoras();
      if (acao === 'fechar-calculadoras') fecharCalculadoras();
      if (acao === 'abrir-importacao') abrirImportacao();
      if (acao === 'fechar-importar') fecharImportacao();
      if (acao === 'analisar-csv') analisarCSVDaTela();
      if (acao === 'confirmar-importacao') confirmarImportacao();
      if (acao === 'definir-calculadora') {
        calculadoraAtiva = alvo.dataset.calc;
        renderizarTudo();
      }
      if (acao === 'definir-modo-milhao') {
        modoMilhao = alvo.dataset.modomilhao;
        renderizarTudo();
      }
      if (acao === 'calcular-compostos') calcularJurosCompostos();
      if (acao === 'calcular-simples') calcularJurosSimples();
      if (acao === 'calcular-pct1') calcularPercentualDeValor();
      if (acao === 'calcular-pct2') calcularValorEQuePercentualDoTotal();
      if (acao === 'calcular-pct3') calcularVariacaoPercentual();
      if (acao === 'calcular-milhao') calcularPrimeiroMilhao();

      if (acao === 'definir-pin') {
        document.getElementById('formulario-definir-pin').reset();
        document.getElementById('erro-definir-pin').style.display = 'none';
        document.getElementById('form-pin').showModal();
      }
      if (acao === 'remover-pin') {
        if (!confirm('Remover o PIN de acesso?')) return;
        try {
          localStorage.removeItem(CHAVE_PIN);
        } catch (erro) {
          // localStorage indisponível — nada a remover
        }
        renderizarTudo();
      }
      if (acao === 'abrir-categoria') abrirCategoria(alvo.dataset.categoria);
      if (acao === 'fechar-categoria') fecharCategoria();
      if (acao === 'abrir-ativo') abrirAtivo(alvo.dataset.id);
      if (acao === 'fechar-ativo') fecharAtivo();
      if (acao === 'comecar') {
        localStorage_set(CHAVE_ONBOARDING, '1');
        mostrarApp();
      }

      if (acao === 'novo-lancamento') abrirNovoLancamento();
      if (acao === 'editar-lancamento') abrirNovoLancamento(alvo.dataset.id);
      if (acao === 'cancelar-lancamento') fecharNovoLancamento();
      if (acao === 'excluir-lancamento-atual' && rascunhoLancamento && rascunhoLancamento.id) {
        if (!confirm('Excluir este lançamento?')) return;
        despachar({ type: 'deleteLancamento', id: rascunhoLancamento.id });
        fecharNovoLancamento();
      }
      if (acao === 'tipo-lancamento') {
        rascunhoLancamento = { ...coletarRascunhoDoFormulario(), tipo: alvo.dataset.tipo };
        renderizarTudo();
      }
      if (acao === 'parcelas-menos' || acao === 'parcelas-mais') {
        const campo = document.getElementById('campo-parcelas');
        const span = document.getElementById('valor-parcelas');
        let valor = Number(campo.value) || 2;
        valor = acao === 'parcelas-mais' ? valor + 1 : Math.max(2, valor - 1);
        campo.value = valor;
        span.textContent = valor;
        atualizarSaldoProjetado();
      }

      if (acao === 'filtrar-lancamentos') {
        filtroLancamentos = alvo.dataset.filtro;
        document.getElementById('tela-lancamentos').innerHTML = renderLancamentos(state, anoAtual, mesAtual, {
          busca,
          filtro: filtroLancamentos,
          contaSelecionada,
        });
      }

      if (acao === 'definir-tema') {
        despachar({ type: 'setTema', tema: alvo.dataset.tema });
        aplicarTema(alvo.dataset.tema);
      }
      if (acao === 'definir-idioma') {
        despachar({ type: 'setIdioma', idioma: alvo.dataset.idioma });
      }

      if (acao === 'novo-investimento') abrirFormularioInvestimento();
      if (acao === 'editar-investimento') abrirFormularioInvestimento(alvo.dataset.id);
      if (acao === 'excluir-investimento-atual') {
        const idAtual = document.getElementById('formulario-investimento').elements.id.value;
        if (!idAtual || !confirm('Excluir este investimento?')) return;
        despachar({ type: 'deleteInvestimento', id: idAtual });
        document.getElementById('form-investimento').close();
        fecharAtivo();
      }

      if (acao === 'nova-operacao') abrirFormularioOperacao(alvo.dataset.id);
      if (acao === 'excluir-operacao') {
        if (!ativoAberto || !confirm('Excluir esta operação?')) return;
        const item = state.investimentos.find((i) => i.id === ativoAberto);
        const migrado = logica.migrarInvestimentoLegado(item);
        const operacoes = migrado.operacoes.filter((op) => op.id !== alvo.dataset.id);
        despachar({ type: 'editInvestimento', id: ativoAberto, changes: { operacoes, precoAtual: migrado.precoAtual } });
      }

      if (acao === 'editar-alocacao') abrirFormularioAlocacao();
      if (acao === 'abrir-perfil') abrirTestePerfil();
      if (acao === 'nova-divida') abrirFormularioDivida();
      if (acao === 'editar-divida') abrirFormularioDivida(alvo.dataset.id);
      if (acao === 'excluir-divida') {
        const id = document.getElementById('formulario-divida').elements.id.value;
        if (id && confirm('Excluir esta dívida?')) {
          despachar({ type: 'deleteDivida', id });
          document.getElementById('form-divida').close();
        }
      }
      if (acao === 'aplicar-alocacao-perfil') aplicarAlocacaoDoPerfil();

      if (acao === 'novo-provento') abrirFormularioProvento(alvo.dataset.id);
      if (acao === 'excluir-provento') {
        if (!ativoAberto || !confirm('Excluir este provento?')) return;
        const item = state.investimentos.find((i) => i.id === ativoAberto);
        const proventos = (item.proventos || []).filter((p) => p.id !== alvo.dataset.id);
        despachar({ type: 'editInvestimento', id: ativoAberto, changes: { proventos } });
      }

      if (acao === 'novo-provento-previsto') abrirFormularioProventoPrevisto(alvo.dataset.id);
      if (acao === 'excluir-provento-previsto') {
        if (!ativoAberto || !confirm('Excluir este dividendo previsto?')) return;
        const item = state.investimentos.find((i) => i.id === ativoAberto);
        const proventosPrevistos = (item.proventosPrevistos || []).filter((p) => p.id !== alvo.dataset.id);
        despachar({ type: 'editInvestimento', id: ativoAberto, changes: { proventosPrevistos } });
      }

      if (acao === 'nova-conta') abrirFormularioConta();
      if (acao === 'excluir-conta') {
        if (!confirm('Remover esta conta? Lançamentos associados não serão apagados.')) return;
        despachar({ type: 'deleteConta', id: alvo.dataset.id });
      }

      if (acao === 'nova-meta') abrirFormularioMeta();
      if (acao === 'editar-meta') abrirFormularioMeta(alvo.dataset.id);
      if (acao === 'excluir-meta-atual') {
        const idAtual = document.getElementById('formulario-meta').elements.id.value;
        if (!idAtual) return;
        despachar({ type: 'deleteMeta', id: idAtual });
        document.getElementById('form-meta').close();
      }

      if (acao === 'cancelar-form') alvo.closest('dialog').close();

      if (acao === 'abrir-combo') {
        const lista = alvo.closest('.nv-combo').querySelector('.nv-combo-lista');
        const estavaAberta = !lista.hidden;
        fecharTodosCombos();
        lista.hidden = estavaAberta;
      }

      if (acao === 'selecionar-combo-item') {
        const combo = alvo.closest('.nv-combo');
        selecionarItemCombo(combo, alvo.dataset.valor, alvo.dataset.rotulo);
        fecharTodosCombos();
        // trocar o tipo de ativo muda quais tickers fazem sentido sugerir no nome
        if (alvo.closest('#combo-tipo-investimento')) atualizarSugestoesAtivo(alvo.dataset.valor);
      }
    });

    // Fecha qualquer combo aberto ao clicar fora dele (o clique dentro já foi tratado acima).
    document.body.addEventListener('click', (evento) => {
      if (!evento.target.closest('.nv-combo')) fecharTodosCombos();
    });

    document.body.addEventListener('focusin', (evento) => {
      if (evento.target.classList.contains('nv-combo-input')) {
        fecharTodosCombos();
        evento.target.closest('.nv-combo').querySelector('.nv-combo-lista').hidden = false;
      }
    });

    document.body.addEventListener('input', (evento) => {
      if (evento.target.classList.contains('nv-combo-input')) {
        const combo = evento.target.closest('.nv-combo');
        filtrarComboBusca(combo, evento.target.value);
        combo.querySelector('.nv-combo-lista').hidden = false;
        return;
      }
      if (evento.target.id === 'campo-busca-lancamentos') {
        busca = evento.target.value;
        const foco = evento.target;
        const posicaoCursor = foco.selectionStart;
        document.getElementById('tela-lancamentos').innerHTML = renderLancamentos(state, anoAtual, mesAtual, {
          busca,
          filtro: filtroLancamentos,
          contaSelecionada,
        });
        const novoFoco = document.getElementById('campo-busca-lancamentos');
        if (novoFoco) {
          novoFoco.focus();
          novoFoco.setSelectionRange(posicaoCursor, posicaoCursor);
        }
      }
      if (['valorTotal', 'parcelado'].includes(evento.target.name) && evento.target.closest('#formulario-lancamento')) {
        atualizarSaldoProjetado();
      }
    });

    document.body.addEventListener('change', (evento) => {
      if (evento.target.name === 'tipo' && evento.target.closest('#formulario-investimento')) {
        atualizarSugestoesAtivo(evento.target.value);
      }
      if (evento.target.id === 'campo-conta-filtro') {
        contaSelecionada = evento.target.value || null;
        document.getElementById('tela-lancamentos').innerHTML = renderLancamentos(state, anoAtual, mesAtual, {
          busca,
          filtro: filtroLancamentos,
          contaSelecionada,
        });
      }
      if (evento.target.name === 'parcelado' && evento.target.closest('#formulario-lancamento')) {
        document.getElementById('campo-parcelas-linha').classList.toggle('desabilitado', !evento.target.checked);
        atualizarSaldoProjetado();
      }
      if (evento.target.id === 'campo-ocultar-valores') {
        despachar({ type: 'setOcultarValores', valor: evento.target.checked });
      }
      if (evento.target.id === 'campo-arquivo-csv') {
        lerArquivoCSV(evento.target.files && evento.target.files[0]);
      }
    });

    // Campos de valor monetário (.nv-campo-moeda): reformata pro padrão "1.234,56" assim que a
    // pessoa sai do campo (focusout, que ao contrário de blur borbulha até o body) ou aperta
    // Enter nele — sem precisar digitar a vírgula e os dois zeros na mão.
    document.body.addEventListener('focusout', (evento) => {
      if (evento.target.classList && evento.target.classList.contains('nv-campo-moeda')) {
        formatarCampoMoeda(evento.target);
      }
    });
    document.body.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && evento.target.classList && evento.target.classList.contains('nv-campo-moeda')) {
        formatarCampoMoeda(evento.target);
      }
    });

    document.body.addEventListener('submit', (evento) => {
      // Nota: não usar evento.target.id aqui — cada <form> tem um <input name="id">, e o HTML
      // spec faz esse controle "sombrear" a propriedade .id do próprio elemento <form>.
      if (evento.target.getAttribute('id') === 'formulario-pin') {
        evento.preventDefault();
        const dados = new FormData(evento.target);
        const digitado = dados.get('pin') || '';
        if (hashSimples(digitado) === localStorage_get(CHAVE_PIN)) {
          prosseguirAposPin();
        } else {
          mostrarTelaPin(true);
        }
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-definir-pin') {
        const dados = new FormData(evento.target);
        const pin = dados.get('pin') || '';
        const confirmarPin = dados.get('confirmarPin') || '';
        if (pin !== confirmarPin) {
          evento.preventDefault();
          document.getElementById('erro-definir-pin').style.display = 'block';
          return;
        }
        localStorage_set(CHAVE_PIN, hashSimples(pin));
        renderizarTudo();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-lancamento') {
        evento.preventDefault();
        const dados = coletarRascunhoDoFormulario();
        const id = dados.id || uid();
        const lancamento = { ...dados, id };
        const existe = state.lancamentos.some((l) => l.id === id);
        despachar(existe ? { type: 'editLancamento', id, changes: lancamento } : { type: 'addLancamento', lancamento });
        fecharNovoLancamento();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-investimento') {
        const dados = new FormData(evento.target);
        const id = dados.get('id') || uid();
        const existe = state.investimentos.some((i) => i.id === id);
        if (existe) {
          despachar({
            type: 'editInvestimento',
            id,
            changes: { nome: dados.get('nome'), tipo: dados.get('tipo'), precoAtual: numeroDoCampoMoeda(dados.get('precoAtual')) },
          });
        } else {
          despachar({
            type: 'addInvestimento',
            investimento: { id, nome: dados.get('nome'), tipo: dados.get('tipo'), precoAtual: numeroDoCampoMoeda(dados.get('precoAtual')), operacoes: [] },
          });
          abrirAtivo(id);
        }
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-operacao') {
        // preventDefault: essa validação pode falhar (venda maior que a posição) — nesse caso o
        // dialog precisa continuar aberto pro usuário corrigir, então o fechamento automático do
        // <form method="dialog"> só deve acontecer depois que a validação passar (fechamos manualmente).
        evento.preventDefault();
        const dados = new FormData(evento.target);
        const ativoId = dados.get('ativoId');
        const item = state.investimentos.find((i) => i.id === ativoId);
        const migrado = logica.migrarInvestimentoLegado(item);
        const novaOperacao = {
          id: uid(),
          tipo: dados.get('tipo'),
          data: dados.get('data'),
          quantidade: Number(dados.get('quantidade')),
          precoUnitario: numeroDoCampoMoeda(dados.get('precoUnitario')),
        };
        try {
          logica.posicaoAtivo([...migrado.operacoes, novaOperacao]);
        } catch (erro) {
          alert(erro.message);
          return;
        }
        despachar({
          type: 'editInvestimento',
          id: ativoId,
          changes: { operacoes: [...migrado.operacoes, novaOperacao], precoAtual: migrado.precoAtual },
        });
        evento.target.reset();
        document.getElementById('form-operacao').close();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-divida') {
        const dados = new FormData(evento.target);
        const id = dados.get('id') || uid();
        const divida = {
          id,
          nome: dados.get('nome'),
          tipo: dados.get('tipo'),
          saldoDevedor: numeroDoCampoMoeda(dados.get('saldoDevedor')),
          valorParcela: numeroDoCampoMoeda(dados.get('valorParcela')),
          parcelasRestantes: Number(dados.get('parcelasRestantes')) || 0,
        };
        const existe = (state.dividas || []).some((d) => d.id === id);
        despachar(existe ? { type: 'editDivida', id, changes: divida } : { type: 'addDivida', divida });
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-entrada-rapida') {
        evento.preventDefault();
        const campo = document.getElementById('campo-entrada-rapida');
        const interpretado = logica.interpretarLancamento(campo.value);
        if (!interpretado.temValor) {
          alert('Não achei um valor no texto. Tente algo como \"mercado 89,90\".');
          return;
        }
        // Abre o formulário preenchido em vez de salvar direto: o palpite de categoria pode errar,
        // e confirmar numa tela custa um toque, enquanto um lançamento errado custa uma correção.
        abrirNovoLancamento();
        rascunhoLancamento = {
          ...rascunhoLancamento,
          tipo: interpretado.tipo,
          categoria: interpretado.categoria,
          descricao: interpretado.descricao,
          valorTotal: interpretado.valorTotal,
          parcelas: interpretado.parcelas,
        };
        campo.value = '';
        renderizarTudo();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-perfil') {
        const dados = new FormData(evento.target);
        const respostas = {};
        for (const p of logica.perguntasPerfil()) respostas[p.id] = Number(dados.get(p.id));
        mostrarResultadoPerfil(respostas);
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-alocacao') {
        const dados = new FormData(evento.target);
        const alocacaoAlvo = {};
        for (const tipo of logica.tiposAlocacao()) {
          const valor = Number(dados.get(tipo));
          if (valor > 0) alocacaoAlvo[tipo] = valor;
        }
        despachar({ type: 'setAlocacaoAlvo', alocacaoAlvo: Object.keys(alocacaoAlvo).length ? alocacaoAlvo : null });
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-provento') {
        const dados = new FormData(evento.target);
        const ativoId = dados.get('ativoId');
        const item = state.investimentos.find((i) => i.id === ativoId);
        const novoProvento = {
          id: uid(),
          tipo: dados.get('tipo'),
          data: dados.get('data'),
          valor: numeroDoCampoMoeda(dados.get('valor')),
        };
        despachar({
          type: 'editInvestimento',
          id: ativoId,
          changes: { proventos: [...(item.proventos || []), novoProvento] },
        });
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-provento-previsto') {
        const dados = new FormData(evento.target);
        const ativoId = dados.get('ativoId');
        const item = state.investimentos.find((i) => i.id === ativoId);
        const novoPrevisto = {
          id: uid(),
          data: dados.get('data'),
          valor: numeroDoCampoMoeda(dados.get('valor')),
          descricao: dados.get('descricao') || '',
        };
        despachar({
          type: 'editInvestimento',
          id: ativoId,
          changes: { proventosPrevistos: [...(item.proventosPrevistos || []), novoPrevisto] },
        });
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-conta') {
        const dados = new FormData(evento.target);
        const id = dados.get('id') || uid();
        const conta = {
          id,
          nome: dados.get('nome'),
          tipo: dados.get('tipo'),
          fechamento: dados.get('fechamento') ? Number(dados.get('fechamento')) : null,
        };
        const existe = state.contas.some((c) => c.id === id);
        despachar(existe ? { type: 'editConta', id, changes: conta } : { type: 'addConta', conta });
        evento.target.reset();
        return;
      }

      if (evento.target.getAttribute('id') === 'formulario-meta') {
        const dados = new FormData(evento.target);
        const id = dados.get('id') || uid();
        const meta = {
          id,
          categoria: dados.get('categoria'),
          nome: dados.get('nome') || '',
          limite: numeroDoCampoMoeda(dados.get('limite')),
        };
        const existe = state.metas.some((m) => m.id === id);
        despachar(existe ? { type: 'editMeta', id, changes: meta } : { type: 'addMeta', meta });
        evento.target.reset();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
