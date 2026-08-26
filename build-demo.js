// Build de demonstração: mesmo app da build normal, mas com dados fictícios embutidos e sem
// publicar nada no artifact. Serve pra mostrar o Nuvra pra outras pessoas sem expor os dados
// financeiros reais — a instância de uso pessoal continua privada e intocada.
//
// Como funciona: injeta window.NUVRA_SEED (estado inicial fictício) e window.NUVRA_DEMO (desliga
// a sincronização). Quem abrir mexe numa cópia que vive só no navegador dele.
//
// Gera dist-demo/index.html, que deve ser publicado como um artifact SEPARADO do app real.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = __dirname;

// Reaproveita a build normal em vez de duplicar a lógica de concatenação.
execFileSync(process.execPath, [path.join(dir, 'build.js')], { stdio: 'inherit' });
const base = fs.readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');

const op = (id, tipo, data, quantidade, precoUnitario) => ({ id, tipo, data, quantidade, precoUnitario });

// Carteira calibrada pra bater exatamente com o carrossel do LinkedIn: 18.240 sobre 16.000
// investidos (+14,00%), com composição ação 45% / FII 25% / tesouro 20% / cripto 10%.
// As despesas do mês dão 3.560 em vez dos 3.260 do carrossel de propósito: a parcela do notebook
// entra com 300/mês, e ter uma compra parcelada em aberto mostra uma feature que vale demonstrar.
const SEED = {
  tema: 'escuro',
  idioma: 'pt',
  ocultarValores: false,
  lancamentos: [
    { id: 'd1', data: '2026-08-05', tipo: 'receita', categoria: 'Salário', descricao: 'Salário', valorTotal: 4500, parcelas: 1 },
    { id: 'd2', data: '2026-08-06', tipo: 'despesa', categoria: 'Moradia', descricao: 'Aluguel', valorTotal: 1450, parcelas: 1 },
    { id: 'd3', data: '2026-08-09', tipo: 'despesa', categoria: 'Alimentação', descricao: 'Mercado', valorTotal: 890, parcelas: 1 },
    { id: 'd4', data: '2026-08-14', tipo: 'despesa', categoria: 'Lazer', descricao: 'Cinema e jantar', valorTotal: 500, parcelas: 1 },
    { id: 'd5', data: '2026-08-18', tipo: 'despesa', categoria: 'Transporte', descricao: 'Combustível', valorTotal: 420, parcelas: 1 },
    // Uma compra parcelada pra mostrar o controle de parcelas em aberto.
    { id: 'd6', data: '2026-06-12', tipo: 'despesa', categoria: 'Outras Despesas', descricao: 'Notebook', valorTotal: 3600, parcelas: 12 },
  ],
  investimentos: [
    {
      id: 'i1', nome: 'PETR4', tipo: 'acao', precoAtual: 41.04,
      operacoes: [op('o1', 'compra', '2026-03-10', 100, 34.5), op('o2', 'compra', '2026-06-04', 100, 37.2)],
      proventos: [{ id: 'p1', tipo: 'dividendo', data: '2026-07-15', valor: 148.5 }],
      proventosPrevistos: [],
    },
    {
      id: 'i2', nome: 'HGLG11', tipo: 'fii', precoAtual: 182.4,
      operacoes: [op('o3', 'compra', '2026-02-20', 25, 152.0)],
      proventos: [{ id: 'p2', tipo: 'dividendo', data: '2026-08-15', valor: 84.0 }],
      proventosPrevistos: [{ id: 'pp1', data: '2026-09-15', valor: 84.0, descricao: 'Rendimento mensal' }],
    },
    {
      id: 'i3', nome: 'Tesouro Selic', tipo: 'tesouro_direto', precoAtual: 3648,
      operacoes: [op('o4', 'compra', '2026-01-15', 1, 3400)],
      proventos: [], proventosPrevistos: [],
    },
    {
      id: 'i4', nome: 'BTC', tipo: 'criptomoeda', precoAtual: 1824,
      operacoes: [op('o5', 'compra', '2026-05-08', 1, 1630)],
      proventos: [], proventosPrevistos: [],
    },
  ],
  contas: [
    { id: 'c1', nome: 'Conta corrente', tipo: 'conta', fechamento: '' },
    { id: 'c2', nome: 'Cartão', tipo: 'cartao', fechamento: '10' },
  ],
  metas: [
    { id: 'm1', categoria: 'Alimentação', nome: 'Mercado do mês', limite: 1000 },
    { id: 'm2', categoria: 'Lazer', nome: '', limite: 400 },
  ],
  alocacaoAlvo: { acao: 30, fii: 25, tesouro_direto: 20, renda_fixa: 20, criptomoeda: 5 },
};

const injecao = `<script>
window.NUVRA_DEMO = true;
window.NUVRA_SEED = ${JSON.stringify(SEED)};
</script>
`;

// Antes do bundle: os dois flags precisam existir quando app.js rodar.
const marcador = '<script>';
const posicao = base.indexOf(marcador);
if (posicao === -1) throw new Error('Não encontrei o <script> do bundle em dist/index.html');
let saida = base.slice(0, posicao) + injecao + base.slice(posicao);

// Título diferente do app real de propósito: os dois ficam lado a lado na galeria de artifacts, e
// confundir um com o outro é justamente o erro que esta build existe pra evitar — só a demo pode
// ser compartilhada.
const tituloAntes = saida;
saida = saida.replace('<title>Nuvra</title>', '<title>Nuvra Demo</title>');
if (saida === tituloAntes) throw new Error('Não encontrei <title>Nuvra</title> em dist/index.html');

fs.mkdirSync(path.join(dir, 'dist-demo'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist-demo', 'index.html'), saida, 'utf8');
console.log('Gerado dist-demo/index.html —', saida.length, 'bytes');
