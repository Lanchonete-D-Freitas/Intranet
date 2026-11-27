import { MENSAGENS } from './constants.js';
import { backendConfigurado, chamar } from './api.js';
import { servicos } from './services.js';
import { criarStore } from './store.js';
import { montarLayout } from './layout.js';
import { abrirModal, fecharModal, mostrarToast } from './ui.js';
import {
    escaparHtml,
    formatarMoeda,
    formatarNumero,
    normalizarTexto,
    salvarArmazenamento
} from './utils.js';

const CHAVE_RASCUNHO = 'dfreitas.pedido.rascunho';
const CHAVE_CONFIRMADOS = 'dfreitas.pedidos.confirmados';
const FUSO_HORARIO = 'America/Sao_Paulo';

// Regras comerciais de exemplo presentes no rascunho de emissão de pedidos.
// Quando houver backend, os valores e condições devem vir da integração.
const TAXA_IMPOSTOS = 82435 / 428000;
const DESCONTO_CUPOM = 0.035;
const DESCONTO_PIX = 0.03;
const MAX_PARCELAS_CARTAO = 6;
const LOGISTICA_PADRAO = Object.freeze({ volumes: 2, peso: 6.4, cubagem: 0.038 });
const CUPONS = Object.freeze({ 'VIP-FIDELIDADE': DESCONTO_CUPOM });

const CLIENTES = Object.freeze([{
    id: 'techsul',
    nome: 'TechSul Distribuidora e Logística Ltda.',
    tier: 'VIP Tier 1',
    cnpj: '12.345.678/0001-90',
    ie: '254.981.002-PR',
    creditoCentos: 5000000,
    historico: [
        { numero: 'ORD-2025-0641', data: '12/03/2025', valorCentos: 1289000 },
        { numero: 'ORD-2025-0412', data: '18/02/2025', valorCentos: 842000 }
    ]
}]);

const PRODUTOS = [
    {
        sku: 'TEC-MECH-900',
        nome: 'Teclado Mecânico Pro RGB Titan Switch',
        ncm: '8471.60.52',
        cfop: '5102',
        estoque: 42,
        precoCentos: 38000,
        descontoFixoCentos: 10000
    },
    {
        sku: 'CAB-USBC-2M',
        nome: 'Cabo Trançado USB-C 100W PD Ultra 2m',
        ncm: '8544.42.00',
        cfop: '5102',
        estoque: 180,
        precoCentos: 4000
    },
    {
        sku: 'ACC-PAD-9040',
        nome: 'Mousepad Desk Mat 900x400 Impermeável',
        ncm: '3926.90.90',
        cfop: '5102',
        estoque: 95,
        precoCentos: 5000
    }
];

const TRANSPORTADORAS = Object.freeze({
    total: { nome: 'Total Express Rodoviário', prazo: '3 dias úteis', precoCentos: 4250 },
    sedex: { nome: 'Correios SEDEX Express', prazo: '1 dia útil', precoCentos: 8820 }
});

const PAGAMENTOS = Object.freeze({
    boleto: { rotulo: 'Boleto Faturado', parcelas: 3 },
    pix: { rotulo: 'PIX Instantâneo', parcelas: 1 },
    cartao: { rotulo: 'Cartão Corporativo', parcelas: 3 }
});

const ROTULOS = Object.freeze({
    representante: 'Representante B2B (Regional Sul)',
    ecommerce: 'E-Commerce B2B Portal',
    televendas: 'Televendas Ativa',
    balcao: 'Balcão Matriz',
    atacado: 'Tabela Atacado Especial (ICMS Incluso)',
    distribuicao: 'Tabela Distribuição 2025',
    promocional: 'Tabela Promocional Q1',
    '5102': 'Venda de Mercadoria Adquirida de Terceiros (5102)',
    '5910': 'Remessa em Bonificação / Doação (5910)',
    '5912': 'Remessa para Mostruário / Demonstração (5912)'
});

let mensagemCupom = null;

const porId = (id) => document.getElementById(id);

function lerJson(chave, padrao) {
    try {
        const valor = window.localStorage.getItem(chave);
        return valor === null ? padrao : JSON.parse(valor);
    } catch {
        return padrao;
    }
}

function datasPadrao() {
    const hoje = new Date();

    return [30, 60, 90].map((dias) => {
        const data = new Date(hoje);
        data.setDate(data.getDate() + dias);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        return `${data.getFullYear()}-${mes}-${dia}`;
    });
}

function estadoPadrao() {
    return {
        periodo: 'hoje',
        busca: '',
        conectado: navigator.onLine,
        numero: 'ORD-2025-0894',
        criadoEm: new Date().toISOString(),
        clienteId: 'techsul',
        endereco: 'cd-sjp',
        enderecoTemporario: '',
        canal: 'representante',
        tabela: 'atacado',
        itens: PRODUTOS.map((produto, indice) => ({
            sku: produto.sku,
            nome: produto.nome,
            ncm: produto.ncm,
            cfop: produto.cfop,
            estoque: produto.estoque,
            quantidade: [10, 12, 2][indice],
            precoCentos: produto.precoCentos,
            descontoPercentual: 0,
            descontoFixoCentos: produto.descontoFixoCentos ?? 0,
            observacao: ''
        })),
        pagamento: 'boleto',
        parcelasCartao: 3,
        datasParcelas: datasPadrao(),
        personalizarDatas: false,
        freteTipo: 'CIF',
        transportadora: 'total',
        natureza: '5102',
        vendedor: 'Carlos Eduardo Martins (ID #142)',
        dadosFiscais: '',
        observacoes: '',
        cupom: 'VIP-FIDELIDADE',
        cupomAplicado: true,
        autoNfe: true,
        autoEnvio: true
    };
}

function normalizarItem(item) {
    const dados = item ?? {};
    const produto = PRODUTOS.find((candidato) => candidato.sku === dados.sku) ?? {};

    return {
        sku: String(dados.sku ?? ''),
        nome: String(dados.nome ?? produto.nome ?? 'Produto'),
        ncm: String(dados.ncm ?? produto.ncm ?? ''),
        cfop: String(dados.cfop ?? produto.cfop ?? ''),
        estoque: Number(dados.estoque ?? produto.estoque ?? 0),
        quantidade: Number(dados.quantidade ?? 1),
        precoCentos: Number(dados.precoCentos ?? produto.precoCentos ?? 0),
        descontoPercentual: Number(dados.descontoPercentual ?? 0),
        descontoFixoCentos: Number(dados.descontoFixoCentos ?? 0),
        observacao: String(dados.observacao ?? '')
    };
}

