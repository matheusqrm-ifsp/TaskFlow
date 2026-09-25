📋 TaskFlow — Sistema Lista de Tarefas
Sistema web de lista de tarefas desenvolvido como projeto acadêmico.
Esta primeira entrega contempla o módulo de gerenciamento de usuários: cadastro público, autenticação, área do usuário e painel administrativo.

Tecnologias: HTML5 · CSS3 · JavaScript (ES6+) · Bootstrap 5.3
Persistência: localStorage (protótipo)
Licença: MIT

📸 Visão Geral
O sistema possui dois perfis de acesso:

Perfil	Permissões
👤 Usuário	Visualiza sua área pessoal, edita seus próprios dados e altera sua senha.
🛠️ Administrador	Acessa o cadastro e o gerenciamento completo de usuários (criar, consultar, editar, excluir).
✨ Funcionalidades
🌐 Área Pública (sem login)
Tela inicial com apresentação do sistema e botões de ação dinâmicos conforme o estado da sessão.

Cadastro público — o visitante cria sua própria conta (sempre com perfil Usuário e status Ativo).

Login com validação de credenciais e bloqueio de contas inativas.

👤 Área do Usuário (perfil Usuário)
Painel pessoal de boas-vindas.

Meus Dados — edição de nome, e-mail e data de nascimento.

Alterar Senha — com exigência da senha atual, validação de força e confirmação.

🛠️ Área Administrativa (perfil Administrador)
Cadastro de Usuários — criação de novos usuários com escolha de perfil (Usuário / Administrador) e status (Ativo / Inativo).

Gerenciamento de Usuários:

Listagem completa com avatar, perfil e status.

Busca por nome ou e-mail.

Filtros por perfil e status.

Ordenação (mais recentes, mais antigos, A–Z, Z–A).

Consulta detalhada em modal.

Edição de qualquer usuário.

Exclusão com confirmação.

🔐 Recursos de Segurança
Senhas armazenadas como hash (não em texto puro) no localStorage.

Verificação de e-mail único no cadastro.

Proteção contra exclusão e inativação da própria conta do administrador.

Guardas de acesso por perfil — rotas administrativas exigem autenticação de Administrador.

Usuários inativos não conseguem fazer login.

🎨 Interface
Layout responsivo com Bootstrap 5.3.

Feedback visual por toasts (sucesso, erro, aviso, informação).

Validações em tempo real nos formulários.

Indicador visual de força da senha.

Botões para mostrar/ocultar senha.

🚀 Como Executar
O projeto é 100% front-end, sem dependências de servidor ou build.

Pré-requisitos
Um navegador moderno (Chrome, Firefox, Edge ou Safari).

Passos
Clone o repositório:

bash
git clone https://github.com/matheusqrm-ifsp/TaskFlow.git
cd TaskFlow
Abra o arquivo index.html no navegador:

Duplo clique no arquivo, ou

Use a extensão Live Server do VS Code, ou

Sirva via terminal:

bash
npx serve .
Primeiro acesso administrativo:

Na primeira execução, o sistema cria automaticamente um usuário com perfil Administrador. As credenciais iniciais não são versionadas neste repositório por questões de segurança.

Para obter as credenciais de acesso inicial, entre em contato com um dos membros da equipe (ver seção Autores) ou consulte a documentação interna do grupo.

⚠️ Recomendação: altere a senha do administrador logo após o primeiro login, pela opção Meus Dados → Alterar senha (ou pelo módulo de gerenciamento, se preferir).

📁 Estrutura do Projeto
text
TaskFlow/
├── index.html      → Estrutura da aplicação (SPA com views alternadas)
├── style.css       → Ajustes visuais complementares ao Bootstrap
├── script.js       → Toda a lógica do sistema (estado, validações, sessão)
├── README.md       → Este arquivo
└── LICENSE         → Licença MIT
Organização do index.html
Navbar fixa com itens de navegação dinâmicos conforme a sessão.

view-home — conteúdo mutável de acordo com o perfil logado.

view-cadastro-publico, view-login — telas públicas.

view-area-usuario, view-meus-dados — telas do perfil Usuário.

view-cadastro, view-gerenciamento — telas do Administrador.

Modais: edição, consulta detalhada e confirmação de exclusão.

Container de toasts para notificações.

Organização do script.js
Persistência: localStorage (taskflow_usuarios_v1, taskflow_sessao_v1, taskflow_seed_v1).

Seeds: administrador padrão criado automaticamente na primeira execução.

Validações: nome, e-mail, data de nascimento, senha, confirmação e selects.

Sessão: login, logout, guarda por perfil e persistência entre recarregamentos.

Navegação: função central trocarView() com regras de acesso.

🧰 Tecnologias Utilizadas
Camada	Tecnologia
Estrutura	HTML5
Estilização	CSS3 + Bootstrap 5.3
Lógica	JavaScript (ES6+) puro, sem frameworks
Persistência	localStorage do navegador
Ícones	Emojis nativos (sem dependência externa)
🗺️ Roadmap
Funcionalidades planejadas para as próximas entregas:

□ Módulo de cadastro de tarefas
□ Organização por categorias e projetos
□ Definição de prioridades e prazos
□ Gerenciamento de status das tarefas
□ Lembretes e notificações de vencimento
□ Registro de tempo dedicado às tarefas
□ Indicadores de produtividade
□ Relatórios de cumprimento de prazos
□ Testes de aceitação com usuários
□ Manual do usuário e documentação técnica
🔒 Observações sobre Segurança
Este projeto é um protótipo acadêmico e utiliza localStorage para simular a persistência de dados no lado do cliente. Em um ambiente de produção, recomenda-se:

Migrar a persistência para um banco de dados real (ex.: SQLite, PostgreSQL).

Implementar autenticação via servidor com JWT ou sessões seguras.

Fazer o hash das senhas no servidor com bcrypt ou argon2.

Trafegar todas as requisições via HTTPS.

Adicionar rate limiting contra ataques de força bruta.

Implementar recuperação de senha por e-mail.

Nunca versionar senhas, tokens ou chaves de API no repositório — utilize variáveis de ambiente (.env) e adicione-as ao .gitignore.

🤝 Contribuindo
Contribuições são bem-vindas! Para colaborar:

Faça um fork do projeto.

Crie uma branch para sua feature:

bash
git checkout -b feature/minha-feature
Faça commit das suas alterações:

bash
git commit -m "feat: adiciona minha feature"
Envie para o remote:

bash
git push origin feature/minha-feature
Abra um Pull Request.

Padrão de commits
Este projeto segue a convenção Conventional Commits:

feat: — nova funcionalidade

fix: — correção de bug

docs: — alterações na documentação

style: — formatação (sem mudança de lógica)

refactor: — refatoração de código

chore: — tarefas de manutenção

👥 Autores
Nome	Função	Contato
Hugo Renato Alonso Camargo Penteado	Desenvolvimento	hugo.camargo@aluno.ifsp.edu.br
José Gabriel Secundino Branco	Líder Técnico e Desenvolvimento	josesantistabranco@gmail.com
Matheus Queiroz Ribeiro Moraes	Gestor e Desenvolvimento	queiroz.matheus@aluno.ifsp.edu.br
🙏 Agradecimentos
Bootstrap pela biblioteca de componentes.

A todos os usuários testadores que contribuíram com feedback durante o desenvolvimento.

<p align="center"> Feito com 💙 para organizar o seu dia a dia. </p>
