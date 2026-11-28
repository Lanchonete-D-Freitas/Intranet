import { montarLayout } from '../layout.js';
import { criarStore } from '../store.js';
import { mostrarToast } from '../ui.js';
import { iniciarPerfil } from './perfil.js';
import { iniciarSeguranca } from './seguranca.js';
import { iniciarPreferencias } from './preferencias.js';
import { iniciarOperacao } from './operacao.js';
import { iniciarSistema } from './sistema.js';

const store = criarStore({
    periodo: '7-dias',
    busca: '',
    conectado: navigator.onLine
});

const pagina = document.getElementById('config-page');
const navegacao = document.getElementById('config-nav');
const barraSecao = document.getElementById('config-barra-secao');
const botaoVoltar = document.getElementById('config-voltar');
const tituloSecao = document.getElementById('config-secao-titulo');
const abas = Array.from(document.querySelectorAll('#config-tabs [role="tab"]'));
const paineis = Array.from(document.querySelectorAll('#config-page .painel-config'));
let abaAtual = null;

function normalizarTexto(valor) {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function definirTabindex(alvo) {
    abas.forEach((item) => {
        item.tabIndex = item === alvo ? 0 : -1;
    });
}

function selecionarAba(aba) {
    const painel = aba && document.getElementById(aba.dataset.aba);
    if (!painel) {
        return;
    }

    abaAtual = aba;
    abas.forEach((item) => {
        const ativa = item === aba;
        item.setAttribute('aria-selected', String(ativa));
        item.tabIndex = ativa ? 0 : -1;
    });

    paineis.forEach((item) => {
        item.hidden = item !== painel;
    });

    const titulo = aba.querySelector('strong');
    tituloSecao.textContent = titulo ? titulo.textContent.trim() : '';
    pagina.classList.add('secao-aberta');
    navegacao.hidden = true;
    barraSecao.hidden = false;

    botaoVoltar.focus({ preventScroll: true });
    if (typeof barraSecao.scrollIntoView === 'function') {
        barraSecao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function voltarAsOpcoes({ foco = true } = {}) {
    pagina.classList.remove('secao-aberta');
    paineis.forEach((painel) => {
        painel.hidden = true;
    });
    barraSecao.hidden = true;
    navegacao.hidden = false;

    const alvo = abaAtual && !abaAtual.hidden
        ? abaAtual
        : abas.find((item) => !item.hidden) || abaAtual;

    definirTabindex(alvo);
    if (foco && alvo) {
        alvo.focus({ preventScroll: true });
    }
    if (typeof navegacao.scrollIntoView === 'function') {
        navegacao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function filtrarAbas(termo) {
    const busca = normalizarTexto(termo);
    let primeiraVisivel = null;

    abas.forEach((aba) => {
        const visivel = !busca || normalizarTexto(aba.textContent).includes(busca);
        aba.hidden = !visivel;

        if (visivel && !primeiraVisivel) {
            primeiraVisivel = aba;
        }
    });

    /* A busca apenas filtra a lista; abrir seção continua sendo uma ação explícita. */
    if (pagina.classList.contains('secao-aberta')) {
        voltarAsOpcoes({ foco: false });
    }

    const comFoco = abas.find((item) => item.tabIndex === 0);
    if (comFoco && comFoco.hidden) {
        definirTabindex(primeiraVisivel || abas.find((item) => !item.hidden));
    }
}

abas.forEach((aba) => {
    aba.addEventListener('click', () => selecionarAba(aba));
    aba.addEventListener('keydown', (evento) => {
        const visiveis = abas.filter((item) => !item.hidden);
        const indice = visiveis.indexOf(aba);
        if (indice < 0) {
            return;
        }

        let proxima = null;
        if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
            proxima = visiveis[(indice + 1) % visiveis.length];
        } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
            proxima = visiveis[(indice - 1 + visiveis.length) % visiveis.length];
        } else if (evento.key === 'Home') {
            proxima = visiveis[0];
        } else if (evento.key === 'End') {
            proxima = visiveis[visiveis.length - 1];
        }

        if (proxima) {
            evento.preventDefault();
            definirTabindex(proxima);
            proxima.focus();
        }
    });
});

botaoVoltar.addEventListener('click', () => voltarAsOpcoes());

const acoes = {
    definirPeriodo() {},
    definirBusca(busca) {
        filtrarAbas(busca);
    },
    abrirNovoPedido() {
        window.location.href = 'novo_pedido.html';
    }
};

montarLayout(document.getElementById('app'), store, acoes);
window.addEventListener('online', () => store.definir({ conectado: true }));
window.addEventListener('offline', () => store.definir({ conectado: false }));

iniciarPerfil();
iniciarSeguranca();
const preferencias = iniciarPreferencias();
const operacao = iniciarOperacao();
iniciarSistema();

/* Ações globais do cabeçalho. */
function restaurarPadroes() {
    document.querySelector('input[name="tema"][value="claro"]').checked = true;
    preferencias.definirDensidade('confortavel');
    document.getElementById('itens-pagina').value = '25';
    document.getElementById('modulo-inicial').value = 'dashboard';
    document.getElementById('fuso-horario').value = 'America/Sao_Paulo';
    document.getElementById('formato-data').value = 'ddmmaaaa';
    document.getElementById('moeda').value = 'BRL';
    document.getElementById('twofa-ativo').checked = true;

    document.querySelectorAll('#tabela-notificacoes input[type="checkbox"]').forEach((caixa) => {
        caixa.checked = true;
    });
    document.getElementById('som-alerta').value = 'suave';
    document.getElementById('volume-alerta').value = '75';
    document.getElementById('nao-perturbar').checked = true;
    preferencias.atualizarVolume();

    document.getElementById('prefixo-pedido').value = '#PDV-';
    document.getElementById('sequencia-pedido').value = '1';
    operacao.atualizarPreviaCodigo();
    document.querySelectorAll('#painel-regras .linha-config input[type="checkbox"]').forEach((caixa, indice) => {
        caixa.checked = indice !== 3;
    });
    document.getElementById('desconto-limite').value = '10';
    operacao.atualizarDesconto();

    document.querySelector('input[name="impressao"][value="a4"]').checked = true;
    document.querySelectorAll('#painel-empresa input[type="checkbox"]').forEach((caixa, indice) => {
        caixa.checked = indice !== 3;
    });

    mostrarToast('Padrões restaurados (simulação).', 'info');
}

document.getElementById('btn-restaurar-config').addEventListener('click', restaurarPadroes);
document.getElementById('btn-salvar-config').addEventListener('click', () => {
    mostrarToast('Preferências salvas localmente (simulação).', 'sucesso');
});
