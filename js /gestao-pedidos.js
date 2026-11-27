import { montarLayout } from './layout.js';
import { criarStore } from './store.js';
import { abrirModal, fecharModal, mostrarToast, renderizarVazio } from './ui.js';
import {
    calcularTotalPaginas,
    debounce,
    escaparHtml,
    formatarDataHora,
    formatarMoeda,
    formatarNumero,
    normalizarTexto,
    obterRotulo,
    obterVariante
} from './utils.js';

const STATUS_PEDIDO = Object.freeze({
    aguardando_pagamento: { label: 'Aguardando Pagamento', variante: 'atencao' },
    em_separacao: { label: 'Em Separação', variante: 'info' },
    faturado: { label: 'Faturado', variante: 'sucesso' },
    enviado: { label: 'Enviado', variante: 'info' },
    cancelado: { label: 'Cancelado', variante: 'erro' }
});

const STATUS_FISCAL = Object.freeze({
    emitida: { label: 'Emitida', variante: 'sucesso' },
    pendente: { label: 'Pendente', variante: 'atencao' },
    contingencia: { label: 'Contingência', variante: 'info' },
    cancelada: { label: 'Cancelada', variante: 'erro' }
});

const CANAIS = Object.freeze({
    representante: { label: 'Representante' },
    ecommerce: { label: 'E-commerce' },
    televendas: { label: 'Televendas' },
    balcao: { label: 'Balcão' },
    atacado: { label: 'Atacado' }
});

const PAGAMENTOS = Object.freeze({
    pix: { label: 'PIX' },
    boleto: { label: 'Boleto' },
    cartao: { label: 'Cartão Corporativo' }
});

const STATUS_OPCOES = Object.keys(STATUS_PEDIDO);
const CANAIS_OPCOES = Object.keys(CANAIS);
const PAGAMENTOS_OPCOES = Object.keys(PAGAMENTOS);
const FISCAIS_OPCOES = Object.keys(STATUS_FISCAL);

const CLIENTES = Object.freeze([
    { nome: 'TechSul Distribuidora e Logística Ltda.', documento: '12.345.678/0001-90' },
    { nome: 'Marina Alves Carvalho', documento: '123.456.789-09' },
    { nome: 'Restaurante Sabor Mineiro Ltda.', documento: '98.765.432/0001-10' },
    { nome: 'João Batista Pereira', documento: '987.654.321-00' },
    { nome: 'Comércio Bom Preço ME', documento: '45.678.901/0001-23' },
    { nome: 'Ana Paula Ribeiro', documento: '456.789.123-45' },
    { nome: 'Indústria União Norte S.A.', documento: '23.456.789/0001-45' },
    { nome: 'Carlos Eduardo Lima', documento: '234.567.891-23' }
]);

const DIAS_ATRAS = Object.freeze([
    0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 6, 7, 8, 10, 12,
    14, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 1, 0,
    2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 24, 27, 32, 38, 44, 52, 60
]);

const root = document.getElementById('app');
const porId = (id) => root.querySelector(`#${id}`);

function criarPedidosMock() {
    const agora = new Date();

    return DIAS_ATRAS.map((diasAtras, indice) => {
        const cliente = CLIENTES[indice % CLIENTES.length];
        const data = new Date(agora);
        data.setDate(data.getDate() - diasAtras);
        data.setHours(8 + ((indice * 3) % 12), (indice * 17) % 60, 0, 0);

        const itens = 1 + ((indice * 7) % 9);
        const valor = 180 + ((indice * 137) % 4200) + itens * 12.5;
        const sufixoChave = String(100000000000000 + indice * 7919).padStart(42, '0');

        return {
            numero: `ORD-2026-${String(894 + indice).padStart(4, '0')}`,
            criadoEm: data.toISOString(),
            cliente: cliente.nome,
            documento: cliente.documento,
            canal: CANAIS_OPCOES[(indice * 2) % CANAIS_OPCOES.length],
            itens,
            pagamento: PAGAMENTOS_OPCOES[indice % PAGAMENTOS_OPCOES.length],
            statusFiscal: FISCAIS_OPCOES[(indice * 3) % FISCAIS_OPCOES.length],
            status: STATUS_OPCOES[(indice * 5) % STATUS_OPCOES.length],
            valorTotal: Number(valor.toFixed(2)),
            chaveNfe: `3526${sufixoChave}`
        };
    });
}

