# Intranet D'Freitas

Sistema Web de uso interno da lanchonete D'Freitas, voltado a colaboradores e gestores. Permite acompanhar pedidos, vendas e estoque em um só lugar.

Projeto desenvolvido no Projeto Integrador ADS II, da Fatec Baixada Santista Rubens Lara, como atividade extensionista.

## Sobre o projeto

A Intranet é a área restrita da plataforma Web da D'Freitas. Ela centraliza a rotina da operação: registro de pedidos, acompanhamento de vendas e controle de reposição de estoque.

> **Status:** em desenvolvimento. A interface está pronta, mas o back-end em Java e a autenticação ainda não foram implementados.

## Funcionalidades

- Login e cadastro de usuários
- Painel com faturamento, total de pedidos, pedidos pendentes, ticket médio e vendas por dia
- Filtro por período: hoje, últimos 7 dias e últimos 30 dias
- Lista de pedidos com busca, filtro por status e paginação
- Criação e cancelamento de pedidos
- Alertas de estoque e solicitação de reposição
- Menu lateral recolhível e avisos de confirmação e erro

## Tecnologias

- HTML5
- CSS3
- JavaScript (módulos ES)
- Font Awesome 6.7.2
- Java (back-end, em desenvolvimento)

## Uso

1. Faça login na tela inicial.
2. No painel, escolha o período para ver o resumo de vendas.
3. Em **Pedidos**, busque, filtre ou cancele pedidos.
4. Use **Novo pedido** para registrar uma venda.
5. Acompanhe os alertas de estoque e solicite reposição quando necessário.

## Estrutura do projeto

```
Intranet/
├── css/          estilos de cada página
├── html/         páginas (login, cadastro, painel, pedidos, novo pedido, perfil)
├── imagens/      ícones e imagens
├── js/           módulos JavaScript
└── .vscode/      configuração para depuração no Chrome
```
## Licença

Projeto acadêmico, sem fins comerciais. Todos os direitos reservados à equipe e à Fatec Baixada Santista Rubens Lara.