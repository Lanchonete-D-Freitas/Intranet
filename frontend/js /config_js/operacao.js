import { mostrarToast } from '../ui.js';

export function iniciarOperacao() {
    /* Regras operacionais. */
    function atualizarPreviaCodigo() {
        const prefixo = document.getElementById('prefixo-pedido').value.trim();
        const sequencia = Number(document.getElementById('sequencia-pedido').value) || 0;
        document.getElementById('previa-codigo').textContent = `${prefixo}${String(sequencia).padStart(6, '0')}`;
    }

    document.getElementById('prefixo-pedido').addEventListener('input', atualizarPreviaCodigo);
    document.getElementById('sequencia-pedido').addEventListener('input', atualizarPreviaCodigo);
    atualizarPreviaCodigo();

    function atualizarDesconto() {
        document.getElementById('desconto-valor').textContent = `${document.getElementById('desconto-limite').value}%`;
    }

    document.getElementById('desconto-limite').addEventListener('input', atualizarDesconto);
    atualizarDesconto();

    /* Empresa e documentos. */
    const logoInput = document.getElementById('logo-input');

    logoInput.addEventListener('change', (evento) => {
        const arquivo = evento.target.files[0];
        if (!arquivo) {
            return;
        }

        if (!arquivo.type.startsWith('image/') || arquivo.size > 2 * 1024 * 1024) {
            mostrarToast('Escolha uma imagem de até 2 MB.', 'erro');
            evento.target.value = '';
            return;
        }

        const leitor = new FileReader();
        leitor.onload = () => {
            document.getElementById('logo-preview').src = String(leitor.result);
            document.getElementById('logo-preview').hidden = false;
            document.getElementById('logo-placeholder').hidden = true;
            mostrarToast('Logotipo atualizado na prévia.', 'sucesso');
        };
        leitor.onerror = () => mostrarToast('Não foi possível ler a imagem.', 'erro');
        leitor.readAsDataURL(arquivo);
    });

    document.querySelectorAll('input[name="impressao"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                mostrarToast(radio.value === 'a4' ? 'Formato A4 selecionado.' : 'Bobina térmica selecionada.');
            }
        });
    });

    return { atualizarPreviaCodigo, atualizarDesconto };
}