function inicioDoDia(data) {
    const copia = new Date(data);
    copia.setHours(0, 0, 0, 0);
    return copia;
}

function obterLimitePeriodo(periodo) {
    const hoje = inicioDoDia(new Date());

    if (periodo === 'hoje') {
        return hoje;
    }

    if (periodo === '7-dias' || periodo === '30-dias') {
        const limite = new Date(hoje);
        limite.setDate(limite.getDate() - (periodo === '7-dias' ? 6 : 29));
        return limite;
    }

    return null;
}

function aplicarFiltros(pedidos, estado, incluirAba = true) {
    const termo = normalizarTexto(estado.busca);
    const limite = obterLimitePeriodo(estado.periodo);

    return pedidos.filter((pedido) => {
        if (limite && new Date(pedido.criadoEm) < limite) {
            return false;
        }

        if (estado.status !== 'todos' && pedido.status !== estado.status) {
            return false;
        }

        if (estado.canal !== 'todos' && pedido.canal !== estado.canal) {
            return false;
        }

        if (estado.pagamento !== 'todos' && pedido.pagamento !== estado.pagamento) {
            return false;
        }

        if (estado.statusFiscal !== 'todos' && pedido.statusFiscal !== estado.statusFiscal) {
            return false;
        }

        if (incluirAba && estado.aba !== 'todos' && pedido.status !== estado.aba) {
            return false;
        }

        if (!termo) {
            return true;
        }

        const conteudo = normalizarTexto([
            pedido.numero,
            pedido.cliente,
            pedido.documento,
            pedido.chaveNfe,
            obterRotulo(pedido.canal, CANAIS),
            obterRotulo(pedido.pagamento, PAGAMENTOS),
            obterRotulo(pedido.status, STATUS_PEDIDO)
        ].join(' '));

        return conteudo.includes(termo);
    });
}

const estadoInicial = {
    pedidos: criarPedidosMock(),
    busca: '',
    periodo: 'todos',
    aba: 'todos',
    status: 'todos',
    canal: 'todos',
    pagamento: 'todos',
    statusFiscal: 'todos',
    tamanhoPagina: 10,
    pagina: 1,
    selecionados: []
};

const store = criarStore(estadoInicial);

const campoBusca = porId('busca-pedidos');
const camposFiltro = {
    periodo: porId('filtro-periodo'),
    status: porId('filtro-status'),
    canal: porId('filtro-canal'),
    pagamento: porId('filtro-pagamento'),
    statusFiscal: porId('filtro-status-fiscal')
};
const campoTamanhoPagina = porId('registros-por-pagina');
const corpoTabela = porId('linhas-pedidos');
const areaTabela = porId('area-tabela');
const estadoTabela = porId('estado-tabela');
const paginacao = porId('paginacao-pedidos');
const barraLote = porId('barra-lote');
const selecionarTodos = porId('selecionar-todos');

const acoes = {
    definirPeriodo(periodo) {
        store.definir({ periodo, pagina: 1 });
    },

    definirBusca(busca) {
        store.definir({ busca, pagina: 1 });
    },

    abrirNovoPedido() {
        window.location.href = 'novo_pedido.html';
    }
};

montarLayout(root, store, acoes);

