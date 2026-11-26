import { escaparHtml } from './utils.js';

function idCampo(prefixo, nome) {
    return `${prefixo}-${nome}`;
}

export function criarCamposPedido(prefixo, compacto = false) {
    const cliente = `
        <div class="campo-grupo">
            <label for="${idCampo(prefixo, 'cliente')}">Cliente</label>
            <input
                class="campo"
                id="${idCampo(prefixo, 'cliente')}"
                name="cliente"
                type="text"
                required
                maxlength="120"
                placeholder="Nome do cliente"
            >
        </div>`;

    const item = `
        <div class="campo-grupo">
            <label for="${idCampo(prefixo, 'item')}">Item</label>
            <input
                class="campo"
                id="${idCampo(prefixo, 'item')}"
                name="item"
                type="text"
                required
                maxlength="120"
                placeholder="Ex.: combo simples"
            >
        </div>`;

    const quantidade = `
        <div class="campo-grupo campo-pequeno">
            <label for="${idCampo(prefixo, 'quantidade')}">Qtd.</label>
            <input
                class="campo"
                id="${idCampo(prefixo, 'quantidade')}"
                name="quantidade"
                type="number"
                min="1"
                step="1"
                value="1"
                required
            >
        </div>`;

    const valorUnitario = `
        <div class="campo-grupo campo-pequeno">
            <label for="${idCampo(prefixo, 'valorUnitario')}">Valor unit.</label>
            <input
                class="campo"
                id="${idCampo(prefixo, 'valorUnitario')}"
                name="valorUnitario"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                required
            >
        </div>`;

    const telefone = `
        <div class="campo-grupo">
            <label for="${idCampo(prefixo, 'telefone')}">Telefone</label>
            <input
                class="campo"
                id="${idCampo(prefixo, 'telefone')}"
                name="telefone"
                type="tel"
                maxlength="20"
                placeholder="(00) 00000-0000"
            >
        </div>`;

    const observacao = `
        <div class="campo-grupo campo-largo">
            <label for="${idCampo(prefixo, 'observacao')}">Observação</label>
            <textarea
                class="campo"
                id="${idCampo(prefixo, 'observacao')}"
                name="observacao"
                rows="2"
                maxlength="300"
                placeholder="Informações adicionais"
            ></textarea>
        </div>`;

    if (compacto) {
        return `<div class="grade-formulario">${cliente}${item}${quantidade}</div>`;
    }

    return `
        <div class="grade-formulario">
            ${cliente}
            ${telefone}
            ${item}
            ${quantidade}
            ${valorUnitario}
            ${observacao}
        </div>`;
}

export function lerPedidoDoFormulario(formulario) {
    const dados = new FormData(formulario);

    return {
        cliente: String(dados.get('cliente') ?? '').trim(),
        telefone: String(dados.get('telefone') ?? '').trim(),
        itens: [{
            descricao: String(dados.get('item') ?? '').trim(),
            quantidade: Number(dados.get('quantidade')),
            valorUnitario: Number(dados.get('valorUnitario') ?? 0)
        }],
        observacao: String(dados.get('observacao') ?? '').trim()
    };
}

export function validarPedido(pedido) {
    const erros = [];

    if (!pedido.cliente) {
        erros.push('Informe o nome do cliente.');
    }

    if (!pedido.itens[0]?.descricao) {
        erros.push('Informe o item do pedido.');
    }

    if (!Number.isInteger(pedido.itens[0]?.quantidade) || pedido.itens[0].quantidade < 1) {
        erros.push('A quantidade deve ser um número inteiro maior que zero.');
    }

    if (!Number.isFinite(pedido.itens[0]?.valorUnitario) || pedido.itens[0].valorUnitario < 0) {
        erros.push('Informe um valor unitário válido.');
    }

    return erros;
}

export function renderizarErrosValidacao(container, erros) {
    if (erros.length === 0) {
        container.innerHTML = '';
        container.hidden = true;
        return;
    }

    container.hidden = false;
    container.innerHTML = `
        <div class="alerta alerta-erro" role="alert">
            <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
            <ul>
                ${erros.map((erro) => `<li>${escaparHtml(erro)}</li>`).join('')}
            </ul>
        </div>`;
}