function carregarRascunho() {
    const salvo = lerJson(CHAVE_RASCUNHO, null);
    const base = estadoPadrao();

    if (!salvo || typeof salvo !== 'object' || Array.isArray(salvo)) {
        return base;
    }

    return {
        ...base,
        ...salvo,
        periodo: base.periodo,
        busca: base.busca,
        conectado: base.conectado,
        itens: Array.isArray(salvo.itens) ? salvo.itens.map(normalizarItem) : base.itens,
        datasParcelas: Array.isArray(salvo.datasParcelas) ? salvo.datasParcelas : base.datasParcelas
    };
}

const store = criarStore(carregarRascunho());

function paraCentos(valor) {
    const texto = String(valor ?? '').replace(/[^\d,.-]/g, '').trim();
    if (!texto) {
        return NaN;
    }

    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;
    const numero = Number(normalizado);

    return Number.isFinite(numero) ? Math.round(numero * 100) : NaN;
}

function formatarCentos(centos) {
    return formatarMoeda((Number(centos) || 0) / 100);
}

function formatarPeso(peso) {
    return `${Number(peso || 0).toFixed(2).replace('.', ',')} kg`;
}

function clienteAtual(estado) {
    return CLIENTES.find((cliente) => cliente.id === estado.clienteId) ?? CLIENTES[0];
}

function produtoPorSku(sku) {
    return PRODUTOS.find((produto) => produto.sku === sku);
}

function localizarProduto(termo) {
    const busca = normalizarTexto(termo);
    if (!busca) {
        return null;
    }

    const corresponde = (produto) => normalizarTexto(produto.sku).includes(busca)
        || normalizarTexto(produto.nome).includes(busca)
        || normalizarTexto(produto.codigoBarras).includes(busca);

    return PRODUTOS.find((produto) => normalizarTexto(produto.sku) === busca)
        ?? PRODUTOS.find(corresponde)
        ?? null;
}

function calcularItem(item) {
    const brutoCentos = Math.max(0, item.precoCentos * item.quantidade);
    const descontoFixo = Math.min(Math.max(0, item.descontoFixoCentos), brutoCentos);
    const descontoPercentual = Math.round(
        (brutoCentos - descontoFixo) * (Math.max(0, item.descontoPercentual) / 100)
    );
    const descontoCentos = Math.min(brutoCentos, descontoFixo + descontoPercentual);

    return {
        brutoCentos,
        descontoCentos,
        totalCentos: brutoCentos - descontoCentos
    };
}

function quantidadeParcelas(estado) {
    if (estado.pagamento === 'cartao') {
        const valor = Number(estado.parcelasCartao);
        return Number.isInteger(valor) && valor >= 1 && valor <= MAX_PARCELAS_CARTAO
            ? valor
            : 3;
    }

    return PAGAMENTOS[estado.pagamento]?.parcelas ?? 1;
}

function calcularTotais(estado) {
    const itens = estado.itens.map(calcularItem);
    const descontoItensCentos = itens.reduce((soma, item) => soma + item.descontoCentos, 0);
    const subtotalCentos = itens.reduce((soma, item) => soma + item.totalCentos, 0);
    const descontoCupomCentos = estado.cupomAplicado && CUPONS[estado.cupom]
        ? Math.round(subtotalCentos * CUPONS[estado.cupom])
        : 0;
    const transportadora = TRANSPORTADORAS[estado.transportadora] ?? { precoCentos: 0 };
    const freteCentos = estado.freteTipo === 'CIF' ? transportadora.precoCentos : 0;
    const impostosCentos = Math.round(subtotalCentos * TAXA_IMPOSTOS);
    const totalCentos = Math.max(0, subtotalCentos - descontoCupomCentos + freteCentos);
    const descontoPixCentos = estado.pagamento === 'pix'
        ? Math.round(totalCentos * DESCONTO_PIX)
        : 0;
    const liquidoCentos = totalCentos - descontoPixCentos;
    const parcelas = quantidadeParcelas(estado);
    const valorBase = Math.floor(liquidoCentos / parcelas);
    const resto = liquidoCentos - valorBase * parcelas;
    const valoresParcelas = Array.from(
        { length: parcelas },
        (_, indice) => valorBase + (indice < resto ? 1 : 0)
    );

    return {
        subtotalCentos,
        descontoItensCentos,
        descontoCupomCentos,
        descontoPixCentos,
        freteCentos,
        impostosCentos,
        totalCentos,
        liquidoCentos,
        parcelas,
        valoresParcelas,
        quantidadeItens: estado.itens.length,
        quantidadeUnidades: estado.itens.reduce((soma, item) => soma + item.quantidade, 0)
    };
}

