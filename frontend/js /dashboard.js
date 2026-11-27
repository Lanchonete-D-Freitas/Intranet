import { MENSAGENS } from './constants.js';
import { criarCamposPedido, lerPedidoDoFormulario, renderizarErrosValidacao, validarPedido } from './forms.js';
import { renderizarCarregamento, renderizarErro, renderizarVazio } from './ui.js';
import {
    escaparHtml,
    formatarDataCurta,
    formatarMoeda,
    formatarNumero,
    obterVariante
} from './utils.js';

const INDICADORES = Object.freeze([
    { chave: 'faturamento', rotulo: 'Faturamento', icone: 'fa-coins', formatar: formatarMoeda },
    { chave: 'totalPedidos', rotulo: 'Total de pedidos', icone: 'fa-receipt', formatar: formatarNumero },
    { chave: 'pendentes', rotulo: 'Pedidos pendentes', icone: 'fa-hourglass-half', formatar: formatarNumero },
    { chave: 'ticketMedio', rotulo: 'Ticket médio', icone: 'fa-chart-line', formatar: formatarMoeda }
]);

function renderizarMetricas(container, estado, acoes) {
    if (estado.carregando.resumo) {
        container.innerHTML = INDICADORES.map(() => `
            <div class="cartao metrica">
                <div class="estado estado-carregando" role="status">
                    <span class="spinner" aria-hidden="true"></span>
                    <span>Carregando...</span>
                </div>
            </div>`).join('');
        return;
    }

    if (estado.erros.resumo) {
        container.innerHTML = '<div class="cartao metrica-erro"></div>';
        renderizarErro(container.firstElementChild, estado.erros.resumo, acoes.recarregarResumo);
        return;
    }

    if (!estado.resumo) {
        renderizarVazio(container, 'Indicadores indisponíveis', MENSAGENS.semDados);
        container.classList.add('estado-largo');
        return;
    }

    container.classList.remove('estado-largo');
    container.innerHTML = INDICADORES.map((indicador) => {
        const valor = estado.resumo[indicador.chave];
        return `
            <article class="cartao metrica">
                <div class="metica-topo">
                    <span class="icone-metrica" aria-hidden="true">
                        <i class="fa-solid ${indicador.icone}"></i>
                    </span>
                    <span class="metica-rotulo">${escaparHtml(indicador.rotulo)}</span>
                </div>
                <strong class="metica-valor">${escaparHtml(indicador.formatar(valor))}</strong>
            </article>`;
    }).join('');
}

function construirGrafico(vendas) {
    const pontos = vendas
        .filter((venda) => venda && Number.isFinite(Number(venda.valor)))
        .map((venda) => ({ data: venda.data, valor: Number(venda.valor) }));

    if (pontos.length === 0) {
        return null;
    }

    const largura = 720;
    const altura = 240;
    const margem = 36;
    const maximo = Math.max(...pontos.map((ponto) => ponto.valor), 1);
    const intervalo = pontos.length > 1 ? pontos.length - 1 : 1;
    const coordenadas = pontos.map((ponto, indice) => ({
        x: margem + (indice * (largura - 2 * margem)) / intervalo,
        y: altura - margem - (ponto.valor / maximo) * (altura - 2 * margem),
        data: ponto.data,
        valor: ponto.valor
    }));

    const linha = coordenadas
        .map((ponto, indice) => `${indice === 0 ? 'M' : 'L'} ${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`)
        .join(' ');
    const primeiro = coordenadas[0];
    const ultimo = coordenadas[coordenadas.length - 1];
    const area = `${linha} L ${ultimo.x.toFixed(1)} ${altura - margem} L ${primeiro.x.toFixed(1)} ${altura - margem} Z`;
    const indiceMeio = Math.floor(coordenadas.length / 2);
    const etiquetas = [primeiro, coordenadas[indiceMeio], ultimo]
        .filter((ponto, indice, lista) => lista.findIndex((item) => item.x === ponto.x) === indice)
        .map((ponto) => `
            <text x="${ponto.x.toFixed(1)}" y="${altura - 10}" text-anchor="middle" class="grafico-etiqueta">
                ${escaparHtml(formatarDataCurta(ponto.data))}
            </text>`)
        .join('');

    return `
        <div class="grafico-container">
            <svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de evolução das vendas" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="gradiente-vendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#e5c46b" stop-opacity="0.45" />
                        <stop offset="100%" stop-color="#e5c46b" stop-opacity="0.02" />
                    </linearGradient>
                </defs>
                <line x1="${margem}" y1="${altura - margem}" x2="${largura - margem}" y2="${altura - margem}" class="grafico-eixo" />
                <path d="${area}" fill="url(#gradiente-vendas)" />
                <path d="${linha}" class="grafico-linha" />
                ${coordenadas.map((ponto) => `
                    <circle cx="${ponto.x.toFixed(1)}" cy="${ponto.y.toFixed(1)}" r="4" class="grafico-ponto">
                        <title>${escaparHtml(formatarDataCurta(ponto.data))}: ${escaparHtml(formatarMoeda(ponto.valor))}</title>
                    </circle>`).join('')}
                ${etiquetas}
            </svg>
        </div>`;
}

