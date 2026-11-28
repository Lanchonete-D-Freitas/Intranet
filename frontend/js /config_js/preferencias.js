import { mostrarToast } from '../ui.js';

export function iniciarPreferencias() {
    const pagina = document.getElementById('config-page');

    /* Aparência e preferências. */
    function definirDensidade(densidade) {
        document.querySelectorAll('[data-densidade]').forEach((botao) => {
            const ativa = botao.dataset.densidade === densidade;
            botao.classList.toggle('opcao-ativa', ativa);
            botao.setAttribute('aria-pressed', String(ativa));
        });
        pagina.classList.toggle('densidade-compacta', densidade === 'compacto');
    }

    document.querySelectorAll('[data-densidade]').forEach((botao) => {
        botao.addEventListener('click', () => {
            definirDensidade(botao.dataset.densidade);
            mostrarToast(`Densidade ${botao.dataset.densidade} selecionada.`);
        });
    });

    document.querySelectorAll('input[name="tema"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                mostrarToast(`Tema ${radio.dataset.rotulo} selecionado (simulação).`);
            }
        });
    });

    document.querySelectorAll('[data-preferencia]').forEach((campo) => {
        campo.addEventListener('change', () => mostrarToast('Preferência atualizada (simulação).'));
    });

    /* Notificações. */
    document.getElementById('btn-ativar-notificacoes').addEventListener('click', () => {
        document.querySelectorAll('#tabela-notificacoes input[type="checkbox"]').forEach((caixa) => {
            caixa.checked = true;
        });
        mostrarToast('Todas as notificações foram ativadas.', 'sucesso');
    });

    function atualizarVolume() {
        document.getElementById('volume-valor').textContent = `${document.getElementById('volume-alerta').value}%`;
    }

    document.getElementById('volume-alerta').addEventListener('input', atualizarVolume);
    atualizarVolume();

    document.getElementById('btn-testar-som').addEventListener('click', () => {
        const volume = Number(document.getElementById('volume-alerta').value);

        try {
            const ContextoAudio = window.AudioContext || window.webkitAudioContext;
            if (!ContextoAudio) {
                throw new Error('Áudio indisponível');
            }

            const contexto = new ContextoAudio();
            const oscilador = contexto.createOscillator();
            const ganho = contexto.createGain();
            const agora = contexto.currentTime;
            const pico = Math.max(0.001, (volume / 100) * 0.2);

            oscilador.type = 'sine';
            oscilador.frequency.value = 660;
            ganho.gain.setValueAtTime(0.001, agora);
            ganho.gain.exponentialRampToValueAtTime(pico, agora + 0.02);
            ganho.gain.exponentialRampToValueAtTime(0.001, agora + 0.25);
            oscilador.connect(ganho);
            ganho.connect(contexto.destination);
            oscilador.start(agora);
            oscilador.stop(agora + 0.26);
            oscilador.onended = () => contexto.close();

            mostrarToast('Som de alerta reproduzido.');
        } catch (erro) {
            mostrarToast('Não foi possível reproduzir o som.', 'erro');
        }
    });

    return { definirDensidade, atualizarVolume };
}