function validarPedido(estado, totais) {
    const erros = [];
    const itensVerificacao = [];
    const cliente = clienteAtual(estado);

    function verificar(condicao, textoOk, textoErro) {
        itensVerificacao.push({ ok: Boolean(condicao), texto: condicao ? textoOk : textoErro });
        if (!condicao) {
            erros.push(textoErro);
        }
    }

    verificar(
        Boolean(estado.clienteId && cliente.nome),
        `Cliente ${cliente.nome} selecionado`,
        'Selecione um cliente para o pedido.'
    );
    verificar(
        Boolean(cliente.cnpj && cliente.ie),
        `Inscrição estadual ativa (${cliente.ie})`,
        'O cliente precisa ter CNPJ e inscrição estadual cadastrados.'
    );
    verificar(
        totais.quantidadeItens > 0,
        `Itens conferidos (${totais.quantidadeItens})`,
        'Adicione pelo menos um item ao pedido.'
    );

    const estoqueInsuficiente = estado.itens.find((item) => {
        const produto = produtoPorSku(item.sku);
        return !produto || item.quantidade > produto.estoque;
    });
    verificar(
        !estoqueInsuficiente,
        `Estoque disponível para ${formatarNumero(totais.quantidadeUnidades)} unidades`,
        estoqueInsuficiente
            ? `Quantidade acima do estoque para ${estoqueInsuficiente.nome}.`
            : 'Estoque indisponível para os itens do pedido.'
    );

    const itemInvalido = estado.itens.find((item) => !Number.isInteger(item.quantidade)
        || item.quantidade < 1
        || item.precoCentos <= 0
        || item.descontoPercentual < 0
        || item.descontoPercentual > 100);
    verificar(
        !itemInvalido,
        'Quantidades, preços e descontos válidos',
        itemInvalido
            ? `Revise quantidade, preço ou desconto de ${itemInvalido.nome}.`
            : 'Revise os valores dos itens do pedido.'
    );

    verificar(
        totais.liquidoCentos <= cliente.creditoCentos,
        `Limite de crédito disponível (${formatarMoeda(cliente.creditoCentos / 100)})`,
        `Valor do pedido acima do limite de crédito (${formatarMoeda(cliente.creditoCentos / 100)}).`
    );
    verificar(
        Boolean(estado.endereco && (estado.endereco !== 'temporario' || estado.enderecoTemporario.trim())),
        estado.endereco === 'temporario'
            ? 'Endereço temporário de obra informado'
            : `Endereço de entrega: ${ROTULOS[estado.endereco] ?? 'informado'}`,
        'Informe o endereço de entrega.'
    );
    verificar(
        Boolean(estado.canal && estado.tabela),
        `Canal ${ROTULOS[estado.canal] ?? ''} e ${ROTULOS[estado.tabela] ?? 'tabela'}`,
        'Selecione o canal de origem e a tabela de preço.'
    );
    verificar(
        Boolean(PAGAMENTOS[estado.pagamento]),
        `Pagamento: ${PAGAMENTOS[estado.pagamento]?.rotulo ?? 'não informado'}`,
        'Selecione uma forma de pagamento.'
    );
    verificar(
        estado.freteTipo === 'retirada' || Boolean(TRANSPORTADORAS[estado.transportadora]),
        estado.freteTipo === 'retirada'
            ? 'Retirada no balcão selecionada'
            : `Transporte: ${TRANSPORTADORAS[estado.transportadora]?.nome ?? ''}`,
        'Selecione uma transportadora para o frete.'
    );
    verificar(
        Boolean(estado.natureza && estado.vendedor.trim()),
        'Natureza fiscal e vendedor responsável informados',
        'Informe a natureza da operação e o vendedor responsável.'
    );

    return { erros, itensVerificacao };
}

function definirTexto(id, texto) {
    const elemento = porId(id);
    if (elemento) {
        elemento.textContent = texto;
    }
}

function definirValor(id, valor) {
    const elemento = porId(id);
    if (elemento && document.activeElement !== elemento) {
        elemento.value = valor;
    }
}

function mostrarMensagemItem(texto) {
    const mensagem = porId('mensagem-itens');
    mensagem.textContent = texto;
    mensagem.hidden = !texto;
}

function formatarDataPedido(valor) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
        return 'Hoje, 14:32 (Horário de Brasília)';
    }

    const opcoesData = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: FUSO_HORARIO
    };
    const hora = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: FUSO_HORARIO
    }).format(data);
    const dataPedido = new Intl.DateTimeFormat('pt-BR', opcoesData).format(data);
    const dataAtual = new Intl.DateTimeFormat('pt-BR', opcoesData).format(new Date());
    const prefixo = dataPedido === dataAtual ? 'Hoje' : dataPedido;

    return `${prefixo}, ${hora} (Horário de Brasília)`;
}

function renderizarCliente(estado) {
    const cliente = clienteAtual(estado);

    definirTexto('numero-pedido', `Rascunho #${estado.numero}`);
    definirTexto('data-pedido', formatarDataPedido(estado.criadoEm));
    definirTexto('cliente-nome', cliente.nome);
    definirTexto('cliente-tier', cliente.tier);
    definirTexto('cliente-cnpj', `CNPJ: ${cliente.cnpj}`);
    definirTexto('cliente-ie', `IE: ${cliente.ie}`);
    definirTexto('cliente-credito-valor', `Crédito Disp: ${formatarMoeda(cliente.creditoCentos / 100)}`);

    porId('endereco-entrega').value = estado.endereco;
    porId('canal-origem').value = estado.canal;
    porId('tabela-preco').value = estado.tabela;
    porId('natureza-operacao').value = estado.natureza;
    definirValor('vendedor', estado.vendedor);
    definirValor('dados-fiscais', estado.dadosFiscais);
    definirValor('observacoes-internas', estado.observacoes);
}

