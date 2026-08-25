# Handoff: Nuvra — redesenho mobile do Controle Financeiro Pessoal

## Visão geral
Redesenho completo do app `controle-financeiro-pessoal` (repo `jmguimaraes/controle-financeiro-pessoal`, branch `master`) sob a marca **Nuvra**. Cobre as três abas existentes (Resumo, Lançamentos, Investimentos) e adiciona Metas, Detalhe de categoria, Novo lançamento em tela cheia, Onboarding e Configurações.

A direção aprovada é a **noturna** (turno 2 do arquivo de design: telas `2a`–`2g`). O turno 1 (`1a`–`1j`) contém as direções descartadas e as versões claras — mantido apenas como referência.

## Sobre os arquivos de design
`Nuvra.dc.html` é uma **referência de design feita em HTML** — um protótipo do visual e do comportamento pretendidos, não código de produção para copiar. A tarefa é **recriar essas telas no ambiente do codebase atual**: HTML + CSS custom properties em `src/shell.html` e template strings em `src/render.js`, seguindo os padrões já existentes (sem framework, sem build além do `build.js`).

O arquivo `.dc.html` só abre no ambiente onde foi criado; use-o como referência visual (abra no navegador para ver as telas renderizadas).

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e raios são finais. Recriar pixel-perfect.

## Sistema visual (Modernist)
- **Tipografia**: Archivo em tudo (títulos e corpo). Pesos 500/600. Números sempre `font-variant-numeric: tabular-nums`.
- **Tema**: escuro por padrão. Fundo tinta, réguas claras, um único vermelho de acento.
- **Estrutura**: grade modular. O que organiza a tela é a régua de 2px entre seções maiores e a hairline de 1px entre itens de lista. Sem preenchimento de cartão, sem sombra, sem gradiente.
- **Alinhamento**: tudo flush left, inclusive labels dentro de botões largos (o rótulo começa na borda esquerda do padding; o ícone vai à direita).
- **Acento**: usado com parcimônia — aba ativa, ação principal, chip de filtro ativo, e o que estourou a meta.

## Design tokens

### Cores (tema escuro)
| Token | Valor | Uso |
| --- | --- | --- |
| `--nv-ink` | `#201e1d` | fundo de tela |
| `--nv-paper` | `#f3f2f2` | texto principal, barras neutras, avatar |
| `--nv-accent` | `#ec3013` | aba ativa, botão principal, chip ativo, estouro de meta |
| `--nv-positive` | `#7fd6a3` | receitas, rendimento positivo |
| `--nv-negative` | `#ff6a4d` | despesas em lista, variação negativa |
| `--nv-negative-soft` | `#ff8f78` | texto de meta excedida |
| muted | `rgba(243,242,242,.55)` | labels de seção, metadados |
| muted-2 | `rgba(243,242,242,.5)` | subtítulos de linha, abas inativas |
| rule-strong | `rgba(243,242,242,.3)` | régua de 2px entre seções |
| rule-soft | `rgba(243,242,242,.18–.20)` | divisores internos |
| hairline | `rgba(243,242,242,.14)` | divisor entre itens de lista |
| track | `rgba(243,242,242,.16–.18)` | trilha das barras de progresso |
| bar-neutral | `rgba(243,242,242,.28–.8)` | colunas de gráfico, barras de categoria |
| group-header-bg | `rgba(243,242,242,.06)` | faixa de data na lista de lançamentos |
| alert-bg | `rgba(236,48,19,.14)` | linha de meta excedida |

Tema claro (turno 1, caso queira manter o toggle): fundo `#f3f2f2`, texto `#201e1d`, hairline `rgba(32,30,29,.14)`, régua `#201e1d`, muted `rgba(32,30,29,.55)`.

### Espaçamento
- Padding lateral de tela: **20px** (todas as telas do turno 2).
- Linha de lista: `padding: 12px 20px`. Linha de conta: `11px 20px`.
- Bloco de destaque (saldo): `padding: 22–26px 20px 18–22px`.
- Faixa de data (agrupador): `padding: 9px 20px 6px`.
- `gap` entre barras de categoria: 11px. Entre label e barra: 5px. Entre chips: 6px.
- Tab bar: `padding: 12px 0` por item.

