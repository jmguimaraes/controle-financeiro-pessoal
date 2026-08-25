repo: jmguimaraes/controle-financeiro-pessoal
branch: master

## Last sync
date: 2026-08-24T19:34:00Z

### Updated in this project
- Direção "Noturno" aplicada ao fluxo inteiro (Nuvra.dc.html, turno 2)
- Cantos arredondados nos controles, chips, botões, barras e na moldura
- Contas e cartões com marcador de ícone (logos reais não incluídos por direitos autorais)
- Três direções originais do Resumo mantidas no turno 1 para referência

## Screen map
| Tela do projeto | Arquivos de origem |
| --- | --- |
| Resumo (2a; 1a, 1b, 1c) | src/render.js (renderResumo), src/logic.js (resumoMensal, totalCarteira, parcelasEmAberto), src/shell.html |
| Lançamentos (2b; 1d) | src/render.js (renderLancamentos), src/logic.js (parcelaNoMes, parcelaValor), src/shell.html |
| Novo lançamento (2c; 1e) | src/shell.html (dialog#form-lancamento), src/app.js (abrirFormularioLancamento) |
| Detalhe de categoria (2d; 1f) | novo — derivado das categorias em src/shell.html |
| Metas (2e; 1g) | novo |
| Carteira (1h) | src/render.js (renderInvestimentos), src/logic.js (rendimento, totalCarteira) |
| Configurações (2f; 1j) | src/app.js (sincronização, banner, somenteLeitura), src/shell.html (tema) |
| Abertura (2g; 1i) | novo — marca |

## Sync history
- 2026-08-24T19:05:00Z — importação inicial: recriação das 3 abas atuais e primeiro conjunto de telas novas