function renderizarItens(estado) {
    const tbody = porId('itens-tabela');
    const termo = normalizarTexto(estado.busca);
    const itens = termo
        ? estado.itens.filter((item) => normalizarTexto(item.nome).includes(termo)
            || normalizarTexto(item.sku).includes(termo))
        : estado.itens;

    if (estado.itens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="texto-suave">Nenhum item adicionado ao pedido.</td>
            </tr>`;
    } else if (itens.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="texto-suave">Nenhum item corresponde à busca informada.</td>
            </tr>`;
    } else {
        tbody.innerHTML = itens.map((item) => {
            const calculo = calcularItem(item);
            const rotuloQuantidade = `Quantidade de ${item.nome}`;
            const rotuloPreco = `Preço unitário de ${item.nome}`;
            const rotuloDesconto = `Desconto percentual de ${item.nome}`;

            return `
                <tr data-sku="${escaparHtml(item.sku)}">
                    <td>
                        <div class="item-produto">
                            <strong>${escaparHtml(item.nome)}</strong>
                            <small>SKU: ${escaparHtml(item.sku)}</small>
                            ${item.observacao ? `<small><i class="fa-solid fa-sticky-note" aria-hidden="true"></i> ${escaparHtml(item.observacao)}</small>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="item-fiscal">
                            <span>${escaparHtml(item.ncm)}</span>
                            <small>CFOP ${escaparHtml(item.cfop)}</small>
                        </div>
                    </td>
                    <td>
                        <span class="etiqueta etiqueta-neutro">${formatarNumero(item.estoque)} un.</span>
                    </td>
                    <td>
                        <input class="campo campo-tabela" data-campo="quantidade" type="number" min="1" step="1" value="${escaparHtml(item.quantidade)}" aria-label="${escaparHtml(rotuloQuantidade)}">
                    </td>
                    <td>
                        <input class="campo campo-tabela campo-valor" data-campo="preco" inputmode="decimal" type="text" value="${escaparHtml(formatarCentos(item.precoCentos))}" aria-label="${escaparHtml(rotuloPreco)}">
                        ${item.descontoFixoCentos ? `<small class="texto-suave">-${escaparHtml(formatarCentos(item.descontoFixoCentos))} fixo</small>` : ''}
                    </td>
                    <td>
                        <input class="campo campo-tabela" data-campo="desconto" type="number" min="0" max="100" step="0.01" value="${escaparHtml(item.descontoPercentual)}" aria-label="${escaparHtml(rotuloDesconto)}">
                    </td>
                    <td><strong>${escaparHtml(formatarCentos(calculo.totalCentos))}</strong></td>
                    <td>
                        <div class="acoes-tabela">
                            <button class="botao-icone" type="button" data-acao-item="observacao" data-sku="${escaparHtml(item.sku)}" title="Adicionar observação" aria-label="Adicionar observação em ${escaparHtml(item.nome)}">
                                <i class="fa-solid fa-sticky-note" aria-hidden="true"></i>
                            </button>
                            <button class="botao-icone" type="button" data-acao-item="remover" data-sku="${escaparHtml(item.sku)}" title="Remover item" aria-label="Remover ${escaparHtml(item.nome)}">
                                <i class="fa-solid fa-trash" aria-hidden="true"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    definirTexto(
        'resumo-itens',
        `${estado.itens.length} ${estado.itens.length === 1 ? 'item adicionado' : 'itens adicionados'} • Peso total: ${formatarPeso(LOGISTICA_PADRAO.peso)}`
    );
}

function renderizarPagamento(estado, totais) {
    document.querySelectorAll('input[name="payment_method"]').forEach((radio) => {
        radio.checked = radio.value === estado.pagamento;
        radio.closest('label').classList.toggle('selecionada', radio.checked);
    });

    const titulo = porId('titulo-parcelas');
    titulo.textContent = estado.pagamento === 'cartao'
        ? `Cronograma de Faturamento (${totais.parcelas}x sem acréscimo)`
        : `Cronograma de Faturamento (${totais.parcelas === 1 ? 'pagamento à vista' : `${totais.parcelas} Parcelas Fixas`})`;

    const seletorParcelas = porId('parcelas-cartao');
    seletorParcelas.hidden = estado.pagamento !== 'cartao';
    seletorParcelas.value = String(estado.parcelasCartao);

    const botaoDatas = porId('btn-personalizar-datas');
    botaoDatas.hidden = estado.pagamento !== 'boleto';
    botaoDatas.innerHTML = `
        <i class="fa-regular fa-calendar" aria-hidden="true"></i>
        ${estado.personalizarDatas ? 'Concluir Datas' : 'Personalizar Datas'}`;

    const prazoTexto = estado.pagamento === 'boleto'
        ? '30/60/90 dias'
        : PAGAMENTOS[estado.pagamento]?.rotulo ?? '';

    porId('parcelas-container').innerHTML = totais.valoresParcelas.map((valor, indice) => {
        const descricao = estado.pagamento === 'boleto'
            ? `Parcela ${String(indice + 1).padStart(2, '0')} (${[30, 60, 90][indice]}d)`
            : estado.pagamento === 'pix'
                ? 'Pagamento único (PIX)'
                : `Parcela ${String(indice + 1).padStart(2, '0')}`;
        const data = estado.datasParcelas[indice] ?? '';
        const podePersonalizar = estado.personalizarDatas && estado.pagamento === 'boleto';

        return `
            <div class="parcela-cartao">
                <div class="parcela-cabecalho">
                    <span>${escaparHtml(descricao)}</span>
                    <i class="fa-regular fa-calendar-day" aria-hidden="true"></i>
                </div>
                <strong class="parcela-valor">${escaparHtml(formatarCentos(valor))}</strong>
                ${podePersonalizar
                    ? `<label class="sr-only" for="data-parcela-${indice}">Vencimento da parcela ${indice + 1}</label>
                       <input id="data-parcela-${indice}" class="campo" data-data-parcela="${indice}" type="date" value="${escaparHtml(data)}">`
                    : `<small class="parcela-data">${estado.pagamento === 'boleto' ? 'Vencimento' : 'Liquidação'}: ${data ? data.split('-').reverse().join('/') : 'a combinar'} · ${escaparHtml(prazoTexto)}</small>`}
            </div>`;
    }).join('');
}

function renderizarLogistica(estado) {
    porId('tipo-frete').value = estado.freteTipo;
    document.querySelectorAll('input[name="shipping_carrier"]').forEach((radio) => {
        radio.checked = radio.value === estado.transportadora;
        radio.closest('label').classList.toggle('selecionada', radio.checked);
    });

    definirTexto('metricas-volumes', `${LOGISTICA_PADRAO.volumes} volumes`);
    definirTexto('metricas-peso', formatarPeso(LOGISTICA_PADRAO.peso));
    definirTexto('metricas-cubagem', `${LOGISTICA_PADRAO.cubagem.toFixed(3).replace('.', ',')} m³`);
}

function renderizarResumo(estado, totais) {
    const transportadora = TRANSPORTADORAS[estado.transportadora]?.nome ?? 'Retirada';

    definirTexto('resumo-subtotal', formatarCentos(totais.subtotalCentos));
    definirTexto('resumo-descontos', `- ${formatarCentos(totais.descontoCupomCentos + totais.descontoPixCentos)}`);
    definirTexto(
        'resumo-frete-label',
        estado.freteTipo === 'retirada' ? 'Frete (Retirada no balcão)' : `Frete (${transportadora})`
    );
    definirTexto('resumo-frete', totais.freteCentos ? `+ ${formatarCentos(totais.freteCentos)}` : formatarCentos(0));
    definirTexto('resumo-despesas', formatarCentos(0));
    definirTexto('resumo-impostos', formatarCentos(totais.impostosCentos));
    definirTexto('resumo-ipi', 'R$ 0,00 (Isento)');
    definirTexto('resumo-total', formatarCentos(totais.liquidoCentos));
    definirTexto('resumo-parcelas', `${totais.parcelas}x ${formatarCentos(totais.valoresParcelas[0])}`);

    definirValor('cupom-codigo', estado.cupom);

    const mensagem = porId('mensagem-cupom');
    mensagem.textContent = mensagemCupom?.texto ?? '';
    mensagem.hidden = !mensagemCupom;
    mensagem.className = `texto-suave ${mensagemCupom?.tipo === 'erro' ? 'texto-erro' : ''}`.trim();
}

function renderizarAuditoria(validacao) {
    porId('auditoria-lista').innerHTML = validacao.itensVerificacao.map((item) => `
        <li class="${item.ok ? 'verificacao-ok' : 'verificacao-erro'}">
            <i class="fa-solid ${item.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}" aria-hidden="true"></i>
            <span>${escaparHtml(item.texto)}</span>
        </li>`).join('');

    const caixaErros = porId('erros-auditoria');
    caixaErros.className = 'alerta alerta-erro';
    caixaErros.hidden = validacao.erros.length === 0;
    caixaErros.innerHTML = validacao.erros.length
        ? `<ul>${validacao.erros.map((erro) => `<li>${escaparHtml(erro)}</li>`).join('')}</ul>`
        : '';
}

function renderizarHistorico(estado) {
    const cliente = clienteAtual(estado);
    porId('historico-cliente').innerHTML = cliente.historico.length
        ? cliente.historico.map((pedido) => `
            <div class="historico-pedido">
                <div>
                    <strong>#${escaparHtml(pedido.numero)}</strong>
                    <small>Faturado em ${escaparHtml(pedido.data)}</small>
                </div>
                <strong>${escaparHtml(formatarCentos(pedido.valorCentos))}</strong>
            </div>`).join('')
        : '<span class="texto-suave">Nenhum pedido recente para este cliente.</span>';
}

function renderizarTudo() {
    const estado = store.obter();
    const totais = calcularTotais(estado);
    const validacao = validarPedido(estado, totais);

    renderizarCliente(estado);
    renderizarItens(estado);
    renderizarPagamento(estado, totais);
    renderizarLogistica(estado);
    renderizarResumo(estado, totais);
    renderizarAuditoria(validacao);
    renderizarHistorico(estado);
}

function salvarRascunho(silencioso = false) {
    try {
        salvarArmazenamento(CHAVE_RASCUNHO, JSON.stringify(store.obter()));
        if (!silencioso) {
            mostrarToast('Rascunho salvo neste navegador.', 'sucesso');
        }
        return true;
    } catch {
        if (!silencioso) {
            mostrarToast('Não foi possível salvar o rascunho.', 'erro');
        }
        return false;
    }
}

function descartarPedido() {
    if (!window.confirm(MENSAGENS.confirmarCancelamento)) {
        return;
    }

    try {
        window.localStorage.removeItem(CHAVE_RASCUNHO);
    } catch {
        // Armazenamento indisponível: o estado em memória ainda é reiniciado.
    }

    mensagemCupom = null;
    store.definir(estadoPadrao());
    porId('busca-produto').value = '';
    porId('preco-inserir').value = '';
    porId('preco-inserir').dataset.editado = '';
    mostrarMensagemItem('');
    renderizarTudo();
    atualizarSugestoes();
    mostrarToast('Rascunho descartado. Novo pedido iniciado.', 'info');
}

function atualizarSugestoes() {
    const campoBusca = porId('busca-produto');
    const campoPreco = porId('preco-inserir');
    const termo = normalizarTexto(campoBusca.value);
    const produtos = termo
        ? PRODUTOS.filter((produto) => normalizarTexto(produto.sku).includes(termo)
            || normalizarTexto(produto.nome).includes(termo)
            || normalizarTexto(produto.codigoBarras).includes(termo))
        : [];

    porId('produtos-disponiveis').innerHTML = produtos.map((produto) => `
        <option value="${escaparHtml(produto.sku)}" label="${escaparHtml(produto.nome)}"></option>`).join('');

    const produto = localizarProduto(campoBusca.value);
    if (campoPreco.dataset.editado !== 'true') {
        campoPreco.value = produto ? formatarCentos(produto.precoCentos) : '';
    }
}

function inserirItem() {
    const campoBusca = porId('busca-produto');
    const campoPreco = porId('preco-inserir');
    const produto = localizarProduto(campoBusca.value);

    if (!produto) {
        mostrarMensagemItem('Produto não encontrado. Informe um SKU, código de barras ou nome do catálogo.');
        mostrarToast('Produto não encontrado no catálogo.', 'erro');
        campoBusca.focus();
        return;
    }

    const quantidade = Number(porId('qtd-inserir').value);
    const precoCentos = campoPreco.dataset.editado === 'true'
        ? paraCentos(campoPreco.value)
        : produto.precoCentos;
    const descontoPercentual = Number(porId('desconto-inserir').value);

    if (!Number.isInteger(quantidade) || quantidade < 1) {
        mostrarMensagemItem('A quantidade deve ser um número inteiro maior que zero.');
        return;
    }
    if (!Number.isFinite(precoCentos) || precoCentos <= 0) {
        mostrarMensagemItem('Informe um preço unitário válido.');
        return;
    }
    if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0 || descontoPercentual > 100) {
        mostrarMensagemItem('O desconto deve estar entre 0% e 100%.');
        return;
    }

    const estado = store.obter();
    const indice = estado.itens.findIndex((item) => item.sku === produto.sku);
    const quantidadeAtual = indice >= 0 ? estado.itens[indice].quantidade : 0;
    if (quantidadeAtual + quantidade > produto.estoque) {
        mostrarMensagemItem(`Estoque insuficiente: ${produto.nome} possui ${produto.estoque} unidades disponíveis.`);
        mostrarToast('Quantidade acima do estoque disponível.', 'erro');
        return;
    }

    const itens = [...estado.itens];
    if (indice >= 0) {
        itens[indice] = {
            ...itens[indice],
            quantidade: quantidadeAtual + quantidade,
            precoCentos,
            descontoPercentual
        };
    } else {
        itens.push({
            sku: produto.sku,
            nome: produto.nome,
            ncm: produto.ncm,
            cfop: produto.cfop,
            estoque: produto.estoque,
            quantidade,
            precoCentos,
            descontoPercentual,
            descontoFixoCentos: 0,
            observacao: ''
        });
    }

    mostrarMensagemItem('');
    store.definir({ itens });
    campoBusca.value = '';
    campoPreco.dataset.editado = '';
    atualizarSugestoes();
    mostrarToast(indice >= 0 ? 'Quantidade do item atualizada.' : 'Item adicionado ao pedido.', 'sucesso');
}

function alterarItem(evento) {
    const input = evento.target.closest('[data-campo]');
    const linha = input?.closest('tr[data-sku]');
    if (!linha) {
        return;
    }

    const estado = store.obter();
    const indice = estado.itens.findIndex((item) => item.sku === linha.dataset.sku);
    if (indice < 0) {
        return;
    }

    const produto = produtoPorSku(linha.dataset.sku);
    const item = { ...estado.itens[indice] };
    let invalido = '';

    if (input.dataset.campo === 'quantidade') {
        const quantidade = Number(input.value);
        if (!Number.isInteger(quantidade) || quantidade < 1) {
            invalido = 'A quantidade deve ser um número inteiro maior que zero.';
        } else if (produto && quantidade > produto.estoque) {
            invalido = `Estoque insuficiente: máximo de ${produto.estoque} unidades para ${item.nome}.`;
        } else {
            item.quantidade = quantidade;
        }
    } else if (input.dataset.campo === 'preco') {
        const precoCentos = paraCentos(input.value);
        if (!Number.isFinite(precoCentos) || precoCentos <= 0) {
            invalido = 'Informe um preço unitário válido.';
        } else {
            item.precoCentos = precoCentos;
        }
    } else if (input.dataset.campo === 'desconto') {
        const desconto = Number(input.value);
        if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
            invalido = 'O desconto deve estar entre 0% e 100%.';
        } else {
            item.descontoPercentual = desconto;
        }
    }

    mostrarMensagemItem(invalido);
    if (invalido) {
        renderizarTudo();
        return;
    }

    const itens = [...estado.itens];
    itens[indice] = item;
    store.definir({ itens });
}

function acionarItem(evento) {
    const botao = evento.target.closest('[data-acao-item]');
    if (!botao) {
        return;
    }

    const itens = store.obter().itens;
    const item = itens.find((candidato) => candidato.sku === botao.dataset.sku);
    if (!item) {
        return;
    }

    if (botao.dataset.acaoItem === 'remover') {
        store.definir({ itens: itens.filter((candidato) => candidato.sku !== item.sku) });
        mostrarToast('Item removido do pedido.', 'info');
        return;
    }

    abrirModal({
        titulo: `Observação - ${item.nome}`,
        conteudo: `
            <div class="campo-grupo">
                <label for="observacao-item">Observação do item</label>
                <textarea id="observacao-item" class="campo" rows="3" maxlength="300" placeholder="Instruções específicas deste item">${escaparHtml(item.observacao)}</textarea>
            </div>
            <div class="acoes-modal">
                <button class="botao botao-secundario" type="button" data-acao="fechar">Cancelar</button>
                <button class="botao botao-destaque" type="button" data-acao-modal="salvar-observacao" data-sku="${escaparHtml(item.sku)}">
                    <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar observação
                </button>
            </div>`
    });

    porId('modal-overlay').querySelector('.modal-corpo').addEventListener('click', (eventoModal) => {
        const botaoSalvar = eventoModal.target.closest('[data-acao-modal="salvar-observacao"]');
        if (!botaoSalvar) {
            return;
        }

        const estadoAtual = store.obter();
        const posicao = estadoAtual.itens.findIndex((candidato) => candidato.sku === botaoSalvar.dataset.sku);
        if (posicao >= 0) {
            const proximosItens = [...estadoAtual.itens];
            proximosItens[posicao] = {
                ...proximosItens[posicao],
                observacao: porId('observacao-item').value.trim()
            };
            store.definir({ itens: proximosItens });
        }
        fecharModal();
        mostrarToast('Observação salva no item.', 'sucesso');
    });
}

function aplicarCupom() {
    const codigo = porId('cupom-codigo').value.trim().toUpperCase();
    const valido = Boolean(codigo && CUPONS[codigo]);

    mensagemCupom = {
        texto: valido
            ? `Cupom ${codigo} aplicado: ${(CUPONS[codigo] * 100).toFixed(1).replace('.', ',')}% de desconto.`
            : codigo
                ? `Cupom ${codigo} inválido para este pedido.`
                : 'Informe um código de cupom.',
        tipo: valido ? 'ok' : 'erro'
    };

    store.definir({ cupom: codigo, cupomAplicado: valido });
    mostrarToast(mensagemCupom.texto, valido ? 'sucesso' : 'erro');
}

function abrirSeletorCliente() {
    abrirModal({
        titulo: 'Selecionar cliente',
        conteudo: `
            <div class="lista-opcoes">
                ${CLIENTES.map((cliente) => `
                    <div class="opcao-cliente">
                        <div>
                            <strong>${escaparHtml(cliente.nome)}</strong>
                            <small>${escaparHtml(cliente.cnpj)} · ${escaparHtml(cliente.ie)}</small>
                            <span class="etiqueta etiqueta-info">${escaparHtml(cliente.tier)}</span>
                        </div>
                        <button class="botao botao-secundario" type="button" data-selecionar-cliente="${escaparHtml(cliente.id)}">
                            <i class="fa-solid fa-check" aria-hidden="true"></i> Selecionar
                        </button>
                    </div>`).join('')}
            </div>`
    });

    porId('modal-overlay').querySelector('.modal-corpo').addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-selecionar-cliente]');
        if (!botao) {
            return;
        }

        store.definir({ clienteId: botao.dataset.selecionarCliente });
        fecharModal();
        mostrarToast('Cliente selecionado.', 'sucesso');
    });
}