### Tipografia
| Papel | Tamanho | Peso | Letter-spacing |
| --- | --- | --- | --- |
| Número herói (saldo) | 58px | 600 | -.035em |
| Número grande (valor, carteira) | 44–48px | 600 | -.03em |
| Título de tela | 22px | 600 | -.02em |
| Wordmark NUVRA | 14px (38px na abertura) | 600 | .22em (.2em) |
| Valor de linha | 14px | 600 | — |
| Nome de item | 13–14px | 600 | — |
| Metadado de item | 11px | 400/500 | — |
| Label de seção | 10px | 600 | .14em, uppercase |
| Label de campo | 9px | 600 | .14em, uppercase |
| Rótulo de aba | 10px | 600 | .1em, uppercase |
| Rótulo de botão | 12px | 600 | .12–.14em, uppercase |
| Chip de filtro | 10px | 600 | .1em, uppercase |
| Legenda de eixo | 9px | 600 | .1em, uppercase |

### Raios
| Elemento | Raio |
| --- | --- |
| Moldura da tela (só no mockup) | 30px |
| Botão, campo de busca, segmentado | 12px |
| Avatar | 16px |
| Stepper, marcador de conta | 9px |
| Badge de porcentagem | 8px |
| Coluna de gráfico | 5px 5px 0 0 |
| Símbolo da marca (rect) | rx 4 (em viewBox 20) |
| Chip, tag, interruptor, barra de progresso | 999px |

Réguas, divisores e faixas de agrupamento permanecem retos.

## Telas

Todas 390 × 844, `overflow: hidden`, coluna flex: status bar → header → conteúdo → (ação) → tab bar.

### Tab bar (todas as telas)
Quatro itens de largura igual: `RESUMO · LANÇAM. · CARTEIRA · METAS`. Borda superior de 2px em `rule-strong`. Item ativo: texto no acento + borda superior de 3px no acento com `margin-top: -3px` (para cobrir a régua). Inativos em muted-2.

### 2a — Resumo
1. Header: símbolo + wordmark `NUVRA` à esquerda; à direita `‹ AGOSTO 2026 ›` (setas no acento, 16px) — corresponde a `mudarMes(±1)` em `src/app.js`. Régua de 2px abaixo.
2. Saldo do mês: label, então `R$` 20px + `3.420,00` 58px, e subtexto "+ R$ 310,00 em relação a julho".
3. Sparkline: SVG 350×90, linha de 2px no acento, 7 pontos (fev–ago), quadrado de 10px no último ponto, baseline em `rgba(243,242,242,.25)`. Eixo com abreviações de mês de 3 letras.
4. Três células iguais (`Receitas` / `Despesas` / `Carteira`), separadas por divisor vertical de 1px. Despesas em `--nv-negative`.
5. `GASTOS POR CATEGORIA` + link `VER TUDO` no acento. Três barras: nome + valor na mesma linha, barra de 6px abaixo (a maior no acento, as outras em `rgba(243,242,242,.8)`); largura proporcional ao maior valor.
6. `PARCELAS EM ABERTO`: nome + `n/total` em muted, valor à direita. Vem de `parcelasEmAberto()`.

### 2b — Lançamentos
1. Header: título `Lançamentos` + `AGOSTO 2026`.
2. Campo de busca: borda de 2px, raio 12px, ícone Lucide `search` 14px em muted, placeholder "Buscar descrição ou categoria".
3. Chips: `TODOS` (ativo, fundo acento, texto branco) · `RECEITAS` · `DESPESAS` · `PARCELADOS` (borda 1px, raio 999px).
4. Duas células: `CONTA` (`Todas ⌄`) e `TOTAL FILTRADO` (`− R$ 6.280,00`). Régua de 2px abaixo.
5. Lista agrupada por dia: faixa `15 DE AGOSTO` com fundo `group-header-bg`, depois linhas com nome + `Categoria · Conta` e valor com sinal (receita em `--nv-positive`, despesa em `--nv-negative`). Parcelas ganham tag `3/10` (pill de 1px) ao lado do nome.
   **Cabe no máximo 5 grupos de data** nesta altura de tela — o container é `flex:1; overflow:hidden`.
6. Ação fixa acima da tab bar: botão cheio no acento, `NOVO LANÇAMENTO` à esquerda + `+` à direita.

### 2c — Novo lançamento
Substitui o `<dialog id="form-lancamento">` por tela cheia.
1. Header: `Lançamento` + `CANCELAR` em muted.
2. Segmentado de tipo: `DESPESA` (ativo, fundo acento) | `RECEITA`, larguras iguais, régua de 2px abaixo.
3. Valor: label `VALOR TOTAL`, `R$` + número 48px, cursor = barra vertical de 2px × 40px no acento.
4. Campos como linhas (label 9px uppercase acima do valor 15px): `DESCRIÇÃO`; `CATEGORIA` com `⌄`; linha dupla `DATA` | `CONTA`; `Parcelado` com interruptor (pill de 44×24, knob circular de 16px); `Número de parcelas` com stepper `− 2 +` (desabilitado a 40% de opacidade quando não parcelado).
5. Rodapé: régua de 2px, linha `SALDO APÓS SALVAR` com o valor projetado, e botão `SALVAR` cheio no acento.

