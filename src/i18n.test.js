const test = require('node:test');
const assert = require('node:assert/strict');
const { t, mesesDoIdioma, localeDoIdioma, IDIOMAS } = require('./i18n.js');

test('t traduz uma chave conhecida no idioma pedido', () => {
  assert.equal(t('resumo.receitas', 'en'), 'INCOME');
  assert.equal(t('resumo.receitas', 'es'), 'INGRESOS');
  assert.equal(t('resumo.receitas', 'pt'), 'RECEITAS');
});

test('t cai pro português quando o idioma pedido é desconhecido', () => {
  assert.equal(t('resumo.receitas', 'fr'), 'RECEITAS');
  assert.equal(t('resumo.receitas', undefined), 'RECEITAS');
});

test('t cai pro português quando a chave existe em pt mas falta no idioma pedido', () => {
  // Simula uma tradução esquecida: não deveria nunca renderizar em branco.
  assert.equal(t('conta.tipoCartao', 'zz'), 'Cartão');
});

test('t devolve a própria chave como último recurso quando ela não existe em nenhum idioma', () => {
  assert.equal(t('chave.que.nao.existe', 'en'), 'chave.que.nao.existe');
});

test('mesesDoIdioma devolve os 12 meses no idioma pedido, na ordem certa', () => {
  assert.equal(mesesDoIdioma('en')[0], 'January');
  assert.equal(mesesDoIdioma('en').length, 12);
  assert.equal(mesesDoIdioma('es')[7], 'Agosto');
  assert.equal(mesesDoIdioma('pt')[0], 'Janeiro');
});

test('mesesDoIdioma cai pro português com um idioma desconhecido', () => {
  assert.equal(mesesDoIdioma('fr')[0], 'Janeiro');
});

test('localeDoIdioma mapeia cada idioma pro locale do Intl usado na formatação de moeda/número', () => {
  assert.equal(localeDoIdioma('pt'), 'pt-BR');
  assert.equal(localeDoIdioma('en'), 'en-US');
  assert.equal(localeDoIdioma('es'), 'es-419');
});

test('localeDoIdioma cai pro locale português com um idioma desconhecido', () => {
  assert.equal(localeDoIdioma('fr'), 'pt-BR');
});

test('IDIOMAS lista os três idiomas suportados', () => {
  assert.deepEqual(IDIOMAS, ['pt', 'en', 'es']);
});
