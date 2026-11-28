import { mostrarToast } from '../ui.js';

export function iniciarPerfil() {
    /* Perfil: modo de visualização (textos) x modo de edição (campos). */
    const perfil = {
        nome: 'Usuário da Lanchonete',
        cargo: 'Operador',
        email: 'usuario@lanchonete.local',
        telefone: '(11) 00000-0000',
        foto: ''
    };

    let rascunhoPerfil = null;
    let fotoTemporaria = '';

    const fotoPerfil = document.getElementById('foto-perfil');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    const botaoFoto = document.getElementById('botao-foto');
    const fotoInput = document.getElementById('foto-input');
    const avisoFoto = document.getElementById('aviso-foto');
    const perfilVisualizacao = document.getElementById('perfil-visualizacao');
    const formPerfil = document.getElementById('form-perfil');

    function atualizarFoto(src) {
        if (src) {
            fotoPerfil.src = src;
            fotoPerfil.hidden = false;
            avatarPlaceholder.hidden = true;
        } else {
            fotoPerfil.removeAttribute('src');
            fotoPerfil.hidden = true;
            avatarPlaceholder.hidden = false;
        }
    }

    function sincronizarPerfil() {
        document.getElementById('txt-nome').textContent = perfil.nome;
        document.getElementById('txt-cargo').textContent = perfil.cargo || 'Não informado';
        document.getElementById('txt-email').textContent = perfil.email;
        document.getElementById('txt-telefone').textContent = perfil.telefone || 'Não informado';
        document.getElementById('resumo-nome').textContent = perfil.nome;
        document.getElementById('resumo-cargo').textContent = perfil.cargo || 'Não informado';
        document.getElementById('resumo-email').textContent = perfil.email;
        atualizarFoto(perfil.foto);
    }

    function mostrarVisaoPerfil() {
        perfilVisualizacao.hidden = false;
        formPerfil.hidden = true;
        botaoFoto.hidden = true;
        avisoFoto.hidden = true;
        fotoInput.hidden = true;
        fotoInput.value = '';
        sincronizarPerfil();
    }

    document.getElementById('btn-editar-perfil').addEventListener('click', () => {
        rascunhoPerfil = { ...perfil };
        fotoTemporaria = perfil.foto;

        document.getElementById('edit-nome').value = perfil.nome;
        document.getElementById('edit-cargo').value = perfil.cargo;
        document.getElementById('edit-email').value = perfil.email;
        document.getElementById('edit-telefone').value = perfil.telefone;

        perfilVisualizacao.hidden = true;
        formPerfil.hidden = false;
        botaoFoto.hidden = false;
        avisoFoto.hidden = false;
        fotoInput.hidden = false;
        document.getElementById('edit-nome').focus();
    });

    fotoInput.addEventListener('change', (evento) => {
        const arquivo = evento.target.files[0];
        if (!arquivo) {
            return;
        }

        if (!arquivo.type.startsWith('image/')) {
            mostrarToast('Selecione um arquivo de imagem.', 'erro');
            evento.target.value = '';
            return;
        }

        if (arquivo.size > 2 * 1024 * 1024) {
            mostrarToast('A imagem deve ter no máximo 2 MB.', 'erro');
            evento.target.value = '';
            return;
        }

        const leitor = new FileReader();
        leitor.onload = () => {
            fotoTemporaria = String(leitor.result);
            atualizarFoto(fotoTemporaria);
            mostrarToast('Prévia da foto atualizada.', 'sucesso');
        };
        leitor.onerror = () => mostrarToast('Não foi possível ler a imagem.', 'erro');
        leitor.readAsDataURL(arquivo);
    });

    formPerfil.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const nome = document.getElementById('edit-nome').value.trim();
        const email = document.getElementById('edit-email').value.trim();

        if (!nome) {
            mostrarToast('Informe o nome completo.', 'erro');
            document.getElementById('edit-nome').focus();
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarToast('Informe um e-mail válido.', 'erro');
            document.getElementById('edit-email').focus();
            return;
        }

        Object.assign(perfil, {
            nome,
            cargo: document.getElementById('edit-cargo').value.trim(),
            email,
            telefone: document.getElementById('edit-telefone').value.trim(),
            foto: fotoTemporaria
        });

        mostrarVisaoPerfil();
        mostrarToast('Perfil atualizado com sucesso.', 'sucesso');
    });

    document.getElementById('btn-cancelar-perfil').addEventListener('click', () => {
        if (rascunhoPerfil) {
            Object.assign(perfil, rascunhoPerfil);
        }
        fotoTemporaria = perfil.foto;
        mostrarVisaoPerfil();
        mostrarToast('Alterações descartadas.', 'info');
    });

    sincronizarPerfil();
}