function abrirEnderecoTemporario() {
    abrirModal({
        titulo: 'Endereço temporário de obra',
        conteudo: `
            <div class="campo-grupo">
                <label for="endereco-temporario">Endereço completo</label>
                <textarea id="endereco-temporario" class="campo" rows="2" maxlength="200" placeholder="Rua, número, complemento, cidade/UF">${escaparHtml(store.obter().enderecoTemporario)}</textarea>
            </div>
            <div class="acoes-modal">
                <button class="botao botao-secundario" type="button" data-acao="fechar">Cancelar</button>
                <button class="botao botao-destaque" type="button" data-acao-modal="salvar-endereco">
                    <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar endereço
                </button>
            </div>`
    });

    porId('modal-overlay').querySelector('.modal-corpo').addEventListener('click', (evento) => {
        if (!evento.target.closest('[data-acao-modal="salvar-endereco"]')) {
            return;
        }

        const endereco = porId('endereco-temporario').value.trim();
        if (!endereco) {
            mostrarToast('Informe o endereço temporário.', 'erro');
            return;
        }

        store.definir({ enderecoTemporario: endereco });
        fecharModal();
        mostrarToast('Endereço temporário salvo.', 'sucesso');
    });
}

function gerarProposta() {
    const estado = store.obter();
    const totais = calcularTotais(estado);
    const cliente = clienteAtual(estado);

    abrirModal({
        titulo: 'Proposta comercial',
        conteudo: `
            <dl class="detalhes-pedido">
                <div><dt>Cliente</dt><dd>${escaparHtml(cliente.nome)}</dd></div>
                <div><dt>Pedido</dt><dd>#${escaparHtml(estado.numero)}</dd></div>
                <div><dt>Condição</dt><dd>${escaparHtml(PAGAMENTOS[estado.pagamento]?.rotulo ?? '')}</dd></div>
                <div><dt>Parcelas</dt><dd>${totais.parcelas}x de ${escaparHtml(formatarCentos(totais.valoresParcelas[0]))}</dd></div>
            </dl>
            <ul class="lista-itens-pedido">
                ${estado.itens.map((item) => `
                    <li>
                        <span>${escaparHtml(item.nome)} · ${formatarNumero(item.quantidade)}x</span>
                        <strong>${escaparHtml(formatarCentos(calcularItem(item).totalCentos))}</strong>
                    </li>`).join('')}
            </ul>
            <div class="resumo-operacao">
                <span>Total da proposta</span>
                <strong>${escaparHtml(formatarCentos(totais.liquidoCentos))}</strong>
            </div>
            <div class="acoes-modal">
                <button class="botao botao-secundario" type="button" data-acao="fechar">Fechar</button>
                <button class="botao botao-destaque" type="button" data-acao-modal="imprimir-proposta">
                    <i class="fa-solid fa-print" aria-hidden="true"></i> Imprimir / salvar em PDF
                </button>
            </div>`
    });

    porId('modal-overlay').querySelector('.modal-corpo').addEventListener('click', (evento) => {
        if (evento.target.closest('[data-acao-modal="imprimir-proposta"]')) {
            window.print();
        }
    });
}

