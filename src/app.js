(function () {
  const logica = typeof require !== 'undefined' ? require('./logic.js') : window;
  const renderizacao = typeof require !== 'undefined' ? require('./render.js') : window;
  const { uid, applyAction } = logica;
  const { renderResumo, renderLancamentos, renderInvestimentos } = renderizacao;

  let state = { lancamentos: [], investimentos: [] };
  let artifactApi = null;
  let anoAtual;
  let mesAtual;

  async function iniciar() {
    const hoje = new Date();
    anoAtual = hoje.getFullYear();
    mesAtual = hoje.getMonth() + 1;

    await carregarEstado();
    artifactApi = window.claude ? await window.claude.use('artifact') : null;
    renderizarTudo();
    ligarEventos();
  }

  async function carregarEstado() {
    try {
      const resposta = await fetch('data/state.json');
      if (resposta.ok) {
        state = await resposta.json();
        return;
      }
    } catch (erro) {
      // sem dado publicado ainda, ou sem rede — segue com estado vazio/local
    }
    const salvoLocal = lerBackupLocal();
    if (salvoLocal) state = salvoLocal;
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

  function renderizarTudo() {
    document.getElementById('tela-resumo').innerHTML = renderResumo(state, anoAtual, mesAtual);
    document.getElementById('tela-lancamentos').innerHTML = renderLancamentos(state, anoAtual, mesAtual);
    document.getElementById('tela-investimentos').innerHTML = renderInvestimentos(state);
  }

  function mostrarAba(nome) {
    for (const aba of ['resumo', 'lancamentos', 'investimentos']) {
      document.getElementById(`tela-${aba}`).hidden = aba !== nome;
    }
    for (const botao of document.querySelectorAll('[data-acao="ir-tab"]')) {
      botao.classList.toggle('tab-ativo', botao.dataset.tab === nome);
    }
  }

  async function despachar(acao) {
    state = applyAction(state, acao);
    renderizarTudo();
    salvarBackupLocal();
    await salvarNoServidor(acao);
  }

  async function salvarNoServidor(acao, tentativa = 1) {
    if (!artifactApi) {
      mostrarBanner('Sincronização indisponível nesta visualização — os dados ficam só neste aparelho.');
      return;
    }
    try {
      await artifactApi.publish({ 'data/state.json': JSON.stringify(state) });
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
      mostrarBanner('Não foi possível sincronizar agora. Suas alterações estão salvas neste aparelho.');
    }
  }

  async function reidratarDeOutraVersao() {
    try {
      const resposta = await fetch(`data/state.json?t=${Date.now()}`);
      if (resposta.ok) state = await resposta.json();
    } catch (erro) {
      // mantém o estado local se não conseguir buscar a versão mais nova
    }
  }

  function mostrarBanner(texto) {
    const banner = document.getElementById('banner-sync');
    banner.textContent = texto;
    banner.hidden = false;
  }

  function esconderBanner() {
    document.getElementById('banner-sync').hidden = true;
  }

  function mudarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 12) { mesAtual = 1; anoAtual += 1; }
    if (mesAtual < 1) { mesAtual = 12; anoAtual -= 1; }
    renderizarTudo();
  }

  function abrirFormularioLancamento(id) {
    const form = document.getElementById('formulario-lancamento');
    form.reset();
    document.getElementById('campo-parcelas').hidden = true;
    if (id) {
      const item = state.lancamentos.find((l) => l.id === id);
      form.elements.id.value = item.id;
      form.elements.data.value = item.data;
      form.elements.descricao.value = item.descricao;
      form.elements.categoria.value = item.categoria;
      form.elements.tipo.value = item.tipo;
      form.elements.valorTotal.value = item.valorTotal;
      if (item.parcelas > 1) {
        form.elements.parcelado.checked = true;
        form.elements.parcelas.value = item.parcelas;
        document.getElementById('campo-parcelas').hidden = false;
      }
    } else {
      form.elements.id.value = '';
    }
    document.getElementById('form-lancamento').showModal();
  }

  function abrirFormularioInvestimento(id) {
    const form = document.getElementById('formulario-investimento');
    form.reset();
    if (id) {
      const item = state.investimentos.find((i) => i.id === id);
      form.elements.id.value = item.id;
      form.elements.nome.value = item.nome;
      form.elements.tipo.value = item.tipo;
      form.elements.valorInvestido.value = item.valorInvestido;
      form.elements.valorAtual.value = item.valorAtual;
    } else {
      form.elements.id.value = '';
    }
    document.getElementById('form-investimento').showModal();
  }

  function ligarEventos() {
    document.body.addEventListener('click', (evento) => {
      const alvo = evento.target.closest('[data-acao]');
      if (!alvo) return;
      const acao = alvo.dataset.acao;

      if (acao === 'ir-tab') mostrarAba(alvo.dataset.tab);
      if (acao === 'mes-anterior') mudarMes(-1);
      if (acao === 'mes-seguinte') mudarMes(1);
      if (acao === 'novo-lancamento') abrirFormularioLancamento();
      if (acao === 'editar-lancamento') abrirFormularioLancamento(alvo.dataset.id);
      if (acao === 'excluir-lancamento') despachar({ type: 'deleteLancamento', id: alvo.dataset.id });
      if (acao === 'novo-investimento') abrirFormularioInvestimento();
      if (acao === 'editar-investimento') abrirFormularioInvestimento(alvo.dataset.id);
      if (acao === 'excluir-investimento') despachar({ type: 'deleteInvestimento', id: alvo.dataset.id });
      if (acao === 'cancelar-form') alvo.closest('dialog').close();
    });

    document.body.addEventListener('change', (evento) => {
      if (evento.target.name === 'parcelado') {
        document.getElementById('campo-parcelas').hidden = !evento.target.checked;
      }
    });

    document.getElementById('formulario-lancamento').addEventListener('submit', (evento) => {
      const dados = new FormData(evento.target);
      const id = dados.get('id') || uid();
      const parcelado = dados.get('parcelado') === 'on';
      const lancamento = {
        id,
        data: dados.get('data'),
        descricao: dados.get('descricao'),
        categoria: dados.get('categoria'),
        tipo: dados.get('tipo'),
        valorTotal: Number(dados.get('valorTotal')),
        parcelas: parcelado ? Number(dados.get('parcelas')) : 1,
      };
      const existe = state.lancamentos.some((l) => l.id === id);
      despachar(existe ? { type: 'editLancamento', id, changes: lancamento } : { type: 'addLancamento', lancamento });
      evento.target.reset();
    });

    document.getElementById('formulario-investimento').addEventListener('submit', (evento) => {
      const dados = new FormData(evento.target);
      const id = dados.get('id') || uid();
      const investimento = {
        id,
        nome: dados.get('nome'),
        tipo: dados.get('tipo'),
        valorInvestido: Number(dados.get('valorInvestido')),
        valorAtual: Number(dados.get('valorAtual')),
        atualizadoEm: new Date().toISOString().slice(0, 10),
      };
      const existe = state.investimentos.some((i) => i.id === id);
      despachar(existe ? { type: 'editInvestimento', id, changes: investimento } : { type: 'addInvestimento', investimento });
      evento.target.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
