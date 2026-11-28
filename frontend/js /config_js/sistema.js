import { mostrarToast } from '../ui.js';

export function iniciarSistema() {
    /* Usuários e sistema. */
    document.getElementById('btn-novo-perfil').addEventListener('click', () => {
        mostrarToast('Criação de perfil disponível apenas no backend.', 'info');
    });

    document.querySelectorAll('[data-testar-integracao]').forEach((botao) => {
        botao.addEventListener('click', () => {
            mostrarToast(`Conexão com ${botao.dataset.testarIntegracao} simulada com sucesso.`, 'sucesso');
        });
    });

    const registrosAuditoria = [
        { usuario: 'Operador', acao: 'Atualização de preferências', origem: 'Navegador local', data: 'Hoje, 14:32' },
        { usuario: 'Administrador', acao: 'Alteração de alçada de desconto', origem: 'Navegador local', data: 'Hoje, 11:15' },
        { usuario: 'Sistema', acao: 'Rotina de backup simulada', origem: 'Ambiente local', data: 'Hoje, 03:00' }
    ];

    function exportarAuditoria(formato) {
        const conteudo = formato === 'csv'
            ? '\uFEFF' + [
                'Usuario;Acao;Origem;Data',
                ...registrosAuditoria.map((registro) => [
                    registro.usuario,
                    registro.acao,
                    registro.origem,
                    registro.data
                ].join(';'))
            ].join('\n')
            : JSON.stringify(registrosAuditoria, null, 2);

        const tipo = formato === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
        const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `auditoria.${formato}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        mostrarToast(`Arquivo ${formato.toUpperCase()} gerado localmente.`, 'sucesso');
    }

    document.getElementById('btn-exportar-csv').addEventListener('click', () => exportarAuditoria('csv'));
    document.getElementById('btn-exportar-json').addEventListener('click', () => exportarAuditoria('json'));
}
