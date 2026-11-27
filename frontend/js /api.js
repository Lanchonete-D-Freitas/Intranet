import { MENSAGENS } from './constants.js';

export class ErroServico extends Error {
    constructor(codigo, mensagem, causa) {
        super(mensagem, { cause: causa });
        this.name = 'ErroServico';
        this.codigo = codigo;
    }
}

function obterAdaptador() {
    const adaptador = globalThis.DFreitasApi;

    if (!adaptador || typeof adaptador !== 'object') {
        return null;
    }

    return adaptador;
}

export function backendConfigurado() {
    return obterAdaptador() !== null;
}

export async function chamar(operacao, parametros = {}) {
    const adaptador = obterAdaptador();

    if (!adaptador || typeof adaptador[operacao] !== 'function') {
        throw new ErroServico('BACKEND_NAO_CONFIGURADO', MENSAGENS.backendNaoConfigurado);
    }

    try {
        return await adaptador[operacao](parametros);
    } catch (erro) {
        if (erro instanceof ErroServico) {
            throw erro;
        }

        throw new ErroServico('FALHA_COMUNICACAO', MENSAGENS.falhaComunicacao, erro);
    }
}
