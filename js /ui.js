import { escaparHtml } from './utils.js';

const ID_TOASTS = 'toasts';
const ID_MODAL = 'modal-overlay';
const TEMPO_TOAST_MS = 4500;

let removerOuvinteModal = null;

function obterContainerToasts() {
    let container = document.getElementById(ID_TOASTS);

    if (!container) {
        container = document.createElement('div');
        container.id = ID_TOASTS;
        container.className = 'toasts';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
    }

    return container;
}

export function mostrarToast(mensagem, tipo = 'info') {
    const container = obterContainerToasts();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    toast.innerHTML = `<i class="fa-solid ${
        tipo === 'erro' ? 'fa-circle-exclamation' : 'fa-circle-check'
    }" aria-hidden="true"></i><span>${escaparHtml(mensagem)}</span>`;

    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), TEMPO_TOAST_MS);
}

export function renderizarCarregamento(elemento, mensagem = 'Carregando...') {
    elemento.innerHTML = `
        <div class="estado estado-carregando" role="status">
            <span class="spinner" aria-hidden="true"></span>
            <span>${escaparHtml(mensagem)}</span>
        </div>`;
}

export function renderizarVazio(elemento, titulo, descricao = '') {
    elemento.innerHTML = `
        <div class="estado estado-vazio">
            <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
            <strong>${escaparHtml(titulo)}</strong>
            ${descricao ? `<span>${escaparHtml(descricao)}</span>` : ''}
        </div>`;
}

export function renderizarErro(elemento, mensagem, aoTentar) {
    elemento.innerHTML = `
        <div class="estado estado-erro" role="alert">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <strong>Não foi possível carregar</strong>
            <span>${escaparHtml(mensagem)}</span>
            <button type="button" class="botao botao-secundario" data-acao="tentar">
                <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Tentar novamente
            </button>
        </div>`;

    elemento.querySelector('[data-acao="tentar"]')?.addEventListener('click', aoTentar, { once: true });
}

function manterFocoNoModal(evento) {
    const modal = document.querySelector(`#${ID_MODAL} .modal`);
    if (!modal || evento.key !== 'Tab') {
        return;
    }

    const focaveis = Array.from(
        modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((elemento) => elemento.offsetParent !== null);

    if (focaveis.length === 0) {
        return;
    }

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
    }
}

export function abrirModal({ titulo, conteudo, aoFechar }) {
    fecharModal();

    const anterior = document.activeElement;
    const overlay = document.createElement('div');
    overlay.id = ID_MODAL;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
            <div class="modal-cabecalho">
                <h2 id="modal-titulo">${escaparHtml(titulo)}</h2>
                <button type="button" class="botao-icone" data-acao="fechar" aria-label="Fechar janela">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </div>
            <div class="modal-corpo">${conteudo}</div>
        </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-aberto');

    const fechar = () => {
        fecharModal();
        if (anterior instanceof HTMLElement) {
            anterior.focus();
        }
        aoFechar?.();
    };

    const aoTeclar = (evento) => {
        if (evento.key === 'Escape') {
            fechar();
            return;
        }

        manterFocoNoModal(evento);
    };

    overlay.addEventListener('mousedown', (evento) => {
        if (evento.target === overlay) {
            fechar();
        }
    });
    overlay.querySelector('[data-acao="fechar"]').addEventListener('click', fechar);
    document.addEventListener('keydown', aoTeclar);
    removerOuvinteModal = () => document.removeEventListener('keydown', aoTeclar);

    overlay.querySelector('input, select, textarea, button')?.focus();
}

export function fecharModal() {
    removerOuvinteModal?.();
    removerOuvinteModal = null;
    document.getElementById(ID_MODAL)?.remove();
    document.body.classList.remove('modal-aberto');
}
