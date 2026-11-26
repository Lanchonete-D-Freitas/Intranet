export const APP_NAME = "Lanchonete D'Freitas";

export const PERIODOS = Object.freeze([
    { id: 'hoje', label: 'Hoje' },
    { id: '7-dias', label: 'Últimos 7 dias' },
    { id: '30-dias', label: 'Últimos 30 dias' }
]);

export const STATUS_PEDIDO = Object.freeze({
    pendente: { label: 'Pendente', variante: 'atencao' },
    em_preparo: { label: 'Em preparo', variante: 'info' },
    pronto: { label: 'Pronto', variante: 'sucesso' },
    entregue: { label: 'Entregue', variante: 'sucesso' },
    cancelado: { label: 'Cancelado', variante: 'erro' }
});

export const NIVEIS_ESTOQUE = Object.freeze({
    critico: { label: 'Crítico', variante: 'erro' },
    baixo: { label: 'Baixo', variante: 'atencao' },
    normal: { label: 'Normal', variante: 'sucesso' }
});

export const ESTADOS_SERVICO = Object.freeze({
    operacional: { label: 'Operacional', variante: 'sucesso' },
    degradado: { label: 'Degradado', variante: 'atencao' },
    indisponivel: { label: 'Indisponível', variante: 'erro' }
});

export const PAGINACAO = Object.freeze({
    tamanho: 10,
    paginaInicial: 1
});

export const ARMAZENAMENTO = Object.freeze({
    menuExpandido: 'dfreitas.menu.expandido'
});

export const ATALHOS = Object.freeze({
    pesquisa: 'k'
});

export const TEMPO_DEBOUNCE_MS = 300;

export const MENSAGENS = Object.freeze({
    backendNaoConfigurado: 'Integração com o backend não configurada.',
    falhaComunicacao: 'Não foi possível concluir a operação. Tente novamente.',
    semDados: 'Nenhum dado disponível para o período selecionado.',
    semResultados: 'Nenhum resultado encontrado para a busca informada.',
    respostaInvalida: 'O backend retornou uma resposta inesperada.',
    confirmarCancelamento: 'Deseja cancelar este pedido?',
    confirmarReposicao: 'Deseja solicitar a reposição deste produto?',
    pedidoCriado: 'Pedido registrado com sucesso.',
    pedidoCancelado: 'Pedido cancelado com sucesso.',
    reposicaoSolicitada: 'Reposição solicitada com sucesso.'
});
