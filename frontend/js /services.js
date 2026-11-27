import { ErroServico, chamar } from './api.js';
import { MENSAGENS, PAGINACAO } from './constants.js';

function comoObjeto(valor) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
        throw new ErroServico('CONTRATO_INVALIDO', MENSAGENS.respostaInvalida);
    }

    return valor;
}

function comoArray(valor, campo) {
    if (!Array.isArray(valor)) {
        throw new ErroServico('CONTRATO_INVALIDO', `${MENSAGENS.respostaInvalida} Campo: ${campo}.`);
    }

    return valor;
}

function comoNumero(valor, campo, padrao) {
    if (valor === undefined || valor === null) {
        if (padrao !== undefined) {
            return padrao;
        }

        throw new ErroServico('CONTRATO_INVALIDO', `${MENSAGENS.respostaInvalida} Campo: ${campo}.`);
    }

    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        throw new ErroServico('CONTRATO_INVALIDO', `${MENSAGENS.respostaInvalida} Campo: ${campo}.`);
    }

    return numero;
}

export const servicos = {
    async carregarResumo(periodo) {
        const resposta = comoObjeto(await chamar('obterResumo', { periodo }));

        return {
            faturamento: comoNumero(resposta.faturamento, 'faturamento'),
            totalPedidos: comoNumero(resposta.totalPedidos, 'totalPedidos'),
            pendentes: comoNumero(resposta.pendentes, 'pendentes'),
            ticketMedio: comoNumero(resposta.ticketMedio, 'ticketMedio'),
            vendasPorDia: comoArray(resposta.vendasPorDia ?? [], 'vendasPorDia'),
            canais: comoArray(resposta.canais ?? [], 'canais')
        };
    },

    async carregarPedidos({ periodo, status, busca, pagina, tamanho = PAGINACAO.tamanho }) {
        const resposta = comoObjeto(
            await chamar('listarPedidos', { periodo, status, busca, pagina, tamanho })
        );

        return {
            itens: comoArray(resposta.itens, 'itens'),
            total: comoNumero(resposta.total, 'total', 0)
        };
    },

    async carregarEstoque() {
        const resposta = comoObjeto(await chamar('listarAlertasEstoque'));

        return {
            itens: comoArray(resposta.itens, 'itens'),
            pedidosReposicao: comoNumero(resposta.pedidosReposicao, 'pedidosReposicao', 0)
        };
    },

    async carregarLogistica() {
        const resposta = comoObjeto(await chamar('obterStatusLogistica'));

        return {
            servicos: comoArray(resposta.servicos, 'servicos'),
            fila: comoNumero(resposta.fila, 'fila', 0),
            processados: comoNumero(resposta.processados, 'processados', 0),
            ultimaSincronizacao: resposta.ultimaSincronizacao ?? null
        };
    },

    criarPedido(pedido) {
        return chamar('criarPedido', pedido);
    },

    atualizarStatusPedido(id, status) {
        return chamar('atualizarStatusPedido', { id, status });
    },

    solicitarReposicao(produtoId) {
        return chamar('solicitarReposicao', { produtoId });
    }
};
