const ENTIDADES_HTML = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
});

export function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ENTIDADES_HTML[caractere]);
}

export function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        return '—';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(numero);
}

export function formatarNumero(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
        return '—';
    }

    return new Intl.NumberFormat('pt-BR').format(numero);
}

export function formatarDataHora(valor) {
    if (!valor) {
        return '—';
    }

    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(data);
}

export function formatarDataCurta(valor) {
    if (!valor) {
        return '';
    }

    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(data);
}

export function debounce(funcao, atraso) {
    let temporizador;

    return (...argumentos) => {
        window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => funcao(...argumentos), atraso);
    };
}

export function lerArmazenamento(chave, valorPadrao) {
    try {
        const valor = window.localStorage.getItem(chave);
        return valor === null ? valorPadrao : valor === 'true';
    } catch {
        return valorPadrao;
    }
}

export function salvarArmazenamento(chave, valor) {
    try {
        window.localStorage.setItem(chave, String(valor));
    } catch {
        return;
    }
}

export function obterRotulo(valor, mapa) {
    return mapa[valor]?.label ?? 'Indefinido';
}

export function obterVariante(valor, mapa) {
    return mapa[valor]?.variante ?? 'neutro';
}

export function calcularTotalPaginas(total, tamanho) {
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(tamanho) || tamanho <= 0) {
        return 1;
    }

    return Math.ceil(total / tamanho);
}

export function normalizarTexto(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}
