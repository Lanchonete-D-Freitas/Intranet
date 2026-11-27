import { MENSAGENS, PAGINACAO, STATUS_PEDIDO } from './constants.js';
import { criarCamposPedido, lerPedidoDoFormulario, renderizarErrosValidacao, validarPedido } from './forms.js';
import { abrirModal, fecharModal, renderizarCarregamento, renderizarErro, renderizarVazio } from './ui.js';
import {
    calcularTotalPaginas,
    escaparHtml,
    formatarDataHora,
    formatarMoeda,
    formatarNumero,
    obterRotulo,
    obterVariante
} from './utils.js';

function identificadorPedido(pedido) {
    return pedido.id ?? pedido.numero ?? '—';
}

function valorPedido(pedido) {
    const valor = Number(pedido.valorTotal ?? pedido.valor);
    return Number.isFinite(valor) ? valor : 0;
}

function dataPedido(pedido) {
    return pedido.criadoEm ?? pedido.data ?? null;
}

function podeCancelar(pedido) {
    return !['entregue', 'cancelado'].includes(pedido.status);
}

function renderizarLinha(pedido) {
    const id = identificadorPedido(pedido);
    const rotuloStatus = obterRotulo(pedido.status, STATUS_PEDIDO);
    const varianteStatus = obterVariante(pedido.status, STATUS_PEDIDO);

    return `
        <tr>
            <td><strong>#${escaparHtml(id)}</strong></td>
            <td>${escaparHtml(pedido.cliente ?? '—')}</td>
            <td>
                <span class="etiqueta etiqueta-${varianteStatus}">
                    ${escaparHtml(rotuloStatus)}
                </span>
            </td>
            <td>${escaparHtml(formatarMoeda(valorPedido(pedido)))}</td>
            <td>${escaparHtml(formatarDataHora(dataPedido(pedido)))}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="botao-icone" data-acao="detalhes" data-id="${escaparHtml(id)}" aria-label="Ver detalhes do pedido ${escaparHtml(id)}">
                        <i class="fa-solid fa-eye" aria-hidden="true"></i>
                    </button>
                    ${podeCancelar(pedido) ? `
                        <button type="button" class="botao-icone botao-perigo" data-acao="cancelar" data-id="${escaparHtml(id)}" aria-label="Cancelar pedido ${escaparHtml(id)}">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>` : ''}
                </div>
            </td>
        </tr>`;
}

function renderizarPaginacao(container, estado) {
    const totalPaginas = calcularTotalPaginas(estado.pedidos.total, PAGINACAO.tamanho);
    const paginaAtual = Math.min(estado.pagina, totalPaginas);

    container.innerHTML = `
        <div class="paginacao">
            <span>Página <strong>${paginaAtual}</strong> de <strong>${totalPaginas}</strong></span>
            <div class="paginacao-botoes">
                <button type="button" class="botao botao-secundario" data-pagina="${paginaAtual - 1}" ${paginaAtual <= 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Anterior
                </button>
                <button type="button" class="botao botao-secundario" data-pagina="${paginaAtual + 1}" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>
                    Próxima <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>`;
}

function renderizarTabela(container, estado, acoes) {
    if (estado.carregando.pedidos) {
        renderizarCarregamento(container, 'Carregando pedidos...');
        return;
    }

    if (estado.erros.pedidos) {
        renderizarErro(container, estado.erros.pedidos, acoes.recarregarPedidos);
        return;
    }

    if (estado.pedidos.itens.length === 0) {
        const comFiltro = Boolean(estado.busca) || estado.status !== 'todos';
        renderizarVazio(
            container,
            comFiltro ? 'Nenhum pedido encontrado' : 'Nenhum pedido recente',
            comFiltro ? MENSAGENS.semResultados : MENSAGENS.semDados
        );
        return;
    }

    container.innerHTML = `
        <div class="tabela-responsiva">
            <table class="tabela">
                <thead>
                    <tr>
                        <th scope="col">Pedido</th>
                        <th scope="col">Cliente</th>
                        <th scope="col">Status</th>
                        <th scope="col">Valor</th>
                        <th scope="col">Data</th>
                        <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody>${estado.pedidos.itens.map(renderizarLinha).join('')}</tbody>
            </table>
        </div>
        <div class="paginacao-container"></div>`;

    renderizarPaginacao(container.querySelector('.paginacao-container'), estado);
}

