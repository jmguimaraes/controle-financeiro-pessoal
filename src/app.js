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
    renderAbertura,
    renderInvestimentos,
    renderAtivoDetalhe,
    renderPin,
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
  let busca = '';
  let filtroLancamentos = 'todos';
  let contaSelecionada = null;
  let rascunhoLancamento = null; // dados em edição na tela de novo lançamento
  let descricaoSincronizacao = 'Verificando…';

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

    const telas = ['resumo', 'lancamentos', 'carteira', 'metas', 'categoria', 'ativo-detalhe', 'novo-lancamento', 'configuracoes'];
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
    if (id) {
      const item = state.investimentos.find((i) => i.id === id);
      const migrado = logica.migrarInvestimentoLegado(item);
      form.elements.id.value = item.id;
      form.elements.nome.value = item.nome;
      form.elements.tipo.value = item.tipo;
      form.elements.precoAtual.value = renderizacao.formatNumero(migrado.precoAtual);
    } else {
      form.elements.id.value = '';
    }
    document.getElementById('botao-excluir-investimento').hidden = !id;
    document.getElementById('form-investimento').showModal();
  }

  function abrirFormularioOperacao(ativoId) {
    const form = document.getElementById('formulario-operacao');
    form.reset();
    form.elements.ativoId.value = ativoId;
    form.elements.data.value = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    document.getElementById('form-operacao').showModal();
  }

  function abrirFormularioAlocacao() {
    const form = document.getElementById('formulario-alocacao');
    form.reset();
    const alvo = state.alocacaoAlvo || {};
    for (const tipo of ['acao', 'fii', 'renda_fixa', 'outro']) {
      form.elements[tipo].value = alvo[tipo] || '';
    }
    document.getElementById('form-alocacao').showModal();
  }

  function abrirFormularioProvento(ativoId) {
    const form = document.getElementById('formulario-provento');
    form.reset();
    form.elements.ativoId.value = ativoId;
    form.elements.data.value = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    document.getElementById('form-provento').showModal();
  }

  function abrirFormularioConta(id) {
    const form = document.getElementById('formulario-conta');
    form.reset();
    if (id) {
      const item = state.contas.find((c) => c.id === id);
      form.elements.id.value = item.id;
      form.elements.nome.value = item.nome;
      form.elements.tipo.value = item.tipo;
      form.elements.fechamento.value = item.fechamento || '';
    } else {
      form.elements.id.value = '';
    }
    document.getElementById('form-conta').showModal();
  }

  function abrirFormularioMeta(id) {
    const form = document.getElementById('formulario-meta');
    form.reset();
    if (id) {
      const item = state.metas.find((m) => m.id === id);
      form.elements.id.value = item.id;
      form.elements.categoria.value = item.categoria;
      form.elements.nome.value = item.nome || '';
      form.elements.limite.value = renderizacao.formatNumero(item.limite);
    } else {
      form.elements.id.value = '';
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
      if (acao === 'mes-anterior') mudarMes(-1);
      if (acao === 'mes-seguinte') mudarMes(1);
      if (acao === 'abrir-configuracoes') abrirConfiguracoes();
      if (acao === 'fechar-configuracoes') fecharConfiguracoes();

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

      if (acao === 'novo-provento') abrirFormularioProvento(alvo.dataset.id);
      if (acao === 'excluir-provento') {
        if (!ativoAberto || !confirm('Excluir este provento?')) return;
        const item = state.investimentos.find((i) => i.id === ativoAberto);
        const proventos = (item.proventos || []).filter((p) => p.id !== alvo.dataset.id);
        despachar({ type: 'editInvestimento', id: ativoAberto, changes: { proventos } });
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
    });

    document.body.addEventListener('input', (evento) => {
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

      if (evento.target.getAttribute('id') === 'formulario-alocacao') {
        const dados = new FormData(evento.target);
        const alocacaoAlvo = {};
        for (const tipo of ['acao', 'fii', 'renda_fixa', 'outro']) {
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