function montarPedido(estado, totais) {
    return {
        id: estado.numero,
        numero: estado.numero,
        cliente: clienteAtual(estado).nome,
        clienteId: estado.clienteId,
        valorTotal: totais.liquidoCentos / 100,
        itens: estado.itens.map((item) => ({
            descricao: item.nome,
            sku: item.sku,
            quantidade: item.quantidade,
            valorUnitario: item.precoCentos / 100,
            observacao: item.observacao
        })),
        enderecoEntrega: estado.endereco === 'temporario'
            ? estado.enderecoTemporario
            : estado.endereco,
        canal: estado.canal,
        tabelaPreco: estado.tabela,
        pagamento: estado.pagamento,
        parcelas: totais.parcelas,
        frete: {
            tipo: estado.freteTipo,
            transportadora: estado.transportadora,
            valor: totais.freteCentos / 100
        },
        fiscal: {
            natureza: estado.natureza,
            vendedor: estado.vendedor,
            dadosAdicionais: estado.dadosFiscais
        },
        observacao: estado.observacoes,
        totais: {
            subtotal: totais.subtotalCentos / 100,
            descontos: (totais.descontoItensCentos + totais.descontoCupomCentos + totais.descontoPixCentos) / 100,
            impostos: totais.impostosCentos / 100,
            total: totais.liquidoCentos / 100
        },
        automacoes: { emitirNfe: estado.autoNfe, enviarDocumentos: estado.autoEnvio }
    };
}

