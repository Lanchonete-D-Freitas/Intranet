# 🍔 Intranet D'Freitas

> **Sistema Web interno para gerenciamento da operação da lanchonete D'Freitas.**

A **Intranet D'Freitas** foi desenvolvida para centralizar informações e processos internos da lanchonete, facilitando o acompanhamento de **pedidos, vendas, estoque e usuários** em um único ambiente.

🎓 Projeto desenvolvido no **Projeto Integrador ADS II**, da **Fatec Baixada Santista Rubens Lara**, como atividade extensionista.

---

## 🚀 Sobre o projeto

A Intranet representa a área restrita da plataforma Web da D'Freitas.

A proposta é oferecer aos colaboradores e gestores uma interface simples e organizada para acompanhar a operação do estabelecimento.

Entre as principais áreas do sistema estão:

📊 **Dashboard** — acompanhamento dos principais indicadores de vendas.

🧾 **Pedidos** — consulta, acompanhamento e gerenciamento dos pedidos.

➕ **Novo Pedido** — registro de novos pedidos realizados pelos clientes.

👤 **Usuários** — cadastro e gerenciamento de acesso.

🙍 **Perfil** — informações do usuário conectado.

📦 **Estoque** — acompanhamento de produtos e alertas de reposição.

> 🛠️ **Status do projeto:** em desenvolvimento.  
> A interface front-end está sendo desenvolvida. O back-end em Java e a autenticação ainda estão em implementação.

---

## ✨ Funcionalidades

### 🔐 Acesso e usuários
- Login de usuários
- Cadastro de novos usuários
- Página de perfil
- Estrutura preparada para autenticação

### 📊 Dashboard
- Visualização do faturamento
- Total de pedidos
- Pedidos pendentes
- Ticket médio
- Acompanhamento das vendas por dia
- Filtro por período:
  - 📅 Hoje
  - 📅 Últimos 7 dias
  - 📅 Últimos 30 dias

### 🧾 Pedidos
- Listagem de pedidos
- Busca de pedidos
- Filtro por status
- Paginação
- Visualização das informações dos pedidos
- Cancelamento de pedidos

### ➕ Novo pedido
- Registro de novos pedidos
- Organização dos produtos
- Integração planejada com o módulo de pedidos

### 📦 Estoque
- Alertas de estoque
- Identificação de produtos que precisam de reposição
- Solicitação de reposição

### 🎨 Interface
- Menu lateral
- Navegação entre páginas
- Mensagens de confirmação
- Mensagens de erro
- Layout responsivo em desenvolvimento

---

## 🧰 Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| 🌐 **HTML5** | Estrutura das páginas |
| 🎨 **CSS3** | Estilização e layout |
| ⚡ **JavaScript** | Interações e funcionalidades do front-end |
| 🧩 **JavaScript ES Modules** | Organização dos módulos JS |
| ⭐ **Font Awesome 6.7.2** | Ícones da interface |
| ☕ **Java** | Back-end — em desenvolvimento |
| 🗄️ **SQL** | Estrutura e inicialização do banco de dados |

---

## 📁 Estrutura do projeto

```text
intranet/
│
├── .vscode/
│   └── launch.json
│
├── DataBase/
│   └── init.sql
│
├── frontend/
│   │
│   ├── css/
│   │   ├── dashboard.css
│   │   ├── gestao-pedidos.css
│   │   ├── home.css
│   │   ├── login.css
│   │   ├── new_user.css
│   │   └── pedidos.css
│   │
│   ├── html/
│   │   ├── home.html
│   │   ├── login.html
│   │   ├── new_user.html
│   │   ├── novo_pedido.html
│   │   ├── pedidos.html
│   │   └── perfil.html
│   │
│   ├── imagens/
│   │
│   └── js/
│
└── readme.txt
```

---

## 🗂️ Organização das pastas

### 🎨 `frontend/css/`

Contém os arquivos responsáveis pela estilização das páginas do sistema.

- `dashboard.css` → estilos do painel
- `gestao-pedidos.css` → estilos da gestão de pedidos
- `home.css` → estilos da página inicial
- `login.css` → estilos da tela de login
- `new_user.css` → estilos do cadastro de usuário
- `pedidos.css` → estilos da página de pedidos

### 🌐 `frontend/html/`

Contém as páginas HTML da aplicação.

- `home.html` → página inicial
- `login.html` → tela de login
- `new_user.html` → cadastro de usuário
- `novo_pedido.html` → criação de novo pedido
- `pedidos.html` → consulta e gerenciamento de pedidos
- `perfil.html` → perfil do usuário

### ⚡ `frontend/js/`

Diretório destinado aos scripts JavaScript responsáveis pelas interações e funcionalidades do sistema.

### 🖼️ `frontend/imagens/`

Armazena as imagens utilizadas na interface da Intranet.

### 🗄️ `DataBase/`

Contém os arquivos relacionados ao banco de dados.

- `init.sql` → script de inicialização da estrutura do banco.

### 🛠️ `.vscode/`

Contém configurações utilizadas durante o desenvolvimento.

- `launch.json` → configuração de execução e depuração do projeto.

---

## ▶️ Como executar

### 1️⃣ Clone ou baixe o projeto

```bash
git clone <URL_DO_REPOSITORIO>
```

### 2️⃣ Abra a pasta do projeto

```text
intranet/
```

### 3️⃣ Execute o front-end

Abra os arquivos HTML presentes em:

```text
frontend/html/
```

Para uma experiência de desenvolvimento mais adequada, recomenda-se utilizar uma extensão como **Live Server** no Visual Studio Code.

### 4️⃣ Banco de dados

O script inicial do banco está disponível em:

```text
DataBase/init.sql
```

O back-end em Java será integrado posteriormente ao front-end e ao banco de dados.

---

## 🔄 Fluxo principal

```text
             👤 USUÁRIO
                 │
                 ▼
            🔐 LOGIN
                 │
                 ▼
          🏠 PÁGINA INICIAL
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   📊 DASHBOARD 🧾 PEDIDOS 👤 PERFIL
                 │
                 ▼
           ➕ NOVO PEDIDO
                 │
                 ▼
          📦 ESTOQUE
```

---

## 🎯 Objetivo

O principal objetivo da Intranet D'Freitas é **centralizar a gestão interna da lanchonete**, proporcionando uma experiência simples para os colaboradores e uma visão mais organizada da operação para os gestores.

A estrutura foi pensada para permitir a evolução do projeto com a futura integração entre:

**Front-end + Back-end Java + Banco de Dados**

---

## 🚧 Próximas etapas

- [ ] Implementação do back-end em Java
- [ ] Integração com o banco de dados
- [ ] Implementação da autenticação
- [ ] Integração dos pedidos com o banco
- [ ] Integração do controle de estoque
- [ ] Persistência dos usuários
- [ ] Validações no servidor
- [ ] Melhorias de responsividade
- [ ] Testes e correções

---

## 👨‍💻 Projeto acadêmico

Este projeto foi desenvolvido como parte das atividades acadêmicas do curso de **Análise e Desenvolvimento de Sistemas — ADS II**, da:

**Fatec Baixada Santista Rubens Lara**

📚 Projeto Integrador  
🏫 Atividade extensionista  
🍔 Sistema desenvolvido para a D'Freitas

---

## 📄 Licença

Projeto acadêmico, sem fins comerciais.

**Todos os direitos reservados à equipe do projeto e à Fatec Baixada Santista Rubens Lara.**

---

<div align="center">

### 🍔 Intranet D'Freitas

**Organização • Agilidade • Controle**

🚀 *Projeto em desenvolvimento*

</div>
