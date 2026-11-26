import { ARMAZENAMENTO, ATALHOS } from './constants.js';
import { lerArmazenamento, salvarArmazenamento } from './utils.js';

const CONSULTA_MENU_OVERLAY = '(max-width: 900px)';

export function montarLayout(root, store, acoes) {
    const expandidoInicial = lerArmazenamento(ARMAZENAMENTO.menuExpandido, false);

    const layout = root.querySelector('#dashboard-layout');
    const botaoMenu = root.querySelector('#botao-menu');
    const overlay = root.querySelector('#sidebar-overlay');
    const nav = root.querySelector('#menu-nav');
    const pesquisaGlobal = root.querySelector('#pesquisa-global');
    const botaoNotificacoes = root.querySelector('#botao-notificacoes');
    const painelNotificacoes = root.querySelector('#painel-notificacoes');
    const indicadorConexao = root.querySelector('#indicador-conexao');
    const olaUsuarioSpan = root.querySelector('.link-perfil span');
    const marcaSidebarSpan = root.querySelector('.marca-sidebar span');
    const marcaHeaderSpan = root.querySelector('.marca-header');

    const consultaOverlay = window.matchMedia(CONSULTA_MENU_OVERLAY);
    let menuExpandido = expandidoInicial;

    function usarOverlay() {
        return consultaOverlay.matches;
    }

    function sincronizarOverlay() {
        overlay.hidden = !menuExpandido || !usarOverlay();
    }

    function definirMenu(expandido) {
        menuExpandido = expandido;
        nav.classList.toggle('expandido', expandido);
        layout.classList.toggle('menu-expandido', expandido);
        botaoMenu.setAttribute('aria-expanded', String(expandido));
        botaoMenu.setAttribute('aria-label', expandido ? 'Recolher menu' : 'Expandir menu');
        if (olaUsuarioSpan) {
            olaUsuarioSpan.style.display = expandido ? 'none' : '';
        }
        if (marcaSidebarSpan) {
            marcaSidebarSpan.textContent = expandido ? "D'freitas" : "Lanchonete D'Freitas";
        }
        const mh = marcaHeaderSpan || root.querySelector('.marca-header');
        if (mh) {
            mh.textContent = expandido ? "D'Freitas" : "Lanchonete D'Freitas";
            mh.style.display = '';
            mh.style.visibility = 'visible';
        }
        sincronizarOverlay();
        salvarArmazenamento(ARMAZENAMENTO.menuExpandido, expandido);
    }

    botaoMenu.addEventListener('click', () => {
        definirMenu(!menuExpandido);
    });
    overlay.addEventListener('click', () => definirMenu(false));
    consultaOverlay.addEventListener('change', sincronizarOverlay);
    definirMenu(expandidoInicial);

    layout.addEventListener('click', (evento) => {
        const link = evento.target.closest('[data-item-menu]');
        if (!link) {
            return;
        }

        if (link.getAttribute('aria-disabled') === 'true') {
            evento.preventDefault();
            return;
        }

        const linkInterno = link.getAttribute('href')?.startsWith('#');
        if (linkInterno) {
            evento.preventDefault();
            root.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
        }

        if (linkInterno || usarOverlay()) {
            definirMenu(false);
        }
    });

    root.querySelector('#dashboard-header').addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-periodo]');
        if (botao) {
            acoes.definirPeriodo(botao.dataset.periodo);
        }
    });

    root.querySelector('#botao-novo-pedido').addEventListener('click', acoes.abrirNovoPedido);

    const aoPesquisar = (evento) => acoes.definirBusca(evento.target.value);
    pesquisaGlobal.addEventListener('input', aoPesquisar);
    root.querySelector('#search').addEventListener('click', () => {
        root.querySelector('#pedidos')?.scrollIntoView({ behavior: 'smooth' });
        pesquisaGlobal.focus();
    });

    document.addEventListener('keydown', (evento) => {
        const alvo = evento.target;
        const digitando = alvo instanceof HTMLElement
            && (alvo.matches('input, textarea, select') || alvo.isContentEditable);

        if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === ATALHOS.pesquisa) {
            evento.preventDefault();
            pesquisaGlobal.focus();
            pesquisaGlobal.select();
            return;
        }

        if (!digitando && evento.key === '/') {
            evento.preventDefault();
            pesquisaGlobal.focus();
            return;
        }

        if (evento.key === 'Escape' && usarOverlay() && menuExpandido
            && !document.getElementById('modal-overlay')) {
            definirMenu(false);
            return;
        }

        if (alvo === pesquisaGlobal && evento.key === 'Escape' && pesquisaGlobal.value) {
            pesquisaGlobal.value = '';
            acoes.definirBusca('');
        }
    });

    botaoNotificacoes.addEventListener('click', () => {
        const aberto = painelNotificacoes.hidden;
        painelNotificacoes.hidden = !aberto;
        botaoNotificacoes.setAttribute('aria-expanded', String(aberto));
    });

    store.assinar((estado, patch) => {
        if ('periodo' in patch) {
            root.querySelectorAll('[data-periodo]').forEach((botao) => {
                const ativo = botao.dataset.periodo === estado.periodo;
                botao.classList.toggle('filtro-periodo-ativo', ativo);
                botao.setAttribute('aria-pressed', String(ativo));
            });
        }

        if ('busca' in patch && document.activeElement !== pesquisaGlobal) {
            pesquisaGlobal.value = estado.busca;
        }

        if ('conectado' in patch) {
            indicadorConexao.classList.toggle('desconectado', !estado.conectado);
            indicadorConexao.querySelector('span').textContent = estado.conectado
                ? 'Conectado'
                : 'Sem conexão';
            indicadorConexao.setAttribute('aria-label', estado.conectado
                ? 'Conectado'
                : 'Sem conexão com a internet');
        }
    });

    return { definirMenu };
}
