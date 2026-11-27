import { ESTADOS_SERVICO, MENSAGENS, NIVEIS_ESTOQUE } from './constants.js';
import { renderizarCarregamento, renderizarErro, renderizarVazio } from './ui.js';
import {
    escaparHtml,
    formatarDataHora,
    formatarNumero,
    obterRotulo,
    obterVariante
} from './utils.js';

function renderizarItemEstoque(item) {
    const nivel = item.nivel ?? item.criticidade ?? 'normal';
    const variante = obterVariante(nivel, NIVEIS_ESTOQUE);
    const quantidade = formatarNumero(item.quantidade ?? 0);
    const produtoId = item.produtoId ?? item.id ?? item.nome ?? '';

    return `
        <li class="item-estoque">
            <div class="item-estoque-info">
                <strong>${escaparHtml(item.nome ?? 'Produto')}</strong>
                <span>${quantidade} unidades disponíveis</span>
            </div>
            <span class="etiqueta etiqueta-${variante}">${escaparHtml(obterRotulo(nivel, NIVEIS_ESTOQUE))}</span>
            <button
                type="button"
                class="botao botao-secundario botao-pequeno"
                data-reposicao="${escaparHtml(produtoId)}"
            >Repor</button>
        </li>`;
}

function renderizarEstoque(container, estado, acoes) {
    if (estado.carregando.estoque) {
        renderizarCarregamento(container, 'Carregando estoque...');
        return;
    }

    if (estado.erros.estoque) {
        renderizarErro(container, estado.erros.estoque, acoes.recarregarEstoque);
        return;
    }

    if (!estado.estoque) {
        renderizarVazio(container, 'Estoque indisponível', MENSAGENS.semDados);
        return;
    }

    const itens = estado.estoque.itens;
    const pendencias = estado.estoque.pedidosReposicao;

    container.innerHTML = `
        <div class="resumo-operacao">
            <i class="fa-solid fa-truck-ramp-box" aria-hidden="true"></i>
            <span><strong>${formatarNumero(pendencias)}</strong> pedido(s) aguardando reposição</span>
        </div>
        ${itens.length > 0 ? `
            <ul class="lista-estoque">${itens.map(renderizarItemEstoque).join('')}</ul>`
            : '<div class="estado-estoque-vazio">Nenhum produto em nível crítico.</div>'}`;
}

function renderizarServico(servico) {
    const status = servico.status ?? 'indisponivel';
    const variante = obterVariante(status, ESTADOS_SERVICO);

    return `
        <li class="item-servico">
            <span class="indicador-servico indicador-${variante}" aria-hidden="true"></span>
            <div class="item-servico-info">
                <strong>${escaparHtml(servico.nome ?? 'Serviço')}</strong>
                ${servico.detalhe ? `<span>${escaparHtml(servico.detalhe)}</span>` : ''}
            </div>
            <span class="etiqueta etiqueta-${variante}">${escaparHtml(obterRotulo(status, ESTADOS_SERVICO))}</span>
        </li>`;
}

function renderizarLogistica(container, estado, acoes) {
    if (estado.carregando.logistica) {
        renderizarCarregamento(container, 'Carregando serviços...');
        return;
    }

    if (estado.erros.logistica) {
        renderizarErro(container, estado.erros.logistica, acoes.recarregarLogistica);
        return;
    }

    if (!estado.logistica) {
        renderizarVazio(container, 'Status indisponível', MENSAGENS.semDados);
        return;
    }

    const { servicos, fila, processados, ultimaSincronizacao } = estado.logistica;
    const comFalha = servicos.some((servico) => (servico.status ?? 'indisponivel') === 'indisponivel');

    container.innerHTML = `
        ${comFalha ? `
            <div class="alerta alerta-erro" role="alert">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>Um ou mais serviços apresentam falha de comunicação.</span>
            </div>` : ''}
        <div class="indicadores-logistica">
            <div>
                <span>Fila de processamento</span>
                <strong>${formatarNumero(fila)}</strong>
            </div>
            <div>
                <span>Itens processados</span>
                <strong>${formatarNumero(processados)}</strong>
            </div>
            <div>
                <span>Última sincronização</span>
                <strong>${escaparHtml(formatarDataHora(ultimaSincronizacao))}</strong>
            </div>
        </div>
        ${servicos.length > 0 ? `
            <ul class="lista-servicos">${servicos.map(renderizarServico).join('')}</ul>`
            : '<div class="estado-estoque-vazio">Nenhum serviço informado pelo backend.</div>'}`;
}

export function montarOperacoes(root, store, acoes) {
    const estoque = root.querySelector('#lista-estoque');
    const logistica = root.querySelector('#painel-logistica');

    function renderizar() {
        renderizarEstoque(estoque, store.obter(), acoes);
        renderizarLogistica(logistica, store.obter(), acoes);
    }

    estoque.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('[data-reposicao]');
        if (!botao || !window.confirm(MENSAGENS.confirmarReposicao)) {
            return;
        }

        botao.disabled = true;
        await acoes.solicitarReposicao(botao.dataset.reposicao);
    });

    store.assinar((estado, patch) => {
        if ('estoque' in patch || 'logistica' in patch || 'carregando' in patch || 'erros' in patch) {
            renderizar();
        }
    });

    renderizar();
}