function integracaoDisponivel(operacao) {
    const adaptador = globalThis.DFreitasApi;
    return Boolean(adaptador && typeof adaptador[operacao] === 'function');
}

async function executarAutomacoes(estado, pedido) {
    const pendencias = [];

    if (estado.autoNfe && integracaoDisponivel('emitirNFe')) {
        try {
            await chamar('emitirNFe', { pedidoId: pedido.id, numero: pedido.numero });
        } catch (erro) {
            pendencias.push(`NF-e: ${erro.message}`);
        }
    } else if (estado.autoNfe) {
        pendencias.push('NF-e: integração não configurada');
    }

    if (estado.autoEnvio && integracaoDisponivel('enviarDocumentos')) {
        try {
            await chamar('enviarDocumentos', {
                pedidoId: pedido.id,
                documentos: ['DANFE', 'Boleto'],
                canais: ['whatsapp', 'email']
            });
        } catch (erro) {
            pendencias.push(`Envio: ${erro.message}`);
        }
    } else if (estado.autoEnvio) {
        pendencias.push('Envio de documentos: integração não configurada');
    }

    return pendencias;
}

function registrarConfirmado(pedido) {
    const confirmados = lerJson(CHAVE_CONFIRMADOS, []);
    const lista = Array.isArray(confirmados) ? confirmados : [];
    lista.unshift({ ...pedido, confirmadoEm: new Date().toISOString() });
    salvarArmazenamento(CHAVE_CONFIRMADOS, JSON.stringify(lista.slice(0, 50)));
}

function mostrarSucesso(mensagem, pendencias) {
    abrirModal({
        titulo: 'Pedido confirmado',
        conteudo: `
            <div class="resumo-operacao">
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                <span>${escaparHtml(mensagem)}</span>
            </div>
            ${pendencias.length ? `
                <div class="alerta alerta-erro">
                    <div>
                        <strong>Ações automáticas pendentes:</strong>
                        <ul>${pendencias.map((pendencia) => `<li>${escaparHtml(pendencia)}</li>`).join('')}</ul>
                    </div>
                </div>` : ''}
            <div class="acoes-modal">
                <button class="botao botao-secundario" type="button" data-acao="fechar">Manter pedido aberto</button>
                <a class="botao botao-destaque" href="home.html#pedidos">Voltar aos pedidos</a>
            </div>`
    });
}

function definirCarregando(carregando) {
    ['btn-confirmar', 'btn-finalizar'].forEach((id) => {
        const botao = porId(id);
        botao.disabled = carregando;
        botao.classList.toggle('carregando', carregando);
    });
}

async function confirmarPedido() {
    const botao = porId('btn-confirmar');
    if (botao.disabled) {
        return false;
    }

    const estado = store.obter();
    const totais = calcularTotais(estado);
    const validacao = validarPedido(estado, totais);
    renderizarAuditoria(validacao);

    if (validacao.erros.length) {
        porId('erros-auditoria').scrollIntoView({ behavior: 'smooth', block: 'center' });
        mostrarToast(
            `Corrija ${validacao.erros.length} ${validacao.erros.length === 1 ? 'ponto' : 'pontos'} antes de continuar.`,
            'erro'
        );
        return false;
    }
    if (!salvarRascunho(true)) {
        return false;
    }

    definirCarregando(true);
    try {
        const pedido = montarPedido(estado, totais);
        if (backendConfigurado()) {
            await servicos.criarPedido(pedido);
        }
        const pendencias = await executarAutomacoes(estado, pedido);
        registrarConfirmado(pedido);
        mostrarSucesso(
            backendConfigurado()
                ? 'Pedido confirmado e registrado no backend.'
                : 'Pedido confirmado e salvo neste navegador. Configure a integração para faturamento.',
            pendencias
        );
        return true;
    } catch (erro) {
        mostrarToast(erro.message || MENSAGENS.falhaComunicacao, 'erro');
        return false;
    } finally {
        definirCarregando(false);
    }
}