Regras do formulário (já em `src/app.js`): descrição máx. 80 caracteres, valor mínimo 0,01, parcelas mínimo 2, categorias agrupadas em Receita/Despesa conforme `src/shell.html`.

### 2d — Detalhe de categoria
Tela nova, alcançada pelo `VER TUDO` ou por uma barra de categoria em 2a.
1. Header: `‹` no acento + nome da categoria.
2. Total do mês (44px) + linha "Média 6 meses R$ 1.092,00" e variação em `--nv-negative`.
3. `SEIS MESES`: seis colunas de largura igual, `gap: 10px`, altura 120px, topo arredondado em 5px, mês atual no acento e os demais em `rgba(243,242,242,.28)`. Baseline de 2px. Eixo com abreviações de mês.
4. `META DO MÊS`: "R$ 1.180,40 de R$ 1.400,00" + badge de porcentagem (fundo `--nv-paper`, texto tinta).
5. `LANÇAMENTOS`: lista filtrada pela categoria (`data · conta`, valor sem sinal).

### 2e — Metas
Tela nova. Requer persistir metas por categoria.
1. `ORÇAMENTO USADO`: número 46px + `%`, ao lado "R$ 2.429 de R$ 3.200". Barra de 8px (trilha + preenchimento neutro, raio 999px). Subtexto "Faltam 16 dias no mês".
2. Uma linha por categoria: nome + `gasto / meta`, barra de 6px abaixo.
3. Categoria excedida: linha com fundo `alert-bg`, valores e mensagem em `--nv-negative-soft`, barra 100% no acento, linha extra "Excedeu R$ 140,00".
4. Ação: botão contornado (borda 2px, raio 12px) `DEFINIR NOVA META` + `+` no acento.

### 2f — Configurações
1. Perfil: avatar quadrado de 52px com raio 16px, fundo `--nv-paper`, iniciais em tinta; nome 16px e `email · plano` em muted.
2. `APARÊNCIA`: segmentado `CLARO | ESCURO | SISTEMA`, borda 2px, raio 12px, `overflow: hidden`, opção ativa com fundo `--nv-paper` e texto tinta. Mapeia para `data-theme` em `src/shell.html`.
3. `CONTAS E CARTÕES`: uma linha por conta com **marcador de ícone** — quadrado de 30px, raio 9px, borda tracejada de 1px, inicial da conta em muted. **Placeholder proposital**: os logos reais dos bancos são marcas registradas e não foram incluídos. Substitua por SVGs licenciados ou pelos ícones fornecidos pelas próprias instituições. Última linha: `ADICIONAR CONTA` + `+`, ambos no acento.
4. `DADOS`: `Sincronização` (estado vindo do fluxo de `salvarNoServidor` / banner em `src/app.js`), `Ocultar valores` (interruptor desligado — knob à direita em `rgba(243,242,242,.35)`), `Exportar CSV` com `›`.
5. Rodapé: `NUVRA 1.0.0` em `rgba(243,242,242,.4)`.

### 2g — Abertura
Sem tab bar. Símbolo de 112px, wordmark `NUVRA` 38px, régua de 2px, e a frase "Um número por mês. O resto é registro." (máx. 280px, `text-wrap: pretty`). Rodapé: três traços de progresso 26×3px (primeiro no acento), botão `COMEÇAR` cheio no acento, e `JÁ TENHO CONTA` como texto.

### Carteira
A tela de investimentos aprovada é `1h` no arquivo de design (já estava na direção noturna).
1. Header: `Carteira` + `4 ATIVOS`.
2. Valor atual 48px; abaixo, badge de rendimento no acento (`+9,49%`) e "+ R$ 7.310,00 sobre R$ 77.000,00". Vem de `totalCarteira()`.
3. `COMPOSIÇÃO`: barra segmentada de 10px, segmentos separados por `margin-left: 2px` (o maior no acento, os demais em opacidades decrescentes de `--nv-paper`), legenda em linha abaixo.
4. Lista de ativos: nome + `Tipo · investido X`, e à direita valor atual + rendimento percentual (positivo em `--nv-positive`, zero em muted). Rótulos de tipo conforme `ROTULOS_TIPO_INVESTIMENTO` em `src/render.js`.
5. Ação: botão contornado `NOVO ATIVO` + `+`.