function renderizarGrafico(container, estado, acoes) {
    if (estado.carregando.resumo) {
        renderizarCarregamento(container, 'Carregando vendas...');
        return;
    }

    if (estado.erros.resumo) {
        renderizarErro(container, estado.erros.resumo, acoes.recarregarResumo);
        return;
    }

    const grafico = estado.resumo ? construirGrafico(estado.resumo.vendasPorDia) : null;
    if (!grafico) {
        renderizarVazio(container, 'Sem dados de vendas', MENSAGENS.semDados);
        return;
    }

    container.innerHTML = grafico;
}

function renderizarCanais(container, estado, acoes) {
    if (estado.carregando.resumo) {
        renderizarCarregamento(container, 'Carregando canais...');
        return;
    }

    if (estado.erros.resumo) {
        renderizarErro(container, estado.erros.resumo, acoes.recarregarResumo);
        return;
    }

    const canais = estado.resumo?.canais ?? [];
    if (canais.length === 0) {
        renderizarVazio(container, 'Nenhum canal de venda disponível', MENSAGENS.semDados);
        return;
    }

    container.innerHTML = `
        <ul class="lista-canais">
            ${canais.map((canal) => {
                const participacao = Number(canal.participacao);
                const largura = Number.isFinite(participacao)
                    ? Math.min(100, Math.max(0, participacao))
                    : 0;

                return `
                    <li class="item-canal">
                        <div class="item-canal-info">
                            <span>${escaparHtml(canal.nome ?? 'Canal')}</span>
                            <strong>${escaparHtml(formatarNumero(canal.pedidos ?? 0))} pedidos</strong>
                        </div>
                        <div class="barra-progresso" role="progressbar" aria-valuenow="${largura}" aria-valuemin="0" aria-valuemax="100" aria-label="Participação de ${escaparHtml(canal.nome ?? 'canal')}">
                            <span style="width: ${largura}%"></span>
                        </div>
                        <small>${largura}% do total</small>
                    </li>`;
            }).join('')}
        </ul>`;
}

function montarPedidoRapido(root, acoes) {
    const container = root.querySelector('#formulario-pedido-rapido');

    container.innerHTML = `
        <form id="form-pedido-rapido" novalidate>
            ${criarCamposPedido('rapido', true)}
            <div class="erros-formulario" hidden></div>
            <button type="submit" class="botao botao-destaque botao-bloco">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> Registrar pedido
            </button>
        </form>`;

    const formulario = container.querySelector('form');
    const erros = container.querySelector('.erros-formulario');

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const pedido = lerPedidoDoFormulario(formulario);
        const errosValidacao = validarPedido(pedido);
        renderizarErrosValidacao(erros, errosValidacao);

        if (errosValidacao.length > 0) {
            return;
        }

        const botao = formulario.querySelector('button[type="submit"]');
        botao.disabled = true;
        botao.classList.add('carregando');

        try {
            await acoes.criarPedido(pedido);
            formulario.reset();
        } finally {
            botao.disabled = false;
            botao.classList.remove('carregando');
        }
    });
}

export function montarDashboard(root, store, acoes) {
    const metricas = root.querySelector('#metricas');
    const grafico = root.querySelector('#grafico-vendas');
    const canais = root.querySelector('#lista-canais');

    montarPedidoRapido(root, acoes);

    function renderizar() {
        const estado = store.obter();
        renderizarMetricas(metricas, estado, acoes);
        renderizarGrafico(grafico, estado, acoes);
        renderizarCanais(canais, estado, acoes);
    }

    store.assinar((estado, patch) => {
        if ('resumo' in patch || 'carregando' in patch || 'erros' in patch) {
            renderizar();
        }
    });

    renderizar();
}