function renderizarMetricas(pedidos) {
    const cartoes = [
        { titulo: 'Total de pedidos', valor: pedidos.length, icone: 'fa-scroll' },
        {
            titulo: 'Aguardando pagamento',
            valor: pedidos.filter((pedido) => pedido.status === 'aguardando_pagamento').length,
            icone: 'fa-clock'
        },
        {
            titulo: 'Em separação/expedição',
            valor: pedidos.filter((pedido) => ['em_separacao', 'enviado'].includes(pedido.status)).length,
            icone: 'fa-boxes-stacked'
        },
        {
            titulo: 'Faturados',
            valor: pedidos.filter((pedido) => pedido.status === 'faturado').length,
            icone: 'fa-circle-check'
        }
    ];

    porId('metricas').innerHTML = cartoes.map((cartao) => `
        <article class="cartao metrica">
            <div class="metica-topo">
                <span class="icone-metrica">
                    <i class="fa-solid ${cartao.icone}" aria-hidden="true"></i>
                </span>
                <span>${escaparHtml(cartao.titulo)}</span>
            </div>
            <strong class="metica-valor">${formatarNumero(cartao.valor)}</strong>
        </article>`).join('');
}

function renderizarLinha(pedido, selecionados) {
    const numero = escaparHtml(pedido.numero);
    const selecionado = selecionados.includes(pedido.numero);

    return `
        <tr class="${selecionado ? 'selecionada' : ''}">
            <td>
                <input
                    type="checkbox"
                    data-selecionar="${numero}"
                    ${selecionado ? 'checked' : ''}
                    aria-label="Selecionar pedido ${numero}"
                >
            </td>
            <td><strong>#${numero}</strong></td>
            <td>${escaparHtml(formatarDataHora(pedido.criadoEm))}</td>
            <td>
                ${escaparHtml(pedido.cliente)}
                <small>Chave: ${escaparHtml(pedido.chaveNfe)}</small>
            </td>
            <td>${escaparHtml(pedido.documento)}</td>
            <td>${escaparHtml(obterRotulo(pedido.canal, CANAIS))}</td>
            <td>${formatarNumero(pedido.itens)}</td>
            <td>${escaparHtml(obterRotulo(pedido.pagamento, PAGAMENTOS))}</td>
            <td>
                <span class="etiqueta etiqueta-${obterVariante(pedido.statusFiscal, STATUS_FISCAL)}">
                    ${escaparHtml(obterRotulo(pedido.statusFiscal, STATUS_FISCAL))}
                </span>
            </td>
            <td>
                <span class="etiqueta etiqueta-${obterVariante(pedido.status, STATUS_PEDIDO)}">
                    ${escaparHtml(obterRotulo(pedido.status, STATUS_PEDIDO))}
                </span>
            </td>
            <td class="valor-tabela">${escaparHtml(formatarMoeda(pedido.valorTotal))}</td>
            <td>
                <div class="acoes-tabela">
                    <button type="button" class="botao-icone" data-acao="visualizar" data-id="${numero}" title="Visualizar" aria-label="Visualizar pedido ${numero}">
                        <i class="fa-solid fa-eye" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="botao-icone" data-acao="imprimir" data-id="${numero}" title="Imprimir" aria-label="Imprimir pedido ${numero}">
                        <i class="fa-solid fa-print" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="botao-icone" data-acao="mais" data-id="${numero}" title="Mais ações" aria-label="Mais ações do pedido ${numero}">
                        <i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        </tr>`;
}