## Marca
Símbolo abstrato: quadro quadrado com `rx=4` (viewBox 20×20, stroke 2px na cor do texto) contendo uma laje ascendente no acento — `path d="M4 16 L16 4 L16 9.5 L9.5 16 Z"`. Tamanhos: 20px no header, 112px na abertura (stroke 1.6). Sobre fundo acento, ambos em branco.

Wordmark: `NUVRA` em Archivo 600, letter-spacing .2–.22em, sempre maiúsculas.

## Interações e comportamento
- Navegação por abas: substitui `mostrarAba()`; quatro abas agora (a de Metas é nova).
- Setas de mês no header do Resumo e dos Lançamentos — `mudarMes(±1)`.
- Barra de categoria e `VER TUDO` → Detalhe de categoria (rota nova).
- Chips de filtro e busca: filtram a lista em memória (nova lógica — hoje `renderLancamentos` só filtra por mês).
- `NOVO LANÇAMENTO` abre a tela cheia 2c em vez do `<dialog>`.
- Editar/excluir: mantido do código atual (`editar-lancamento` / `excluir-lancamento`); no novo desenho use swipe ou toque longo na linha em vez dos botões `✎ 🗑` — o desenho não os mostra.
- Estados de interação (do design system): hover com tinta do acento, pressed um passo além, foco de teclado `outline: 2px solid var(--nv-accent); outline-offset: 2px`. Nunca o foco azul padrão.
- Modo somente-leitura: mantém `body.somente-leitura` escondendo as ações principais, como hoje.
- `Ocultar valores` (novo): substitui todos os números por `•••` mantendo a largura tabular.

## Estado
Além do estado atual (`{ lancamentos, investimentos }`, `anoAtual`, `mesAtual`, `somenteLeitura`):
- `abaAtual` passa a incluir `metas`.
- `busca: string` e `filtro: 'todos' | 'receitas' | 'despesas' | 'parcelados'`.
- `contaSelecionada: string | null` e uma coleção `contas: [{ id, nome, tipo, fechamento }]`.
- `metas: [{ categoria, limite }]`.
- `categoriaAberta: string | null` para o Detalhe de categoria.
- `tema: 'claro' | 'escuro' | 'sistema'` e `ocultarValores: boolean` em Configurações.
- Cada lançamento ganha `contaId`.

Persistência e sincronização permanecem como hoje: `applyAction` → render → `localStorage` → `artifactApi.publish`, com o retry de conflito já implementado.

## Assets
- **Fonte**: Archivo (Google Fonts), pesos 500 e 600. Substitui Fraunces + IBM Plex Sans/Mono do código atual.
- **Ícones**: Lucide (https://lucide.dev). No desenho aparecem `search`, `chevron-left`, `chevron-right`, `chevron-down`, `plus`. Os chevrons estão desenhados como glifos de texto no mockup — troque por SVGs Lucide na implementação.
- **Logos de banco**: não incluídos (marcas registradas). Use os placeholders com inicial ou ícones licenciados.
- Nenhuma imagem ou fotografia.

## Dados de exemplo
Os valores no mockup são fictícios (agosto de 2026): receitas R$ 9.700,00, despesas R$ 6.280,00, saldo R$ 3.420,00, carteira R$ 84.310,00 (+9,49% sobre R$ 77.000,00). Substitua pelos dados reais.

## Arquivos
- `Nuvra.dc.html` — o design (turno 2 = direção aprovada; turno 1 = referência).
- `github.md` — associação com o repo e mapa tela → arquivo de origem.

### Arquivos do codebase a alterar
| Tela | Arquivos |
| --- | --- |
| Todas (tokens, fontes, shell, tab bar) | `src/shell.html` |
| Resumo | `src/render.js` — `renderResumo` |
| Lançamentos | `src/render.js` — `renderLancamentos` |
| Carteira | `src/render.js` — `renderInvestimentos` |
| Metas, Detalhe de categoria | novas funções em `src/render.js` |
| Novo lançamento (tela cheia) | `src/shell.html` + `src/app.js` (`abrirFormularioLancamento`) |
| Filtros, busca, contas, metas | `src/logic.js` (novas funções puras) + `src/logic.test.js` |
| Navegação, tema, ocultar valores | `src/app.js` |
