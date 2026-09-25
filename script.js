(function () {
  'use strict';

  /* ----------------------------------------------------------------
     CONSTANTES
     ---------------------------------------------------------------- */
  const STORAGE_KEY = 'taskflow_usuarios_v1';
  const SESSION_KEY = 'taskflow_sessao_v1';
  const SEED_KEY    = 'taskflow_seed_v1';

  const PERFIS = [
    { valor: 'usuario', rotulo: 'Usuário' },
    { valor: 'admin',   rotulo: 'Administrador' }
  ];

  const STATUS = [
    { valor: 'ativo',   rotulo: 'Ativo' },
    { valor: 'inativo', rotulo: 'Inativo' }
  ];

  /* ----------------------------------------------------------------
     ESTADO
     ---------------------------------------------------------------- */
  let usuarios       = [];
  let sessao         = null;
  let idEmEdicao     = null;
  let idParaExcluir  = null;
  let idDetalheAtual = null;

  const filtros = { busca: '', perfil: 'todos', status: 'todos', ordem: 'recentes' };

  /* ----------------------------------------------------------------
     DOM
     ---------------------------------------------------------------- */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const formCadastroPublico = $('#form-cadastro-publico');
  const formCadastro        = $('#form-cadastro');
  const formEdicao          = $('#form-edicao');
  const formLogin           = $('#form-login');
  const formMeusDados       = $('#form-meus-dados');
  const formAlterarSenha    = $('#form-alterar-senha');

  const tbodyUsuarios = $('#tbody-usuarios');
  const estadoVazio   = $('#estado-vazio');
  const contador      = $('#contador');
  const toastArea     = $('#toast-area');

  const selectCadPerfil    = $('#cad-perfil');
  const selectCadStatus    = $('#cad-status');
  const selectEdiPerfil    = $('#edi-perfil');
  const selectEdiStatus    = $('#edi-status');
  const selectFiltroPerfil = $('#filtro-perfil');
  const selectFiltroStatus = $('#filtro-status');
  const inputBusca         = $('#busca');
  const selectOrdenacao    = $('#ordenacao');

  let modalEdicao, modalDetalhe, modalConfirmar;

  /* ----------------------------------------------------------------
     UTILITÁRIOS
     ---------------------------------------------------------------- */
  const gerarId = () =>
    'USR-' + Date.now().toString(36).toUpperCase() +
    '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  /** Hash simples para não armazenar a senha em texto puro no navegador. */
  function hashSenha(senha) {
    let hash = 5381;
    for (let i = 0; i < senha.length; i++) {
      hash = ((hash << 5) + hash) + senha.charCodeAt(i);
      hash |= 0;
    }
    return 'h$' + Math.abs(hash).toString(16).padStart(8, '0') + '$' + senha.length;
  }

  function iniciais(nome) {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function formatarData(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
  }

  function formatarDataHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const rotuloPerfil = (v) => (PERFIS.find(x => x.valor === v) || {}).rotulo || v;
  const rotuloStatus = (v) => (STATUS.find(x => x.valor === v) || {}).rotulo || v;

  /* ----------------------------------------------------------------
     PERSISTÊNCIA
     ---------------------------------------------------------------- */
  function carregarUsuarios() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      usuarios = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(usuarios)) usuarios = [];
    } catch (e) {
      console.warn('Falha ao carregar usuários:', e);
      usuarios = [];
    }
  }

  function salvarUsuarios() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios)); }
    catch (e) {
      console.warn('Falha ao salvar usuários:', e);
      toast('erro', 'Não foi possível salvar os dados.');
    }
  }

  function carregarSessao() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      sessao = raw ? JSON.parse(raw) : null;
      if (sessao && !usuarios.some(u => u.id === sessao.id)) {
        sessao = null;
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      sessao = null;
    }
  }

  function salvarSessao() {
    if (sessao) localStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
    else        localStorage.removeItem(SESSION_KEY);
  }

  /* ----------------------------------------------------------------
     SEED — Administrador inicial
     ---------------------------------------------------------------- */
  function semearAdministrador() {
    if (localStorage.getItem(SEED_KEY)) return;

    const emailAdmin = 'matheusqrm@gmail.com';
    const jaExiste = usuarios.some(u => u.email.toLowerCase() === emailAdmin);

    if (!jaExiste) {
      usuarios.push({
        id: gerarId(),
        nome: 'Matheus Queiroz Ribeiro Moraes',
        email: emailAdmin,
        dataNascimento: '1995-03-08',
        senhaHash: hashSenha('Matheus123456#'),
        perfil: 'admin',
        status: 'ativo',
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      });
      salvarUsuarios();
    }

    localStorage.setItem(SEED_KEY, '1');
  }

  /* ----------------------------------------------------------------
     TOASTS
     ---------------------------------------------------------------- */
  function toast(tipo, mensagem, detalhe) {
    const cores  = { sucesso: 'text-bg-success', erro: 'text-bg-danger', aviso: 'text-bg-warning', info: 'text-bg-info' };
    const icones = { sucesso: '✅', erro: '⛔', aviso: '⚠️', info: 'ℹ️' };

    const el = document.createElement('div');
    el.className = 'toast align-items-center border-0 ' + (cores[tipo] || cores.info);
    el.setAttribute('role', 'alert');
    el.innerHTML =
      '<div class="d-flex">' +
        '<div class="toast-body">' +
          '<span class="me-2">' + (icones[tipo] || icones.info) + '</span>' +
          '<strong>' + escapeHtml(mensagem) + '</strong>' +
          (detalhe ? '<div class="small opacity-75">' + escapeHtml(detalhe) + '</div>' : '') +
        '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>' +
      '</div>';

    toastArea.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3400 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  /* ----------------------------------------------------------------
     SELECTS
     ---------------------------------------------------------------- */
  function popularSelect(select, opcoes, incluirTodos, placeholder) {
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = '';

    if (placeholder) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = placeholder; opt.disabled = true; opt.selected = true;
      select.appendChild(opt);
    }
    if (incluirTodos) {
      const opt = document.createElement('option');
      opt.value = 'todos'; opt.textContent = 'Todos';
      select.appendChild(opt);
    }
    opcoes.forEach(op => {
      const opt = document.createElement('option');
      opt.value = op.valor; opt.textContent = op.rotulo;
      select.appendChild(opt);
    });
    if (valorAtual) select.value = valorAtual;
  }

  function inicializarSelects() {
    popularSelect(selectCadPerfil, PERFIS, false, 'Selecione um perfil');
    popularSelect(selectCadStatus, STATUS, false, 'Selecione um status');
    popularSelect(selectEdiPerfil, PERFIS, false, null);
    popularSelect(selectEdiStatus, STATUS, false, null);
    popularSelect(selectFiltroPerfil, PERFIS, true, null);
    popularSelect(selectFiltroStatus, STATUS, true, null);

    selectFiltroPerfil.value = 'todos';
    selectFiltroStatus.value = 'todos';
  }

  /* ----------------------------------------------------------------
     VALIDAÇÃO
     ---------------------------------------------------------------- */
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const REGEX_NOME  = /^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/;

  function limparErros(form) {
    if (!form) return;
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el => (el.textContent = ''));
  }

  function exibirErro(form, campo, mensagem) {
    const input = form.querySelector('[name="' + campo + '"]');
    if (!input) return false;
    input.classList.add('is-invalid');
    const erro = form.querySelector('.invalid-feedback[data-error-for="' + campo + '"]');
    if (erro) erro.textContent = mensagem;
    return false;
  }

  function validarNome(valor, form) {
    const v = valor.trim();
    if (!v) return exibirErro(form, 'nome', 'Informe o nome completo.');
    if (v.length < 3) return exibirErro(form, 'nome', 'O nome deve ter ao menos 3 caracteres.');
    if (!REGEX_NOME.test(v)) return exibirErro(form, 'nome', 'O nome deve conter apenas letras e espaços.');
    return true;
  }

  function validarEmail(valor, form, idIgnorado) {
    const v = valor.trim().toLowerCase();
    if (!v) return exibirErro(form, 'email', 'Informe o e-mail.');
    if (!REGEX_EMAIL.test(v)) return exibirErro(form, 'email', 'Informe um e-mail válido.');
    if (usuarios.some(u => u.email.toLowerCase() === v && u.id !== idIgnorado))
      return exibirErro(form, 'email', 'Este e-mail já está cadastrado.');
    return true;
  }

  function validarNascimento(valor, form) {
    if (!valor) return true;
    const d = new Date(valor + 'T00:00:00');
    if (isNaN(d)) return exibirErro(form, 'dataNascimento', 'Data inválida.');
    const hoje = new Date();
    if (d > hoje) return exibirErro(form, 'dataNascimento', 'A data não pode ser futura.');
    const idade = (hoje - d) / (1000 * 60 * 60 * 24 * 365.25);
    if (idade < 10) return exibirErro(form, 'dataNascimento', 'Idade mínima de 10 anos.');
    if (idade > 120) return exibirErro(form, 'dataNascimento', 'Verifique a data informada.');
    return true;
  }

  function validarSenha(valor, form, obrigatoria) {
    if (!valor) return obrigatoria ? exibirErro(form, 'senha', 'Informe uma senha.') : true;
    if (valor.length < 8) return exibirErro(form, 'senha', 'A senha deve ter no mínimo 8 caracteres.');
    if (!/[A-Za-zÀ-ÿ]/.test(valor)) return exibirErro(form, 'senha', 'A senha deve conter ao menos uma letra.');
    if (!/\d/.test(valor)) return exibirErro(form, 'senha', 'A senha deve conter ao menos um número.');
    return true;
  }

  function validarConfirmacao(valor, senha, form) {
    if (!valor) return exibirErro(form, 'confirmacaoSenha', 'Confirme a senha.');
    if (valor !== senha) return exibirErro(form, 'confirmacaoSenha', 'As senhas não coincidem.');
    return true;
  }

  function validarSelect(valor, form, campo, msg) {
    return valor ? true : exibirErro(form, campo, msg);
  }

  /* ----------------------------------------------------------------
     FORÇA DA SENHA
     ---------------------------------------------------------------- */
  function calcularForca(senha) {
    let p = 0;
    if (senha.length >= 8) p++;
    if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) p++;
    if (/\d/.test(senha)) p++;
    if (/[^A-Za-z0-9]/.test(senha) && senha.length >= 10) p++;
    return Math.min(p, 4);
  }

  function atualizarForca(inputId, barraId, textoId) {
    const input = document.getElementById(inputId);
    const barra = document.getElementById(barraId);
    const texto = document.getElementById(textoId);
    if (!input || !barra || !texto) return;

    const senha = input.value;
    const nivel = senha ? calcularForca(senha) : 0;
    const rotulos = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

    barra.dataset.nivel = nivel;
    if (!senha) {
      texto.textContent = 'Força da senha';
      texto.className = 'text-body-secondary d-block';
      return;
    }
    texto.textContent = 'Força: ' + rotulos[nivel];
    texto.className = 'd-block ' +
      (nivel <= 1 ? 'text-danger' : nivel === 2 ? 'text-warning' : nivel === 3 ? 'text-warning' : 'text-success');
  }

  /* ----------------------------------------------------------------
     HOME DINÂMICA
     ---------------------------------------------------------------- */
  function renderizarHome() {
    const titulo = $('#home-titulo');
    const sub    = $('#home-subtitulo');
    const acoes  = $('#home-acoes');
    if (!titulo || !sub || !acoes) return;

    if (!sessao) {
      titulo.textContent = 'Bem-vindo ao TaskFlow';
      sub.textContent    = 'Organize suas tarefas de forma simples, clara e produtiva.';
      acoes.innerHTML =
        '<button type="button" class="btn btn-primary btn-lg px-4" data-view="cadastro-publico">Cadastrar</button>' +
        '<button type="button" class="btn btn-outline-primary btn-lg px-4" data-view="login">Entrar</button>';
      return;
    }

    const primeiroNome = sessao.nome.split(' ')[0];

    if (sessao.perfil === 'admin') {
      titulo.textContent = 'Bem-vindo(a), ' + primeiroNome + '!';
      sub.textContent    = 'Acesse os módulos administrativos abaixo.';
      acoes.innerHTML =
        '<button type="button" class="btn btn-primary btn-lg px-4" data-view="gerenciamento">Gerenciar Usuários</button>' +
        '<button type="button" class="btn btn-outline-primary btn-lg px-4" data-view="cadastro">Cadastrar Usuário</button>';
    } else {
      titulo.textContent = 'Bem-vindo(a), ' + primeiroNome + '!';
      sub.textContent    = 'Acesse sua área pessoal para gerenciar suas informações.';
      acoes.innerHTML =
        '<button type="button" class="btn btn-primary btn-lg px-4" data-view="area-usuario">Minha Área</button>' +
        '<button type="button" class="btn btn-outline-primary btn-lg px-4" data-view="meus-dados">Meus Dados</button>';
    }
  }

  /* ----------------------------------------------------------------
     NAVEGAÇÃO / SESSÃO
     ---------------------------------------------------------------- */
  function atualizarNav() {
    const logado  = !!sessao;
    const isAdmin = logado && sessao.perfil === 'admin';

    /* Itens de navegação visíveis conforme o estado da sessão */
    $$('[data-nav]').forEach(el => {
      const nav = el.dataset.nav;
      let visivel = false;

      if (!logado) {
        visivel = ['home', 'cadastro-publico', 'login'].includes(nav);
      } else if (isAdmin) {
        visivel = ['home', 'cadastro', 'gerenciamento'].includes(nav);
      } else {
        visivel = ['home', 'area-usuario', 'meus-dados'].includes(nav);
      }
      el.classList.toggle('d-none', !visivel);
    });

    /* Bloco de sessão (nome + botão Sair) — mostra apenas quando logado */
    const navSessao = $('#nav-sessao');
    if (logado) {
      navSessao.classList.remove('d-none');
      navSessao.classList.add('d-flex');
      $('#nav-username').textContent = sessao.nome;
    } else {
      navSessao.classList.add('d-none');
      navSessao.classList.remove('d-flex');
      $('#nav-username').textContent = '';
    }

    /* Conteúdo da home é reescrito conforme a sessão */
    renderizarHome();

    /* Estado ativo do botão correspondente à view atual */
    $$('.nav-link').forEach(b => b.classList.remove('active'));
    const atual = document.querySelector('.view:not([hidden])');
    if (atual) {
      const navAtual = document.querySelector('[data-view="' + atual.id.replace('view-', '') + '"]');
      if (navAtual) navAtual.classList.add('active');
    }
  }

  function trocarView(nome) {
    /* Usuário logado não pode acessar telas públicas de autenticação */
    if (sessao && ['login', 'cadastro-publico'].includes(nome)) {
      nome = sessao.perfil === 'admin' ? 'gerenciamento' : 'area-usuario';
    }

    /* Cadastro e Gerenciamento são exclusivos do Administrador */
    if (['cadastro', 'gerenciamento'].includes(nome)) {
      if (!sessao || sessao.perfil !== 'admin') {
        toast('erro', 'Acesso restrito a administradores.');
        nome = sessao ? 'area-usuario' : 'home';
      }
    }

    /* Área do usuário e Meus Dados exigem login */
    if (['area-usuario', 'meus-dados'].includes(nome) && !sessao) {
      nome = 'login';
    }

    /* Meus Dados é específico do perfil "Usuário" */
    if (nome === 'meus-dados' && sessao && sessao.perfil === 'admin') {
      nome = 'gerenciamento';
    }

    $$('.view').forEach(v => {
      const ativa = v.id === 'view-' + nome;
      v.hidden = !ativa;
    });

    /* Hooks de carregamento */
    if (nome === 'meus-dados') carregarMeusDados();
    if (nome === 'gerenciamento') renderizarTabela();

    atualizarNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function abrirSessao(usuario) {
    sessao = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
    salvarSessao();
    atualizarNav();

    if (usuario.perfil === 'admin') {
      trocarView('gerenciamento');
    } else {
      $('#area-nome').textContent = usuario.nome.split(' ')[0];
      $('#area-avatar').textContent = iniciais(usuario.nome);
      trocarView('area-usuario');
    }
  }

  function encerrarSessao() {
    sessao = null;
    salvarSessao();
    trocarView('home');
    atualizarNav();
    toast('info', 'Você saiu da sua conta.');
  }

  /* ----------------------------------------------------------------
     CADASTRO PÚBLICO — sempre perfil "Usuário" / status "Ativo"
     ---------------------------------------------------------------- */
  function submeterCadastroPublico(e) {
    e.preventDefault();
    limparErros(formCadastroPublico);

    const { nome, email, dataNascimento, senha, confirmacaoSenha } = formCadastroPublico;

    let valido = true;
    valido = validarNome(nome.value, formCadastroPublico) && valido;
    valido = validarEmail(email.value, formCadastroPublico, null) && valido;
    valido = validarNascimento(dataNascimento.value, formCadastroPublico) && valido;
    valido = validarSenha(senha.value, formCadastroPublico, true) && valido;
    valido = validarConfirmacao(confirmacaoSenha.value, senha.value, formCadastroPublico) && valido;

    if (!valido) {
      toast('erro', 'Verifique os campos destacados.');
      const primeiro = formCadastroPublico.querySelector('.is-invalid');
      if (primeiro) primeiro.focus();
      return;
    }

    usuarios.push({
      id: gerarId(),
      nome: nome.value.trim(),
      email: email.value.trim().toLowerCase(),
      dataNascimento: dataNascimento.value || '',
      senhaHash: hashSenha(senha.value),
      perfil: 'usuario',
      status: 'ativo',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    });

    salvarUsuarios();
    formCadastroPublico.reset();
    atualizarForca('pub-senha', 'pub-forca', 'pub-forca-texto');
    limparErros(formCadastroPublico);

    toast('sucesso', 'Cadastro realizado!', 'Agora faça login para acessar o sistema.');
    trocarView('login');

    /* Pré-preenche o e-mail no login */
    $('#login-email').value = email.value.trim().toLowerCase();
    $('#login-senha').focus();
  }

  /* ----------------------------------------------------------------
     CADASTRO (ADMIN)
     ---------------------------------------------------------------- */
  function submeterCadastroAdmin(e) {
    e.preventDefault();
    limparErros(formCadastro);

    const { nome, email, dataNascimento, senha, confirmacaoSenha, perfil, status } = formCadastro;

    let valido = true;
    valido = validarNome(nome.value, formCadastro) && valido;
    valido = validarEmail(email.value, formCadastro, null) && valido;
    valido = validarNascimento(dataNascimento.value, formCadastro) && valido;
    valido = validarSenha(senha.value, formCadastro, true) && valido;
    valido = validarConfirmacao(confirmacaoSenha.value, senha.value, formCadastro) && valido;
    valido = validarSelect(perfil.value, formCadastro, 'perfil', 'Selecione um perfil.') && valido;
    valido = validarSelect(status.value, formCadastro, 'status', 'Selecione um status.') && valido;

    if (!valido) {
      toast('erro', 'Verifique os campos destacados.');
      const primeiro = formCadastro.querySelector('.is-invalid');
      if (primeiro) primeiro.focus();
      return;
    }

    const novo = {
      id: gerarId(),
      nome: nome.value.trim(),
      email: email.value.trim().toLowerCase(),
      dataNascimento: dataNascimento.value || '',
      senhaHash: hashSenha(senha.value),
      perfil: perfil.value,
      status: status.value,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    usuarios.push(novo);
    salvarUsuarios();

    formCadastro.reset();
    atualizarForca('cad-senha', 'cad-forca', 'cad-forca-texto');
    limparErros(formCadastro);

    toast('sucesso', 'Usuário cadastrado com sucesso!', novo.nome);
    renderizarTabela();
  }

  /* ----------------------------------------------------------------
     LOGIN
     ---------------------------------------------------------------- */
  function submeterLogin(e) {
    e.preventDefault();
    limparErros(formLogin);

    const email = formLogin.email.value.trim().toLowerCase();
    const senha = formLogin.senha.value;

    let valido = true;
    if (!email) { exibirErro(formLogin, 'email', 'Informe o e-mail.'); valido = false; }
    else if (!REGEX_EMAIL.test(email)) { exibirErro(formLogin, 'email', 'Informe um e-mail válido.'); valido = false; }

    if (!senha) { exibirErro(formLogin, 'senha', 'Informe a senha.'); valido = false; }

    if (!valido) return;

    const usuario = usuarios.find(u => u.email.toLowerCase() === email);
    const senhaOk = usuario && usuario.senhaHash === hashSenha(senha);

    if (!usuario || !senhaOk) {
      exibirErro(formLogin, 'senha', 'E-mail ou senha inválidos.');
      toast('erro', 'Não foi possível entrar.', 'Verifique suas credenciais.');
      return;
    }

    if (usuario.status === 'inativo') {
      toast('erro', 'Conta inativa.', 'Entre em contato com o administrador.');
      return;
    }

    formLogin.reset();
    limparErros(formLogin);
    abrirSessao(usuario);
    toast('sucesso', 'Bem-vindo(a), ' + usuario.nome.split(' ')[0] + '!');
  }

  /* ----------------------------------------------------------------
     MEUS DADOS
     ---------------------------------------------------------------- */
  function carregarMeusDados() {
    if (!sessao) return;
    const u = usuarios.find(x => x.id === sessao.id);
    if (!u) return;

    limparErros(formMeusDados);
    limparErros(formAlterarSenha);

    formMeusDados.nome.value           = u.nome;
    formMeusDados.email.value          = u.email;
    formMeusDados.dataNascimento.value = u.dataNascimento || '';

    formAlterarSenha.reset();
    atualizarForca('md-senha-nova', 'md-forca', 'md-forca-texto');
  }

  function submeterMeusDados(e) {
    e.preventDefault();
    if (!sessao) return;
    limparErros(formMeusDados);

    const { nome, email, dataNascimento } = formMeusDados;

    let valido = true;
    valido = validarNome(nome.value, formMeusDados) && valido;
    valido = validarEmail(email.value, formMeusDados, sessao.id) && valido;
    valido = validarNascimento(dataNascimento.value, formMeusDados) && valido;

    if (!valido) {
      toast('erro', 'Verifique os campos destacados.');
      const primeiro = formMeusDados.querySelector('.is-invalid');
      if (primeiro) primeiro.focus();
      return;
    }

    const idx = usuarios.findIndex(x => x.id === sessao.id);
    if (idx === -1) return;

    usuarios[idx] = {
      ...usuarios[idx],
      nome: nome.value.trim(),
      email: email.value.trim().toLowerCase(),
      dataNascimento: dataNascimento.value || '',
      atualizadoEm: new Date().toISOString()
    };

    /* Atualiza a sessão */
    sessao.nome = usuarios[idx].nome;
    salvarSessao();
    salvarUsuarios();

    /* Atualiza a área do usuário */
    $('#area-nome').textContent   = usuarios[idx].nome.split(' ')[0];
    $('#area-avatar').textContent = iniciais(usuarios[idx].nome);

    atualizarNav();
    toast('sucesso', 'Dados atualizados com sucesso!');
  }

  function submeterAlterarSenha(e) {
    e.preventDefault();
    if (!sessao) return;
    limparErros(formAlterarSenha);

    const { senhaAtual, senhaNova, confirmacaoNova } = formAlterarSenha;
    const u = usuarios.find(x => x.id === sessao.id);
    if (!u) return;

    let valido = true;

    /* Senha atual */
    if (!senhaAtual.value) {
      exibirErro(formAlterarSenha, 'senhaAtual', 'Informe a senha atual.');
      valido = false;
    } else if (u.senhaHash !== hashSenha(senhaAtual.value)) {
      exibirErro(formAlterarSenha, 'senhaAtual', 'Senha atual incorreta.');
      valido = false;
    }

    /* Nova senha */
    const sn = senhaNova.value;
    if (!sn) {
      exibirErro(formAlterarSenha, 'senhaNova', 'Informe a nova senha.');
      valido = false;
    } else if (sn.length < 8) {
      exibirErro(formAlterarSenha, 'senhaNova', 'A senha deve ter no mínimo 8 caracteres.');
      valido = false;
    } else if (!/[A-Za-zÀ-ÿ]/.test(sn)) {
      exibirErro(formAlterarSenha, 'senhaNova', 'A senha deve conter ao menos uma letra.');
      valido = false;
    } else if (!/\d/.test(sn)) {
      exibirErro(formAlterarSenha, 'senhaNova', 'A senha deve conter ao menos um número.');
      valido = false;
    } else if (senhaAtual.value && sn === senhaAtual.value) {
      exibirErro(formAlterarSenha, 'senhaNova', 'A nova senha deve ser diferente da atual.');
      valido = false;
    }

    /* Confirmação */
    if (!confirmacaoNova.value) {
      exibirErro(formAlterarSenha, 'confirmacaoNova', 'Confirme a nova senha.');
      valido = false;
    } else if (confirmacaoNova.value !== sn) {
      exibirErro(formAlterarSenha, 'confirmacaoNova', 'As senhas não coincidem.');
      valido = false;
    }

    if (!valido) {
      toast('erro', 'Verifique os campos destacados.');
      const primeiro = formAlterarSenha.querySelector('.is-invalid');
      if (primeiro) primeiro.focus();
      return;
    }

    const idx = usuarios.findIndex(x => x.id === sessao.id);
    usuarios[idx].senhaHash    = hashSenha(sn);
    usuarios[idx].atualizadoEm = new Date().toISOString();
    salvarUsuarios();

    formAlterarSenha.reset();
    atualizarForca('md-senha-nova', 'md-forca', 'md-forca-texto');
    toast('sucesso', 'Senha alterada com sucesso!');
  }

  /* ----------------------------------------------------------------
     RENDERIZAÇÃO DA TABELA
     ---------------------------------------------------------------- */
  function obterUsuariosFiltrados() {
    const termo = filtros.busca.trim().toLowerCase();
    let lista = usuarios.filter(u => {
      const okBusca  = !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
      const okPerfil = filtros.perfil === 'todos' || u.perfil === filtros.perfil;
      const okStatus = filtros.status === 'todos' || u.status === filtros.status;
      return okBusca && okPerfil && okStatus;
    });

    switch (filtros.ordem) {
      case 'antigos':   lista.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)); break;
      case 'nome-asc':  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); break;
      case 'nome-desc': lista.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR')); break;
      default:          lista.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    }
    return lista;
  }

  function renderizarTabela() {
    const lista = obterUsuariosFiltrados();
    contador.textContent = lista.length === 1 ? '1 usuário' : lista.length + ' usuários';

    if (!lista.length) {
      tbodyUsuarios.innerHTML = '';
      estadoVazio.hidden = false;
      return;
    }
    estadoVazio.hidden = true;

    const sessaoId = sessao ? sessao.id : null;

    tbodyUsuarios.innerHTML = lista.map(u => {
      const ehProprio = u.id === sessaoId;
      return `
        <tr data-id="${escapeHtml(u.id)}">
          <td class="mono">${escapeHtml(u.id)}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="avatar">${escapeHtml(iniciais(u.nome))}</div>
              <div>
                <div class="fw-semibold">${escapeHtml(u.nome)}${ehProprio ? ' <span class="badge text-bg-primary ms-1">você</span>' : ''}</div>
                <div class="text-body-secondary small">
                  ${escapeHtml(u.dataNascimento ? 'Nasc. ' + formatarData(u.dataNascimento) : 'Sem data de nascimento')}
                </div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge text-bg-light border">${escapeHtml(rotuloPerfil(u.perfil))}</span></td>
          <td><span class="badge text-bg-${u.status === 'ativo' ? 'success' : 'secondary'}">
            ${escapeHtml(rotuloStatus(u.status))}
          </span></td>
          <td class="text-body-secondary small">${escapeHtml(formatarDataHora(u.criadoEm))}</td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-outline-secondary" data-acao="ver"     data-id="${escapeHtml(u.id)}">Ver</button>
              <button type="button" class="btn btn-outline-primary"   data-acao="editar"  data-id="${escapeHtml(u.id)}">Editar</button>
              <button type="button" class="btn btn-outline-danger"    data-acao="excluir" data-id="${escapeHtml(u.id)}" ${ehProprio ? 'disabled title="Você não pode excluir a própria conta."' : ''}>Excluir</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  /* ----------------------------------------------------------------
     CONSULTA / EDIÇÃO / EXCLUSÃO (ADMIN)
     ---------------------------------------------------------------- */
  function abrirDetalhe(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    idDetalheAtual = id;

    $('#detalhe-corpo').innerHTML = `
      <dl class="detalhe-lista">
        <dt>ID</dt>              <dd class="mono">${escapeHtml(u.id)}</dd>
        <dt>Nome completo</dt>   <dd>${escapeHtml(u.nome)}</dd>
        <dt>E-mail</dt>          <dd>${escapeHtml(u.email)}</dd>
        <dt>Nascimento</dt>      <dd>${escapeHtml(u.dataNascimento ? formatarData(u.dataNascimento) : 'Não informado')}</dd>
        <dt>Perfil</dt>          <dd><span class="badge text-bg-light border">${escapeHtml(rotuloPerfil(u.perfil))}</span></dd>
        <dt>Status</dt>          <dd><span class="badge text-bg-${u.status === 'ativo' ? 'success' : 'secondary'}">${escapeHtml(rotuloStatus(u.status))}</span></dd>
        <dt>Cadastrado em</dt>   <dd>${escapeHtml(formatarDataHora(u.criadoEm))}</dd>
        <dt>Última alteração</dt><dd>${escapeHtml(formatarDataHora(u.atualizadoEm || u.criadoEm))}</dd>
      </dl>`;

    modalDetalhe.show();
  }

  function abrirEdicao(id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;

    idEmEdicao = id;
    limparErros(formEdicao);

    $('#edicao-identificador').textContent =
      'ID: ' + u.id + ' · Cadastrado em ' + formatarDataHora(u.criadoEm);

    formEdicao.nome.value           = u.nome;
    formEdicao.email.value          = u.email;
    formEdicao.dataNascimento.value = u.dataNascimento || '';
    formEdicao.perfil.value         = u.perfil;
    formEdicao.status.value         = u.status;
    formEdicao.senha.value          = '';

    modalEdicao.show();
  }

  function submeterEdicao(e) {
    e.preventDefault();
    if (!idEmEdicao) return;
    limparErros(formEdicao);

    const { nome, email, dataNascimento, senha, perfil, status } = formEdicao;

    let valido = true;
    valido = validarNome(nome.value, formEdicao) && valido;
    valido = validarEmail(email.value, formEdicao, idEmEdicao) && valido;
    valido = validarNascimento(dataNascimento.value, formEdicao) && valido;
    valido = validarSenha(senha.value, formEdicao, false) && valido;
    valido = validarSelect(perfil.value, formEdicao, 'perfil', 'Selecione um perfil.') && valido;
    valido = validarSelect(status.value, formEdicao, 'status', 'Selecione um status.') && valido;

    if (!valido) {
      toast('erro', 'Verifique os campos destacados.');
      const primeiro = formEdicao.querySelector('.is-invalid');
      if (primeiro) primeiro.focus();
      return;
    }

    const ehProprio = sessao && sessao.id === idEmEdicao;
    if (ehProprio && status.value === 'inativo') {
      toast('erro', 'Você não pode inativar a própria conta.');
      return;
    }

    const idx = usuarios.findIndex(x => x.id === idEmEdicao);
    if (idx === -1) return;

    usuarios[idx] = {
      ...usuarios[idx],
      nome: nome.value.trim(),
      email: email.value.trim().toLowerCase(),
      dataNascimento: dataNascimento.value || '',
      perfil: perfil.value,
      status: status.value,
      atualizadoEm: new Date().toISOString()
    };

    if (senha.value) usuarios[idx].senhaHash = hashSenha(senha.value);

    if (ehProprio) {
      sessao.nome   = usuarios[idx].nome;
      sessao.perfil = usuarios[idx].perfil;
      salvarSessao();
      atualizarNav();
    }

    salvarUsuarios();
    modalEdicao.hide();
    toast('sucesso', 'Dados atualizados com sucesso!', usuarios[idx].nome);
    renderizarTabela();
  }

  function abrirConfirmacaoExclusao(id) {
    if (sessao && sessao.id === id) {
      toast('aviso', 'Você não pode excluir a própria conta.');
      return;
    }
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    idParaExcluir = id;
    $('#confirmar-texto').innerHTML =
      'Deseja realmente excluir o usuário <strong>' + escapeHtml(u.nome) + '</strong>?';
    modalConfirmar.show();
  }

  function confirmarExclusao() {
    if (!idParaExcluir) return;
    const u = usuarios.find(x => x.id === idParaExcluir);
    usuarios = usuarios.filter(x => x.id !== idParaExcluir);
    salvarUsuarios();
    modalConfirmar.hide();
    idParaExcluir = null;
    toast('sucesso', 'Usuário excluído.', u ? u.nome : '');
    renderizarTabela();
  }

  /* ----------------------------------------------------------------
     EVENTOS
     ---------------------------------------------------------------- */
  function vincularEventos() {

    /* Navegação por qualquer elemento com data-view */
    document.addEventListener('click', (e) => {
      const alvo = e.target.closest('[data-view]');
      if (!alvo) return;
      e.preventDefault();
      trocarView(alvo.dataset.view);
    });

    /* Mostrar/ocultar senha */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-toggle-senha]');
      if (!btn) return;
      const input = document.getElementById(btn.dataset.toggleSenha);
      if (!input) return;
      const mostrando = input.type === 'text';
      input.type = mostrando ? 'password' : 'text';
      btn.textContent = mostrando ? '👁' : '🙈';
    });

    /* Logout */
    $('#btn-logout').addEventListener('click', encerrarSessao);

    /* Forms */
    formCadastroPublico.addEventListener('submit', submeterCadastroPublico);
    formCadastro.addEventListener('submit', submeterCadastroAdmin);
    formLogin.addEventListener('submit', submeterLogin);
    formEdicao.addEventListener('submit', submeterEdicao);
    formMeusDados.addEventListener('submit', submeterMeusDados);
    formAlterarSenha.addEventListener('submit', submeterAlterarSenha);

    /* Limpar erros ao digitar */
    [formCadastroPublico, formCadastro, formLogin, formEdicao, formMeusDados, formAlterarSenha].forEach(form => {
      form.addEventListener('input', (e) => {
        e.target.classList.remove('is-invalid');
        const erro = form.querySelector('.invalid-feedback[data-error-for="' + e.target.name + '"]');
        if (erro) erro.textContent = '';

        if (e.target.id === 'pub-senha')     atualizarForca('pub-senha', 'pub-forca', 'pub-forca-texto');
        if (e.target.id === 'cad-senha')     atualizarForca('cad-senha', 'cad-forca', 'cad-forca-texto');
        if (e.target.id === 'md-senha-nova') atualizarForca('md-senha-nova', 'md-forca', 'md-forca-texto');
      });
    });

    /* Reset do form admin */
    $('#btn-limpar-cadastro').addEventListener('click', () => {
      setTimeout(() => {
        limparErros(formCadastro);
        atualizarForca('cad-senha', 'cad-forca', 'cad-forca-texto');
      }, 0);
    });

    /* Ações na tabela */
    tbodyUsuarios.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acao]');
      if (!btn || btn.disabled) return;
      const { acao, id } = btn.dataset;
      if (acao === 'ver')     abrirDetalhe(id);
      if (acao === 'editar')  abrirEdicao(id);
      if (acao === 'excluir') abrirConfirmacaoExclusao(id);
    });

    /* Filtros */
    inputBusca.addEventListener('input', (e) => { filtros.busca = e.target.value; renderizarTabela(); });
    selectFiltroPerfil.addEventListener('change', (e) => { filtros.perfil = e.target.value; renderizarTabela(); });
    selectFiltroStatus.addEventListener('change', (e) => { filtros.status = e.target.value; renderizarTabela(); });
    selectOrdenacao.addEventListener('change', (e) => { filtros.ordem = e.target.value; renderizarTabela(); });

    /* Confirmação de exclusão */
    $('#btn-confirmar-exclusao').addEventListener('click', confirmarExclusao);

    /* Editar a partir do detalhe */
    $('#btn-editar-do-detalhe').addEventListener('click', () => {
      const id = idDetalheAtual;
      modalDetalhe.hide();
      setTimeout(() => { if (id) abrirEdicao(id); }, 220);
    });
  }

  /* ----------------------------------------------------------------
     INICIALIZAÇÃO
     ---------------------------------------------------------------- */
  function init() {
    modalEdicao    = new bootstrap.Modal(document.getElementById('modal-edicao'));
    modalDetalhe   = new bootstrap.Modal(document.getElementById('modal-detalhe'));
    modalConfirmar = new bootstrap.Modal(document.getElementById('modal-confirmar'));

    inicializarSelects();
    carregarUsuarios();
    semearAdministrador();
    carregarSessao();
    vincularEventos();
    renderizarTabela();
    atualizarForca('pub-senha', 'pub-forca', 'pub-forca-texto');
    atualizarForca('cad-senha', 'cad-forca', 'cad-forca-texto');
    atualizarForca('md-senha-nova', 'md-forca', 'md-forca-texto');

    /* View inicial */
    if (sessao) {
      if (sessao.perfil === 'admin') {
        trocarView('gerenciamento');
      } else {
        $('#area-nome').textContent   = sessao.nome.split(' ')[0];
        $('#area-avatar').textContent = iniciais(sessao.nome);
        trocarView('area-usuario');
      }
    } else {
      trocarView('home');
    }
    atualizarNav();
  }

  document.addEventListener('DOMContentLoaded', init);
})();