function abrirDetalhes(pedido) {
    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const conteudo = `
        <dl class="detalhes-pedido">
            <div><dt>Pedido</dt><dd>#${escaparHtml(identificadorPedido(pedido))}</dd></div>
            <div><dt>Cliente</dt><dd>${escaparHtml(pedido.cliente ?? '—')}</dd></div>
            <div><dt>Status</dt><dd>${escaparHtml(obterRotulo(pedido.status, STATUS_PEDIDO))}</dd></div>
            <div><dt>Data</dt><dd>${escaparHtml(formatarDataHora(dataPedido(pedido)))}</dd></div>
            <div><dt>Valor total</dt><dd>${escaparHtml(formatarMoeda(valorPedido(pedido)))}</dd></div>
        </dl>
        <h3>Itens</h3>
        ${itens.length > 0 ? `
            <ul class="lista-itens-pedido">
                ${itens.map((item) => `
                    <li>
                        <span>${escaparHtml(item.descricao ?? item.item ?? 'Item')}</span>
                        <span>${escaparHtml(formatarNumero(item.quantidade))}x</span>
                        <span>${escaparHtml(formatarMoeda(item.valorUnitario ?? item.preco ?? 0))}</span>
                    </li>`).join('')}
            </ul>` : '<p class="texto-suave">Nenhum item informado pelo backend.</p>'}
        ${pedido.observacao ? `<p class="observacao-pedido">${escaparHtml(pedido.observacao)}</p>` : ''}`;

    abrirModal({ titulo: 'Detalhes do pedido', conteudo });
}

export function abrirNovoPedidoModal(acoes) {
    const conteudo = `
        <form id="form-novo-pedido" novalidate>
            ${criarCamposPedido('novo')}
            <div class="erros-formulario" hidden></div>
            <div class="acoes-modal">
                <button type="button" class="botao botao-secundario" data-acao="cancelar-modal">Cancelar</button>
                <button type="submit" class="botao botao-destaque">
                    <i class="fa-solid fa-plus" aria-hidden="true"></i> Criar pedido
                </button>
            </div>
        </form>`;

    abrirModal({ titulo: 'Novo pedido', conteudo });

    const formulario = document.getElementById('form-novo-pedido');
    const erros = formulario.querySelector('.erros-formulario');

    formulario.querySelector('[data-acao="cancelar-modal"]').addEventListener('click', fecharModal);
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
            const sucesso = await acoes.criarPedido(pedido);
            if (sucesso) {
                fecharModal();
            }
        } finally {
            botao.disabled = false;
            botao.classList.remove('carregando');
        }
    });
}

export function montarPedidos(root, store, acoes) {
    const container = root.querySelector('#tabela-pedidos');
    const pesquisa = root.querySelector('#pesquisa-pedidos');
    const filtroStatus = root.querySelector('#filtro-status');

    function renderizar() {
        renderizarTabela(container, store.obter(), acoes);
    }

    pesquisa.addEventListener('input', (evento) => acoes.definirBusca(evento.target.value));
    filtroStatus.addEventListener('change', (evento) => acoes.definirStatus(evento.target.value));

    container.addEventListener('click', async (evento) => {
        const botaoPagina = evento.target.closest('[data-pagina]');
        if (botaoPagina && !botaoPagina.disabled) {
            acoes.definirPagina(Number(botaoPagina.dataset.pagina));
            root.querySelector('#pedidos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const botaoAcao = evento.target.closest('[data-acao]');
        if (!botaoAcao) {
            return;
        }

        const id = botaoAcao.dataset.id;
        const pedido = store.obter().pedidos.itens.find(
            (item) => String(identificadorPedido(item)) === id
        );

        if (!pedido) {
            return;
        }

        if (botaoAcao.dataset.acao === 'detalhes') {
            abrirDetalhes(pedido);
            return;
        }

        if (botaoAcao.dataset.acao === 'cancelar' && window.confirm(MENSAGENS.confirmarCancelamento)) {
            botaoAcao.disabled = true;
            await acoes.cancelarPedido(identificadorPedido(pedido));
        }
    });

    store.assinar((estado, patch) => {
        if ('busca' in patch && document.activeElement !== pesquisa) {
            pesquisa.value = estado.busca;
        }

        if ('status' in patch) {
            filtroStatus.value = estado.status;
        }

        if (
            'pedidos' in patch
            || 'carregando' in patch
            || 'erros' in patch
            || 'pagina' in patch
        ) {
            renderizar();
        }
    });

    renderizar();
}