function renderizarPaginacao(totalRegistros, estado) {
    const totalPaginas = calcularTotalPaginas(totalRegistros, estado.tamanhoPagina);
    const pagina = Math.min(Math.max(estado.pagina, 1), totalPaginas);
    const inicio = totalRegistros === 0 ? 0 : (pagina - 1) * estado.tamanhoPagina + 1;
    const fim = Math.min(pagina * estado.tamanhoPagina, totalRegistros);
    const paginas = Array.from({ length: totalPaginas }, (_, indice) => indice + 1);

    paginacao.innerHTML = `
        <div class="paginacao">
            <span>
                Mostrando <strong>${formatarNumero(inicio)}-${formatarNumero(fim)}</strong>
                de <strong>${formatarNumero(totalRegistros)}</strong> pedidos
            </span>
            <div class="paginacao-botoes" role="group" aria-label="Páginas de pedidos">
                <button type="button" class="botao botao-secundario botao-pequeno" data-pagina="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Anterior
                </button>
                ${paginas.map((numero) => `
                    <button
                        type="button"
                        class="botao botao-secundario botao-pequeno ${numero === pagina ? 'botao-pagina-ativa' : ''}"
                        data-pagina="${numero}"
                        ${numero === pagina ? 'aria-current="page"' : ''}
                    >${numero}</button>`).join('')}
                <button type="button" class="botao botao-secundario botao-pequeno" data-pagina="${pagina + 1}" ${pagina >= totalPaginas ? 'disabled' : ''}>
                    Próxima <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
        </div>`;
}

function renderizarBarraLote(estado) {
    const quantidade = estado.selecionados.length;
    barraLote.hidden = quantidade === 0;

    if (quantidade === 0) {
        return;
    }

    porId('contador-selecionados').textContent = `${formatarNumero(quantidade)} ${
        quantidade === 1 ? 'pedido selecionado' : 'pedidos selecionados'
    }`;
}

function atualizarControles(estado) {
    if (document.activeElement !== campoBusca) {
        campoBusca.value = estado.busca;
    }

    Object.entries(camposFiltro).forEach(([chave, campo]) => {
        if (campo && campo.value !== estado[chave]) {
            campo.value = estado[chave];
        }
    });

    if (campoTamanhoPagina.value !== String(estado.tamanhoPagina)) {
        campoTamanhoPagina.value = String(estado.tamanhoPagina);
    }

    root.querySelectorAll('[data-aba]').forEach((botao) => {
        const ativo = botao.dataset.aba === estado.aba;
        botao.classList.toggle('filtro-periodo-ativo', ativo);
        botao.setAttribute('aria-selected', String(ativo));
    });
}

function renderizarTabela(filtrados, estado) {
    const totalPaginas = calcularTotalPaginas(filtrados.length, estado.tamanhoPagina);
    const pagina = Math.min(Math.max(estado.pagina, 1), totalPaginas);
    const inicio = (pagina - 1) * estado.tamanhoPagina;
    const itens = filtrados.slice(inicio, inicio + estado.tamanhoPagina);

    porId('resumo-lista-pedidos').textContent = `${formatarNumero(filtrados.length)} ${
        filtrados.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'
    }`;

    if (itens.length === 0) {
        corpoTabela.innerHTML = '';
        areaTabela.hidden = true;
        estadoTabela.innerHTML = '';
        renderizarVazio(
            estadoTabela,
            'Nenhum pedido encontrado',
            'Ajuste os filtros ou limpe a busca para ver mais resultados.'
        );
        selecionarTodos.checked = false;
        selecionarTodos.indeterminate = false;
        selecionarTodos.disabled = true;
        return;
    }

    areaTabela.hidden = false;
    estadoTabela.innerHTML = '';
    corpoTabela.innerHTML = itens.map((pedido) => renderizarLinha(pedido, estado.selecionados)).join('');

    const idsVisiveis = filtrados.map((pedido) => pedido.numero);
    const selecionadosVisiveis = idsVisiveis.filter((id) => estado.selecionados.includes(id));
    selecionarTodos.disabled = false;
    selecionarTodos.checked = selecionadosVisiveis.length === idsVisiveis.length;
    selecionarTodos.indeterminate = selecionadosVisiveis.length > 0 && !selecionarTodos.checked;
}

function renderizar() {
    const estado = store.obter();
    const base = aplicarFiltros(estado.pedidos, estado, false);
    const filtrados = aplicarFiltros(estado.pedidos, estado, true);

    atualizarControles(estado);
    renderizarMetricas(base);
    renderizarTabela(filtrados, estado);
    renderizarPaginacao(filtrados.length, estado);
    renderizarBarraLote(estado);
}