function repetirUltimoPedido() {
    const confirmados = lerJson(CHAVE_CONFIRMADOS, []);
    const ultimo = Array.isArray(confirmados) ? confirmados[0] : null;
    const itensAnteriores = Array.isArray(ultimo?.itens) ? ultimo.itens : [];
    if (itensAnteriores.length === 0) {
        mostrarToast('Nenhum pedido anterior disponível neste navegador.', 'info');
        return;
    }

    const itens = itensAnteriores.map((item) => {
        const produto = produtoPorSku(item.sku) ?? localizarProduto(item.descricao);
        if (!produto) {
            return null;
        }

        return {
            sku: produto.sku,
            nome: produto.nome,
            ncm: produto.ncm,
            cfop: produto.cfop,
            estoque: produto.estoque,
            quantidade: Math.min(Math.max(1, Number(item.quantidade) || 1), produto.estoque),
            precoCentos: produto.precoCentos,
            descontoPercentual: 0,
            descontoFixoCentos: produto.descontoFixoCentos ?? 0,
            observacao: String(item.observacao ?? '')
        };
    }).filter(Boolean);

    store.definir({ itens });
    mostrarToast('Itens do último pedido restaurados.', 'sucesso');
}

function registrarEventos() {
    porId('btn-descartar').addEventListener('click', descartarPedido);
    porId('btn-salvar-rascunho').addEventListener('click', () => salvarRascunho());
    porId('btn-proposta').addEventListener('click', gerarProposta);
    porId('btn-finalizar').addEventListener('click', confirmarPedido);
    porId('btn-confirmar').addEventListener('click', confirmarPedido);
    porId('btn-alterar-cliente').addEventListener('click', abrirSeletorCliente);
    porId('btn-ver-crm').addEventListener('click', () => {
        mostrarToast('O módulo de CRM não está disponível nesta versão da intranet.', 'info');
    });
    porId('btn-novo-cliente').addEventListener('click', () => {
        mostrarToast('O cadastro de clientes não está disponível nesta versão da intranet.', 'info');
    });
    porId('btn-importar').addEventListener('click', () => {
        mostrarToast('A importação de planilha não está disponível nesta versão.', 'info');
    });
    porId('btn-repetir').addEventListener('click', repetirUltimoPedido);

    porId('busca-produto').addEventListener('input', atualizarSugestoes);
    porId('busca-produto').addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            inserirItem();
        }
    });
    porId('preco-inserir').addEventListener('input', (evento) => {
        evento.target.dataset.editado = 'true';
    });
    porId('qtd-inserir').addEventListener('input', () => mostrarMensagemItem(''));
    porId('desconto-inserir').addEventListener('input', () => mostrarMensagemItem(''));
    porId('btn-inserir-item').addEventListener('click', inserirItem);

    porId('itens-tabela').addEventListener('change', alterarItem);
    porId('itens-tabela').addEventListener('click', acionarItem);

    document.querySelectorAll('input[name="payment_method"]').forEach((radio) => {
        radio.addEventListener('change', () => store.definir({ pagamento: radio.value }));
    });
    porId('parcelas-cartao').addEventListener('change', (evento) => {
        store.definir({ parcelasCartao: Number(evento.target.value) });
    });
    porId('btn-personalizar-datas').addEventListener('click', () => {
        store.definir({ personalizarDatas: !store.obter().personalizarDatas });
    });
    porId('parcelas-container').addEventListener('change', (evento) => {
        const indice = evento.target.dataset.dataParcela;
        if (indice === undefined) {
            return;
        }

        const datas = [...store.obter().datasParcelas];
        datas[Number(indice)] = evento.target.value;
        store.definir({ datasParcelas: datas });
    });

    porId('tipo-frete').addEventListener('change', (evento) => store.definir({ freteTipo: evento.target.value }));
    document.querySelectorAll('input[name="shipping_carrier"]').forEach((radio) => {
        radio.addEventListener('change', () => store.definir({ transportadora: radio.value }));
    });

    porId('endereco-entrega').addEventListener('change', (evento) => {
        const endereco = evento.target.value;
        store.definir({ endereco });
        if (endereco === 'temporario') {
            abrirEnderecoTemporario();
        }
    });
    porId('canal-origem').addEventListener('change', (evento) => {
        const canal = evento.target.value;
        store.definir({ canal });
        mostrarToast(`Canal alterado para ${ROTULOS[canal] ?? 'canal informado'}.`, 'info');
    });
    porId('tabela-preco').addEventListener('change', (evento) => {
        store.definir({ tabela: evento.target.value });
        mostrarToast('Tabela de preço alterada. Confira os valores unitários antes de confirmar.', 'info');
    });

    porId('natureza-operacao').addEventListener('change', (evento) => store.definir({ natureza: evento.target.value }));
    porId('dados-fiscais').addEventListener('change', (evento) => store.definir({ dadosFiscais: evento.target.value.trim() }));
    porId('observacoes-internas').addEventListener('change', (evento) => store.definir({ observacoes: evento.target.value.trim() }));

    porId('btn-aplicar-cupom').addEventListener('click', aplicarCupom);
    porId('cupom-codigo').addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            aplicarCupom();
        }
    });

    porId('auto-nfe').addEventListener('change', (evento) => store.definir({ autoNfe: evento.target.checked }));
    porId('auto-envio').addEventListener('change', (evento) => store.definir({ autoEnvio: evento.target.checked }));

    document.addEventListener('keydown', (evento) => {
        if ((evento.ctrlKey || evento.metaKey) && evento.key === 'Enter'
            && !document.getElementById('modal-overlay')) {
            evento.preventDefault();
            confirmarPedido();
        }
    });
}

const acoes = {
    definirPeriodo(periodo) {
        store.definir({ periodo });
    },
    definirBusca(busca) {
        store.definir({ busca });
    },
    abrirNovoPedido() {
        descartarPedido();
    }
};

function init() {
    const root = document.getElementById('app');
    if (!root) {
        throw new Error('Elemento #app não encontrado.');
    }

    montarLayout(root, store, acoes);
    registrarEventos();

    porId('auto-nfe').checked = store.obter().autoNfe;
    porId('auto-envio').checked = store.obter().autoEnvio;

    store.assinar(renderizarTudo);
    renderizarTudo();
    atualizarSugestoes();

    window.addEventListener('online', () => store.definir({ conectado: true }));
    window.addEventListener('offline', () => store.definir({ conectado: false }));
}

init();
