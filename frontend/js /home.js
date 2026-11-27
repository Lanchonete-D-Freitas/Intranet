import { MENSAGENS, PAGINACAO, TEMPO_DEBOUNCE_MS } from './constants.js';
import { montarDashboard } from './dashboard.js';
import { montarLayout } from './layout.js';
import { abrirNovoPedidoModal, montarPedidos } from './orders.js';
import { montarOperacoes } from './operations.js';
import { servicos } from './services.js';
import { criarStore } from './store.js';
import { mostrarToast } from './ui.js';
import { debounce } from './utils.js';

const store = criarStore({
    periodo: '7-dias',
    busca: '',
    status: 'todos',
    pagina: PAGINACAO.paginaInicial,
    resumo: null,
    pedidos: { itens: [], total: 0 },
    estoque: null,
    logistica: null,
    carregando: {
        resumo: false,
        pedidos: false,
        estoque: false,
        logistica: false
    },
    erros: {
        resumo: null,
        pedidos: null,
        estoque: null,
        logistica: null
    },
    conectado: navigator.onLine
});

async function carregar(chave, obterDados) {
    const estadoAtual = store.obter();
    store.definir({
        carregando: { ...estadoAtual.carregando, [chave]: true },
        erros: { ...estadoAtual.erros, [chave]: null }
    });

    try {
        const dados = await obterDados();
        store.definir({ [chave]: dados });
    } catch (erro) {
        store.definir({
            erros: { ...store.obter().erros, [chave]: erro.message }
        });
    } finally {
        store.definir({
            carregando: { ...store.obter().carregando, [chave]: false }
        });
    }
}

function carregarResumo() {
    return carregar('resumo', () => servicos.carregarResumo(store.obter().periodo));
}

function carregarPedidos() {
    const estado = store.obter();

    return carregar('pedidos', () => servicos.carregarPedidos({
        periodo: estado.periodo,
        status: estado.status,
        busca: estado.busca,
        pagina: estado.pagina,
        tamanho: PAGINACAO.tamanho
    }));
}

function carregarEstoque() {
    return carregar('estoque', () => servicos.carregarEstoque());
}

function carregarLogistica() {
    return carregar('logistica', () => servicos.carregarLogistica());
}

const recarregarPorFiltro = debounce(() => {
    carregarResumo();
    carregarPedidos();
}, TEMPO_DEBOUNCE_MS);

async function criarPedido(pedido) {
    try {
        await servicos.criarPedido(pedido);
        mostrarToast(MENSAGENS.pedidoCriado, 'sucesso');
        await Promise.all([carregarResumo(), carregarPedidos()]);
        return true;
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
        return false;
    }
}

async function cancelarPedido(id) {
    try {
        await servicos.atualizarStatusPedido(id, 'cancelado');
        mostrarToast(MENSAGENS.pedidoCancelado, 'sucesso');
        await Promise.all([carregarResumo(), carregarPedidos()]);
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
    }
}

async function solicitarReposicao(produtoId) {
    try {
        await servicos.solicitarReposicao(produtoId);
        mostrarToast(MENSAGENS.reposicaoSolicitada, 'sucesso');
        await carregarEstoque();
    } catch (erro) {
        mostrarToast(erro.message, 'erro');
    }
}

const acoes = {
    definirPeriodo(periodo) {
        store.definir({ periodo, pagina: PAGINACAO.paginaInicial });
    },
    definirBusca(busca) {
        store.definir({ busca, pagina: PAGINACAO.paginaInicial });
    },
    definirStatus(status) {
        store.definir({ status, pagina: PAGINACAO.paginaInicial });
    },
    definirPagina(pagina) {
        store.definir({ pagina });
    },
    abrirNovoPedido() {
        abrirNovoPedidoModal(acoes);
    },
    criarPedido,
    cancelarPedido,
    solicitarReposicao,
    recarregarResumo: carregarResumo,
    recarregarPedidos: carregarPedidos,
    recarregarEstoque: carregarEstoque,
    recarregarLogistica: carregarLogistica
};

function init() {
    const root = document.getElementById('app');

    if (!root) {
        throw new Error('Elemento #app não encontrado.');
    }

    montarLayout(root, store, acoes);
    montarDashboard(root, store, acoes);
    montarPedidos(root, store, acoes);
    montarOperacoes(root, store, acoes);

    const chavesFiltro = ['periodo', 'status', 'busca', 'pagina'];
    store.assinar((estado, patch) => {
        const alterouPagina = 'pagina' in patch;
        const alterouFiltro = chavesFiltro.some((chave) => chave in patch);

        if (!alterouFiltro) {
            return;
        }

        if (alterouPagina && Object.keys(patch).length === 1) {
            carregarPedidos();
            return;
        }

        recarregarPorFiltro();
    });

    window.addEventListener('online', () => store.definir({ conectado: true }));
    window.addEventListener('offline', () => store.definir({ conectado: false }));

    carregarResumo();
    carregarPedidos();
    carregarEstoque();
    carregarLogistica();
}

init();
