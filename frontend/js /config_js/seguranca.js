import { mostrarToast } from '../ui.js';

export function iniciarSeguranca() {
    /* Senha: validação local, força e exibição/ocultação. */
    const formSenha = document.getElementById('form-senha');
    const senhaAtual = document.getElementById('senha-atual');
    const senhaNova = document.getElementById('senha-nova');
    const senhaConfirmar = document.getElementById('senha-confirmar');
    const forcaSenha = document.getElementById('forca-senha');
    const forcaRotulo = document.getElementById('forca-rotulo');
    const barrasForca = Array.from(forcaSenha.querySelectorAll('.forca-barras span'));
    const rotulosForca = ['Digite uma nova senha', 'Fraca', 'Razoável', 'Boa', 'Forte'];

    function atualizarForca(valor) {
        let pontos = 0;

        if (valor.length >= 10) {
            pontos += 1;
        }
        if (valor.length >= 12) {
            pontos += 1;
        }
        if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) {
            pontos += 1;
        }
        if (/\d/.test(valor)) {
            pontos += 1;
        }
        if (/[^A-Za-z0-9]/.test(valor)) {
            pontos += 1;
        }

        const nivel = valor ? Math.max(1, Math.min(4, pontos)) : 0;
        forcaSenha.dataset.nivel = String(nivel);
        forcaRotulo.textContent = rotulosForca[nivel];
        barrasForca.forEach((barra, indice) => barra.classList.toggle('ativo', indice < nivel));
    }

    senhaNova.addEventListener('input', () => atualizarForca(senhaNova.value));

    document.querySelectorAll('[data-toggle-senha]').forEach((botao) => {
        botao.addEventListener('click', () => {
            const campo = document.getElementById(botao.dataset.toggleSenha);
            const mostrar = campo.type === 'password';
            campo.type = mostrar ? 'text' : 'password';
            botao.setAttribute('aria-label', mostrar ? 'Ocultar' : 'Mostrar');
            botao.querySelector('i').className = mostrar
                ? 'fa-solid fa-eye-slash'
                : 'fa-solid fa-eye';
        });
    });

    formSenha.addEventListener('submit', (evento) => {
        evento.preventDefault();

        if (!senhaAtual.value.trim()) {
            mostrarToast('Informe a senha atual.', 'erro');
            senhaAtual.focus();
            return;
        }

        if (!/^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(senhaNova.value)) {
            mostrarToast('A nova senha precisa ter 10 ou mais caracteres, letras e números.', 'erro');
            senhaNova.focus();
            return;
        }

        if (senhaNova.value === senhaAtual.value) {
            mostrarToast('A nova senha deve ser diferente da atual.', 'erro');
            senhaNova.focus();
            return;
        }

        if (senhaNova.value !== senhaConfirmar.value) {
            mostrarToast('As novas senhas não coincidem.', 'erro');
            senhaConfirmar.focus();
            return;
        }

        formSenha.reset();
        atualizarForca('');
        mostrarToast('Senha alterada com sucesso (simulação).', 'sucesso');
    });

    /* Sessões ativas: remoção visual e estado vazio. */
    function verificarSessoes() {
        document.getElementById('sessoes-vazio').hidden = document.querySelector('#lista-sessoes [data-sessao]') !== null;
    }

    document.querySelectorAll('[data-encerrar-sessao]').forEach((botao) => {
        botao.addEventListener('click', () => {
            botao.closest('[data-sessao]').remove();
            verificarSessoes();
            mostrarToast('Sessão encerrada (simulação).', 'info');
        });
    });

    document.getElementById('btn-encerrar-outras').addEventListener('click', () => {
        const outras = document.querySelectorAll('#lista-sessoes [data-sessao]:not([data-atual="true"])');

        if (!outras.length) {
            mostrarToast('Não há outras sessões ativas.', 'info');
            return;
        }

        outras.forEach((sessao) => sessao.remove());
        verificarSessoes();
        mostrarToast('Outras sessões foram encerradas (simulação).', 'sucesso');
    });

    document.getElementById('twofa-ativo').addEventListener('change', (evento) => {
        mostrarToast(evento.target.checked
            ? 'Autenticação em duas etapas ativada (simulação).'
            : 'Autenticação em duas etapas desativada (simulação).');
    });

    document.getElementById('btn-copiar-chave').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText('demo-2fa-local');
            mostrarToast('Chave copiada.', 'sucesso');
        } catch (erro) {
            mostrarToast('Chave de demonstração: demo-2fa-local', 'info');
        }
    });
}