function obterPedido(numero) {
    return store.obter().pedidos.find((pedido) => pedido.numero === numero);
}

function alternarSelecao(numero, selecionado) {
    const selecionados = store.obter().selecionados;
    const proximos = selecionado
        ? [...new Set([...selecionados, numero])]
        : selecionados.filter((id) => id !== numero);

    store.definir({ selecionados: proximos });
}

function abrirDetalhes(pedido, imprimir = false) {
    const conteudo = `
        <dl class="detalhes-pedido">
            <div><dt>Pedido</dt><dd>#${escaparHtml(pedido.numero)}</dd></div>
            <div><dt>Data/Hora</dt><dd>${escaparHtml(formatarDataHora(pedido.criadoEm))}</dd></div>
            <div><dt>Cliente</dt><dd>${escaparHtml(pedido.cliente)}</dd></div>
            <div><dt>CPF/CNPJ</dt><dd>${escaparHtml(pedido.documento)}</dd></div>
            <div><dt>Canal</dt><dd>${escaparHtml(obterRotulo(pedido.canal, CANAIS))}</dd></div>
            <div><dt>Itens</dt><dd>${formatarNumero(pedido.itens)}</dd></div>
            <div><dt>Pagamento</dt><dd>${escaparHtml(obterRotulo(pedido.pagamento, PAGAMENTOS))}</dd></div>
            <div><dt>Status fiscal</dt><dd>${escaparHtml(obterRotulo(pedido.statusFiscal, STATUS_FISCAL))}</dd></div>
            <div><dt>Status do pedido</dt><dd>${escaparHtml(obterRotulo(pedido.status, STATUS_PEDIDO))}</dd></div>
            <div><dt>Valor total</dt><dd>${escaparHtml(formatarMoeda(pedido.valorTotal))}</dd></div>
            <div><dt>Chave NF-e</dt><dd>${escaparHtml(pedido.chaveNfe)}</dd></div>
        </dl>
        <div class="acoes-modal">
            <button type="button" class="botao botao-secundario" data-acao="fechar">Fechar</button>
            <button type="button" class="botao botao-destaque" data-acao="imprimir">
                <i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir
            </button>
        </div>`;

    abrirModal({ titulo: `Detalhes do pedido #${pedido.numero}`, conteudo });

    const modal = document.getElementById('modal-overlay');
    modal.querySelector('[data-acao="fechar"]').addEventListener('click', fecharModal);
    modal.querySelector('[data-acao="imprimir"]').addEventListener('click', () => window.print());

    if (imprimir) {
        window.requestAnimationFrame(() => window.print());
    }
}

function cancelarPedido(numero) {
    if (!window.confirm(`Deseja cancelar o pedido #${numero}?`)) {
        return;
    }

    const pedidos = store.obter().pedidos.map((pedido) => (
        pedido.numero === numero
            ? { ...pedido, status: 'cancelado', statusFiscal: 'cancelada' }
            : pedido
    ));

    store.definir({ pedidos });
    fecharModal();
    mostrarToast(`Pedido #${numero} cancelado localmente.`);
}

async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        mostrarToast(`Pedido #${texto} copiado.`);
    } catch {
        mostrarToast('Não foi possível copiar automaticamente. Copie o número manualmente.', 'erro');
    }
}

function abrirMaisAcoes(pedido) {
    const conteudo = `
        <dl class="detalhes-pedido">
            <div><dt>Pedido</dt><dd>#${escaparHtml(pedido.numero)}</dd></div>
            <div><dt>Cliente</dt><dd>${escaparHtml(pedido.cliente)}</dd></div>
            <div><dt>Status</dt><dd>${escaparHtml(obterRotulo(pedido.status, STATUS_PEDIDO))}</dd></div>
            <div><dt>Valor total</dt><dd>${escaparHtml(formatarMoeda(pedido.valorTotal))}</dd></div>
        </dl>
        <div class="acoes-modal">
            <button type="button" class="botao botao-secundario" data-acao="copiar">
                <i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar número
            </button>
            <button type="button" class="botao botao-secundario" data-acao="nfe">
                <i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Emitir NF-e
            </button>
            ${pedido.status !== 'cancelado' ? `
                <button type="button" class="botao botao-secundario" data-acao="cancelar">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i> Cancelar pedido
                </button>` : ''}
            <button type="button" class="botao botao-destaque" data-acao="fechar">Fechar</button>
        </div>`;

    abrirModal({ titulo: `Ações do pedido #${pedido.numero}`, conteudo });

    const modal = document.getElementById('modal-overlay');
    modal.querySelector('[data-acao="fechar"]').addEventListener('click', fecharModal);
    modal.querySelector('[data-acao="copiar"]').addEventListener('click', () => copiarTexto(pedido.numero));
    modal.querySelector('[data-acao="nfe"]').addEventListener('click', () => {
        mostrarToast('Emissão de NF-e depende da integração fiscal com o backend.');
    });
    modal.querySelector('[data-acao="cancelar"]')?.addEventListener('click', () => cancelarPedido(pedido.numero));
}

function abrirAlterarStatusLote(ids) {
    const opcoes = Object.entries(STATUS_PEDIDO).map(([valor, dados]) => `
        <option value="${valor}">${escaparHtml(dados.label)}</option>`).join('');
    const conteudo = `
        <div class="campo-grupo">
            <label for="novo-status-lote">Novo status</label>
            <select id="novo-status-lote" class="campo">${opcoes}</select>
        </div>
        <div class="acoes-modal">
            <button type="button" class="botao botao-secundario" data-acao="cancelar">Cancelar</button>
            <button type="button" class="botao botao-destaque" data-acao="confirmar">
                Aplicar a ${formatarNumero(ids.length)} ${ids.length === 1 ? 'pedido' : 'pedidos'}
            </button>
        </div>`;

    abrirModal({ titulo: 'Alterar status em lote', conteudo });

    const modal = document.getElementById('modal-overlay');
    modal.querySelector('[data-acao="cancelar"]').addEventListener('click', fecharModal);
    modal.querySelector('[data-acao="confirmar"]').addEventListener('click', () => {
        const novoStatus = modal.querySelector('#novo-status-lote').value;
        const pedidos = store.obter().pedidos.map((pedido) => (
            ids.includes(pedido.numero) ? { ...pedido, status: novoStatus } : pedido
        ));

        store.definir({ pedidos });
        fecharModal();
        mostrarToast(`Status atualizado para ${formatarNumero(ids.length)} ${ids.length === 1 ? 'pedido' : 'pedidos'}.`);
    });
}

function exportarCsv() {
    const estado = store.obter();
    const filtrados = aplicarFiltros(estado.pedidos, estado, true);

    if (filtrados.length === 0) {
        mostrarToast('Nenhum pedido encontrado para exportar.');
        return;
    }

    const escaparCsv = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const colunas = [
        'Pedido', 'Data/Hora', 'Cliente', 'CPF/CNPJ', 'Canal', 'Itens',
        'Pagamento', 'Status fiscal', 'Status do pedido', 'Valor total', 'Chave NF-e'
    ];
    const linhas = filtrados.map((pedido) => [
        pedido.numero,
        formatarDataHora(pedido.criadoEm),
        pedido.cliente,
        pedido.documento,
        obterRotulo(pedido.canal, CANAIS),
        pedido.itens,
        obterRotulo(pedido.pagamento, PAGAMENTOS),
        obterRotulo(pedido.statusFiscal, STATUS_FISCAL),
        obterRotulo(pedido.status, STATUS_PEDIDO),
        formatarMoeda(pedido.valorTotal),
        pedido.chaveNfe
    ]);

    const conteudo = [colunas, ...linhas]
        .map((linha) => linha.map(escaparCsv).join(';'))
        .join('\r\n');
    const blob = new Blob([`\uFEFF${conteudo}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    mostrarToast(`${formatarNumero(filtrados.length)} ${filtrados.length === 1 ? 'pedido exportado' : 'pedidos exportados'} em CSV.`);
}

const aoBuscar = debounce((valor) => store.definir({ busca: valor, pagina: 1 }), 200);
campoBusca.addEventListener('input', (evento) => aoBuscar(evento.target.value));

Object.entries(camposFiltro).forEach(([chave, campo]) => {
    campo.addEventListener('change', (evento) => store.definir({ [chave]: evento.target.value, pagina: 1 }));
});

campoTamanhoPagina.addEventListener('change', (evento) => {
    store.definir({ tamanhoPagina: Number(evento.target.value), pagina: 1 });
});

porId('btn-limpar-filtros').addEventListener('click', () => {
    store.definir({
        busca: '',
        periodo: 'todos',
        aba: 'todos',
        status: 'todos',
        canal: 'todos',
        pagamento: 'todos',
        statusFiscal: 'todos',
        pagina: 1
    });
    mostrarToast('Filtros limpos.');
});

porId('abas-pedidos').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-aba]');
    if (botao) {
        store.definir({ aba: botao.dataset.aba, pagina: 1 });
    }
});

selecionarTodos.addEventListener('change', (evento) => {
    const estado = store.obter();
    const ids = aplicarFiltros(estado.pedidos, estado).map((pedido) => pedido.numero);
    const selecionados = evento.target.checked
        ? [...new Set([...estado.selecionados, ...ids])]
        : estado.selecionados.filter((id) => !ids.includes(id));

    store.definir({ selecionados });
});

corpoTabela.addEventListener('change', (evento) => {
    const checkbox = evento.target.closest('[data-selecionar]');
    if (checkbox) {
        alternarSelecao(checkbox.dataset.selecionar, checkbox.checked);
    }
});

corpoTabela.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) {
        return;
    }

    const pedido = obterPedido(botao.dataset.id);
    if (!pedido) {
        return;
    }

    if (botao.dataset.acao === 'visualizar') {
        abrirDetalhes(pedido);
        return;
    }

    if (botao.dataset.acao === 'imprimir') {
        abrirDetalhes(pedido, true);
        return;
    }

    if (botao.dataset.acao === 'mais') {
        abrirMaisAcoes(pedido);
    }
});

barraLote.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-lote]');
    if (!botao) {
        return;
    }

    const ids = store.obter().selecionados;
    if (ids.length === 0) {
        return;
    }

    if (botao.dataset.lote === 'nfe') {
        mostrarToast('Emissão de NF-e em lote depende da integração fiscal com o backend.');
        return;
    }

    if (botao.dataset.lote === 'etiquetas') {
        mostrarToast('Impressão de etiquetas em lote depende da integração com expedição.');
        return;
    }

    if (botao.dataset.lote === 'status') {
        abrirAlterarStatusLote(ids);
        return;
    }

    if (botao.dataset.lote === 'limpar') {
        store.definir({ selecionados: [] });
    }
});

paginacao.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-pagina]');
    if (!botao || botao.disabled) {
        return;
    }

    store.definir({ pagina: Number(botao.dataset.pagina) });
    porId('lista-pedidos').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

porId('btn-exportar').addEventListener('click', exportarCsv);

porId('btn-importar').addEventListener('click', () => {
    mostrarToast('Importação de pedidos depende da integração com o backend.');
});

store.assinar((estado, patch) => {
    if ('busca' in patch && document.activeElement !== campoBusca) {
        campoBusca.value = estado.busca;
    }

    renderizar();
});

renderizar();
