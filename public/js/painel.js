function verificarSessaoExpirada(resposta) {
  if (resposta.status === 401) {
    window.location.replace('/login');
    return true;
  }

  return false;
}

function formatarUptime(segundos) {
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);

  return `${dias}d ${horas}h ${minutos}m`;
}

let minhaConta = null;
let minhaLicenca = null;

let bots = [];

let idBotSelecionado =
  localStorage.getItem('ravexHostBotSelecionado') || null;

let acaoEmAndamento = false;

function selecionarBot(idBot) {
  idBotSelecionado = idBot || null;

  if (idBotSelecionado) {
    localStorage.setItem(
      'ravexHostBotSelecionado',
      idBotSelecionado
    );
  } else {
    localStorage.removeItem(
      'ravexHostBotSelecionado'
    );
  }
}

function renderizarResumoConta() {
  if (!minhaConta) {
    return;
  }

  const nome = document.getElementById(
    'nomeConta'
  );
  const username = document.getElementById(
    'usernameConta'
  );
  const plano = document.getElementById(
    'planoConta'
  );
  const estado = document.getElementById(
    'estadoLicenca'
  );
  const dias = document.getElementById(
    'diasLicenca'
  );
  const imagem = document.getElementById(
    'avatarCabecalho'
  );
  const padrao = document.getElementById(
    'avatarPadrao'
  );
  const estadoConta = document.getElementById(
    'estadoConta'
  );

  if (nome) {
    nome.textContent =
      minhaConta.nome || 'Utilizador RAVEX';
  }

  if (username) {
    username.textContent =
      minhaConta.username
        ? `@${minhaConta.username}`
        : '@ravex';
  }

  if (plano) {
    plano.textContent =
      minhaLicenca?.plano || 'Sem plano';
  }

  if (estado) {
    if (minhaLicenca?.status === 'proprietario') {
      estado.textContent = '👑 Proprietário';
    } else if (minhaLicenca?.ativa) {
      estado.textContent = '🟢 Ativa';
    } else {
      estado.textContent = '🔴 Expirada';
    }
  }

  if (dias) {
    if (minhaLicenca?.status === 'proprietario') {
      dias.textContent = 'Ilimitado';
    } else {
      const restantes =
        Number(minhaLicenca?.diasRestantes) || 0;

      dias.textContent =
        `${restantes} dia${restantes === 1 ? '' : 's'}`;
    }
  }

  if (estadoConta) {
    estadoConta.classList.toggle(
      'inativo',
      minhaConta.estado !== 'ativo'
    );
  }

  if (imagem && padrao) {
    if (minhaConta.avatar) {
      imagem.src = minhaConta.avatar;
      imagem.hidden = false;
      padrao.hidden = true;
    } else {
      imagem.removeAttribute('src');
      imagem.hidden = true;
      padrao.hidden = false;

      const inicial =
        String(minhaConta.nome || 'R')
          .trim()
          .charAt(0)
          .toUpperCase();

      padrao.textContent = inicial || 'R';
    }
  }
}

document.addEventListener(
  'ravex:conta-atualizada',
  renderizarResumoConta
);

function formatarDataConta(valor) {
  if (!valor) {
    return '--';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat(
    'pt-PT',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(data);
}

function definirTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function renderizarPaginaPerfil() {
  if (!minhaConta) {
    return;
  }

  const proprietario =
    minhaConta.tipo === 'proprietario';

  definirTexto(
    'perfilNome',
    minhaConta.nome || 'Utilizador RAVEX'
  );

  definirTexto(
    'perfilUsername',
    minhaConta.username
      ? `@${minhaConta.username}`
      : '@ravex'
  );

  definirTexto(
    'perfilBio',
    minhaConta.bio ||
      'Nenhuma bio adicionada.'
  );

  definirTexto(
    'perfilPais',
    minhaConta.pais
      ? `🌍 ${minhaConta.pais}`
      : '🌍 País não informado'
  );

  definirTexto(
    'perfilTipoConta',
    proprietario
      ? '👑 Proprietário'
      : '👤 Cliente'
  );

  definirTexto(
    'perfilInfoNome',
    minhaConta.nome || '--'
  );

  definirTexto(
    'perfilInfoUsername',
    minhaConta.username
      ? `@${minhaConta.username}`
      : '--'
  );

  definirTexto(
    'perfilInfoEmail',
    minhaConta.email || 'Protegido'
  );

  definirTexto(
    'perfilInfoPais',
    minhaConta.pais || 'Não informado'
  );

  definirTexto(
    'perfilContaCriada',
    proprietario
      ? 'Conta administrativa'
      : formatarDataConta(minhaConta.criadoEm)
  );

  definirTexto(
    'perfilPlano',
    minhaLicenca?.plano || 'Sem plano'
  );

  definirTexto(
    'perfilLicencaEstado',
    proprietario
      ? 'Acesso administrativo'
      : minhaLicenca?.ativa
        ? 'Ativa'
        : 'Expirada'
  );

  definirTexto(
    'perfilLicencaAtivada',
    proprietario
      ? 'Ilimitado'
      : formatarDataConta(
          minhaLicenca?.ativadoEm
        )
  );

  definirTexto(
    'perfilLicencaExpira',
    proprietario
      ? 'Sem expiração'
      : formatarDataConta(
          minhaLicenca?.expiraEm
        )
  );

  definirTexto(
    'perfilLicencaDias',
    proprietario
      ? 'Ilimitado'
      : `${Number(
          minhaLicenca?.diasRestantes
        ) || 0} dia(s)`
  );

  const badge = document.getElementById(
    'perfilLicencaBadge'
  );

  if (badge) {
    badge.textContent = proprietario
      ? '👑 OWNER'
      : minhaLicenca?.ativa
        ? '● ATIVA'
        : '● EXPIRADA';

    badge.classList.toggle(
      'inativo',
      !proprietario && !minhaLicenca?.ativa
    );
  }

  const estadoConta = document.getElementById(
    'perfilEstadoConta'
  );

  if (estadoConta) {
    const ativa =
      minhaConta.estado === 'ativo';

    estadoConta.textContent =
      ativa ? '● Ativa' : '● Inativa';

    estadoConta.classList.toggle(
      'inativo',
      !ativa
    );
  }

  const imagem = document.getElementById(
    'perfilAvatarImagem'
  );

  const padrao = document.getElementById(
    'perfilAvatarPadrao'
  );

  if (imagem && padrao) {
    if (minhaConta.avatar) {
      imagem.src = minhaConta.avatar;
      imagem.hidden = false;
      padrao.hidden = true;
    } else {
      imagem.removeAttribute('src');
      imagem.hidden = true;
      padrao.hidden = false;

      padrao.textContent =
        String(minhaConta.nome || 'R')
          .trim()
          .charAt(0)
          .toUpperCase() || 'R';
    }
  }

  const editar = document.getElementById(
    'editarPerfil'
  );

  const alterarAvatar = document.getElementById(
    'alterarAvatar'
  );

  const removerAvatar = document.getElementById(
    'removerAvatar'
  );

  if (proprietario) {
    if (editar) editar.hidden = true;
    if (alterarAvatar) alterarAvatar.hidden = true;
    if (removerAvatar) removerAvatar.hidden = true;
  } else {
    if (editar) editar.hidden = false;
    if (alterarAvatar) alterarAvatar.hidden = false;

    if (removerAvatar) {
      removerAvatar.hidden = !minhaConta.avatar;
    }
  }
}

function abrirPaginaPerfil() {
  const pagina = document.getElementById(
    'paginaPerfil'
  );

  if (!pagina) {
    return;
  }

  pagina.classList.remove('oculto');

  renderizarPaginaPerfil();

  document
    .querySelectorAll('.nav-ravex')
    .forEach(botao => {
      botao.classList.toggle(
        'ativo',
        botao.dataset.pagina === 'perfil'
      );
    });

  pagina.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

document.addEventListener(
  'ravex:conta-atualizada',
  renderizarPaginaPerfil
);


function atualizarBadgeBotsMenu() {
  const badge =
    document.getElementById('badgeBotsMenu');

  if (!badge) {
    return;
  }

  badge.textContent =
    String(Array.isArray(bots) ? bots.length : 0);
}

async function atualizarMenuAdministrativo() {
  const menu =
    document.getElementById('menuAdministracao');

  const badge =
    document.getElementById('badgeUsuariosOnline');

  if (!menu) {
    return;
  }

  const proprietario =
    minhaConta?.tipo === 'proprietario';

  menu.hidden = !proprietario;

  if (!proprietario) {
    if (badge) {
      badge.textContent = '0';
    }

    return;
  }

  try {
    const resposta = await fetch(
      '/api/proprietario/usuarios-online',
      {
        cache: 'no-store'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (resposta.status === 403) {
      menu.hidden = true;
      return;
    }

    if (!resposta.ok) {
      throw new Error(
        `HTTP ${resposta.status}`
      );
    }

    const resultado = await resposta.json();

    if (badge) {
      badge.textContent = String(
        Number(
          resultado.totalUsuariosOnline
        ) || 0
      );
    }
  } catch (erro) {
    console.error(
      'Erro ao atualizar usuários online:',
      erro
    );

    if (badge) {
      badge.textContent = '—';
    }
  }
}

document.addEventListener(
  'ravex:conta-atualizada',
  () => {
    atualizarMenuAdministrativo();
  }
);

setInterval(
  () => {
    if (
      minhaConta?.tipo === 'proprietario'
    ) {
      atualizarMenuAdministrativo();
    }
  },
  30 * 1000
);

async function carregarMinhaConta() {
  try {
    const resposta = await fetch(
      '/api/minha-conta',
      {
        cache: 'no-store'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return null;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    minhaConta = resultado.conta || null;
    minhaLicenca = resultado.licenca || null;

    document.dispatchEvent(
      new CustomEvent(
        'ravex:conta-atualizada',
        {
          detail: {
            conta: minhaConta,
            licenca: minhaLicenca
          }
        }
      )
    );

    return resultado;
  } catch (erro) {
    console.error(
      'Erro ao carregar conta:',
      erro
    );

    return null;
  }
}

async function atualizarStatusSistema() {
  try {
    const resposta = await fetch('/api/status', {
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    document.getElementById('cpu').textContent =
      `⚙️ CPU: ${dados.cpus || '--'} núcleos`;

    document.getElementById('memoria').textContent =
      `🧠 Memória: ${dados.memoria.usadaMB} MB / ${dados.memoria.totalMB} MB`;

    document.getElementById('uptimeHost').textContent =
      `⚡ RAVEX-HOST: ${formatarUptime(dados.uptimeHostSegundos)}`;

    document.getElementById('uptimeSistema').textContent =
      `📱 Sistema: ${formatarUptime(dados.uptimeSistemaSegundos)}`;
  } catch (erro) {
    console.error(
      'Erro ao obter status do sistema:',
      erro
    );
  }
}

function obterBotSelecionado() {
  return bots.find(
    bot => bot.id === idBotSelecionado
  ) || null;
}

function criarBotao(texto, acao, bot, desativado) {
  const botao = document.createElement('button');

  botao.type = 'button';
  botao.textContent = texto;
  botao.disabled = desativado;

  botao.addEventListener('click', async evento => {
    evento.stopPropagation();
    await executarAcao(bot.id, acao);
  });

  return botao;
}

function renderizarBots() {
  const lista = document.getElementById('listaBots');
  const resumo = document.getElementById('resumoBots');

  lista.replaceChildren();

  const online = bots.filter(bot => bot.online).length;

  resumo.textContent =
    `${bots.length} bot(s) cadastrado(s) • ${online} online`;

  if (bots.length === 0) {
    const vazio = document.createElement('p');
    vazio.textContent =
      'Nenhum bot cadastrado. Use “Adicionar Bot”.';
    lista.appendChild(vazio);

    selecionarBot(null);
    atualizarTituloLogs();
    return;
  }

  if (
    !idBotSelecionado ||
    !bots.some(bot => bot.id === idBotSelecionado)
  ) {
    selecionarBot(bots[0].id);
  }

  for (const bot of bots) {
    const cartao = document.createElement('article');
    cartao.className = 'cartao-bot';

    if (bot.id === idBotSelecionado) {
      cartao.classList.add('selecionado');
    }

    cartao.addEventListener('click', () => {
      selecionarBot(bot.id);
      renderizarBots();
      atualizarTituloLogs();
      atualizarLogs();
    });

    const cabecalho = document.createElement('div');
    cabecalho.className = 'bot-cabecalho';

    const info = document.createElement('div');

    const nome = document.createElement('h3');
    nome.textContent = `🤖 ${bot.nome}`;

    const estado = document.createElement('p');
    estado.className = bot.online
      ? 'status-online'
      : 'status-offline';

    estado.textContent = bot.online
      ? `🟢 ONLINE • PID ${bot.pid || '--'}`
      : '🔴 OFFLINE';

    info.append(nome, estado);

    const identificador = document.createElement('small');
    identificador.textContent = `ID: ${bot.id}`;

    cabecalho.append(info, identificador);

    const acoes = document.createElement('div');
    acoes.className = 'acoes-bot';

    acoes.append(
      criarBotao(
        bot.online ? '✅ Online' : '▶ Iniciar',
        'iniciar',
        bot,
        bot.online || acaoEmAndamento
      ),
      criarBotao(
        '⏹ Parar',
        'parar',
        bot,
        !bot.online || acaoEmAndamento
      ),
      criarBotao(
        '🔄 Reiniciar',
        'reiniciar',
        bot,
        acaoEmAndamento
      )
    );

    const botaoRemover =
      document.createElement('button');

    botaoRemover.type = 'button';
    botaoRemover.className = 'botao-remover';
    botaoRemover.textContent = '🗑️ Remover';
    botaoRemover.disabled = acaoEmAndamento;

    botaoRemover.addEventListener(
      'click',
      async evento => {
        evento.stopPropagation();
        await removerBotPainel(bot);
      }
    );

    const botaoConfigurar =
      document.createElement('button');

    botaoConfigurar.type = 'button';
    botaoConfigurar.className = 'botao-configurar';
    botaoConfigurar.textContent = '⚙️ Configurar';
    botaoConfigurar.disabled =
      bot.online || acaoEmAndamento;

    botaoConfigurar.addEventListener(
      'click',
      evento => {
        evento.stopPropagation();
        abrirConfiguracaoBot(bot);
      }
    );

    const possuiGit = Boolean(bot.repositorio);

    const botaoAtualizar =
      document.createElement('button');

    botaoAtualizar.type = 'button';
    botaoAtualizar.className = 'botao-atualizar';
    botaoAtualizar.textContent = '⬇️ Atualizar';

    botaoAtualizar.disabled =
      !possuiGit ||
      bot.online ||
      acaoEmAndamento;

    botaoAtualizar.title = !possuiGit
      ? 'Este bot não possui repositório Git.'
      : bot.online
        ? 'Pare o bot antes de atualizar.'
        : 'Atualizar pelo Git.';

    botaoAtualizar.addEventListener(
      'click',
      async evento => {
        evento.stopPropagation();

        await executarAcao(
          bot.id,
          'atualizar'
        );
      }
    );

    const botaoAtualizarReiniciar =
      document.createElement('button');

    botaoAtualizarReiniciar.type = 'button';
    botaoAtualizarReiniciar.className =
      'botao-atualizar-reiniciar';

    botaoAtualizarReiniciar.textContent =
      '⬇️🔄 Atualizar + Reiniciar';

    botaoAtualizarReiniciar.disabled =
      !possuiGit || acaoEmAndamento;

    botaoAtualizarReiniciar.title =
      !possuiGit
        ? 'Este bot não possui repositório Git.'
        : 'Atualizar pelo Git e reiniciar.';

    botaoAtualizarReiniciar.addEventListener(
      'click',
      async evento => {
        evento.stopPropagation();

        await executarAcao(
          bot.id,
          'atualizar-reiniciar'
        );
      }
    );

    const botaoLogs =
      document.createElement('button');

    botaoLogs.type = 'button';
    botaoLogs.className = 'botao-logs';
    botaoLogs.textContent = '📋 Ver Logs';

    botaoLogs.addEventListener(
      'click',
      async evento => {
        evento.stopPropagation();

        selecionarBot(bot.id);

        renderizarBots();
        atualizarTituloLogs();
        await atualizarLogs();

        const secaoLogs =
          document.getElementById('secaoLogs');

        if (secaoLogs) {
          secaoLogs.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    );

    acoes.append(
      botaoLogs,
      botaoConfigurar,
      botaoAtualizar,
      botaoAtualizarReiniciar,
      botaoRemover
    );

    cartao.append(cabecalho, acoes);
    lista.appendChild(cartao);
  }

  atualizarTituloLogs();
}

async function carregarBots() {
  try {
    const resposta = await fetch('/api/bots', {
      cache: 'no-store'
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const resultado = await resposta.json();

    bots = Array.isArray(resultado.bots)
      ? resultado.bots
      : [];

    renderizarBots();
    atualizarBadgeBotsMenu();
  } catch (erro) {
    console.error('Erro ao carregar bots:', erro);

    const resumo = document.getElementById('resumoBots');

    resumo.textContent =
      '⚠️ Não foi possível carregar os bots.';
  }
}

const modalConfigurar =
  document.getElementById('modalConfigurarBot');

const fecharConfigurar =
  document.getElementById('fecharConfigurarBot');

const formConfigurar =
  document.getElementById('formConfigurarBot');

const mensagemConfigurar =
  document.getElementById('mensagemConfigurarBot');

let idBotConfigurando = null;

function definirModalConfigurar(aberto) {
  modalConfigurar.classList.toggle(
    'oculto',
    !aberto
  );

  modalConfigurar.setAttribute(
    'aria-hidden',
    String(!aberto)
  );

  if (!aberto) {
    idBotConfigurando = null;
  }
}

function abrirConfiguracaoBot(bot) {
  if (bot.online) {
    alert(
      'Pare o bot antes de alterar a configuração.'
    );
    return;
  }

  idBotConfigurando = bot.id;

  document.getElementById(
    'configNomeBot'
  ).value = bot.nome || '';

  document.getElementById(
    'configDiretorioBot'
  ).value = bot.diretorio || '';

  document.getElementById(
    'configArquivoInicial'
  ).value = bot.arquivoInicial || 'iniciar.js';

  document.getElementById(
    'configRepositorioBot'
  ).value = bot.repositorio || '';

  document.getElementById(
    'configBranchBot'
  ).value = bot.branch || 'main';

  mensagemConfigurar.textContent = '';
  mensagemConfigurar.className = '';

  definirModalConfigurar(true);

  document.getElementById(
    'configNomeBot'
  ).focus();
}

fecharConfigurar.addEventListener(
  'click',
  () => definirModalConfigurar(false)
);

modalConfigurar.addEventListener(
  'click',
  evento => {
    if (evento.target === modalConfigurar) {
      definirModalConfigurar(false);
    }
  }
);

formConfigurar.addEventListener(
  'submit',
  async evento => {
    evento.preventDefault();

    if (!idBotConfigurando) {
      return;
    }

    const botao =
      document.getElementById(
        'confirmarConfigurarBot'
      );

    const corpo = {
      nome: document.getElementById(
        'configNomeBot'
      ).value.trim(),

      arquivoInicial: document.getElementById(
        'configArquivoInicial'
      ).value.trim(),

      repositorio: document.getElementById(
        'configRepositorioBot'
      ).value.trim(),

      branch: document.getElementById(
        'configBranchBot'
      ).value.trim()
    };

    botao.disabled = true;
    botao.textContent = '⏳ Salvando...';

    mensagemConfigurar.className = '';
    mensagemConfigurar.textContent =
      'Salvando configuração...';

    try {
      const resposta = await fetch(
        `/api/bots/${encodeURIComponent(
          idBotConfigurando
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(corpo)
        }
      );

      if (verificarSessaoExpirada(resposta)) {
        return;
      }

      const resultado =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          `HTTP ${resposta.status}`
        );
      }

      mensagemConfigurar.className =
        'sucesso';

      mensagemConfigurar.textContent =
        '✅ Configuração salva com sucesso.';

      await carregarBots();

      setTimeout(() => {
        definirModalConfigurar(false);
      }, 700);
    } catch (erro) {
      mensagemConfigurar.className =
        'erro';

      mensagemConfigurar.textContent =
        `❌ ${erro.message}`;

      console.error(
        'Erro ao configurar bot:',
        erro
      );
    } finally {
      botao.disabled = false;
      botao.textContent =
        '💾 Salvar configuração';
    }
  }
);

async function removerBotPainel(bot) {
  if (acaoEmAndamento) {
    return;
  }

  const confirmar = window.confirm(
    `Remover "${bot.nome}" do RAVEX-HOST?\n\n` +
    'Se estiver online, o bot será encerrado.\n' +
    'Os arquivos da pasta NÃO serão apagados.'
  );

  if (!confirmar) {
    return;
  }

  acaoEmAndamento = true;
  renderizarBots();

  try {
    const resposta = await fetch(
      `/api/bots/${encodeURIComponent(bot.id)}`,
      {
        method: 'DELETE'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    if (idBotSelecionado === bot.id) {
      selecionarBot(null);
    }

    await carregarBots();
    await atualizarLogs();

    window.alert(
      `${bot.nome} foi removido do RAVEX-HOST.\n\n` +
      'Os arquivos originais foram preservados.'
    );
  } catch (erro) {
    console.error(
      'Erro ao remover bot:',
      erro
    );

    window.alert(
      `Não foi possível remover o bot:\n${erro.message}`
    );
  } finally {
    acaoEmAndamento = false;
    await carregarBots();
  }
}

async function executarAcao(idBot, acao) {
  if (acaoEmAndamento) {
    return;
  }

  selecionarBot(idBot);

  acaoEmAndamento = true;
  renderizarBots();
  atualizarTituloLogs();

  try {
    const resposta = await fetch(
      `/api/bots/${encodeURIComponent(idBot)}/${acao}`,
      {
        method: 'POST',
        cache: 'no-store'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }
  } catch (erro) {
    console.error(
      `Erro ao executar ${acao}:`,
      erro
    );

    alert(erro.message);
  } finally {
    acaoEmAndamento = false;
    await carregarBots();
    await atualizarLogs();
  }
}

function atualizarTituloLogs() {
  const titulo =
    document.getElementById('botLogsSelecionado');

  const bot = obterBotSelecionado();

  titulo.textContent = bot
    ? `Bot selecionado: ${bot.nome}`
    : 'Selecione um bot.';
}

async function atualizarLogs() {
  const elemento = document.getElementById('logsBot');
  const bot = obterBotSelecionado();

  if (!bot) {
    elemento.textContent =
      'Nenhum bot selecionado.';
    return;
  }

  try {
    const resposta = await fetch(
      `/api/bots/${encodeURIComponent(bot.id)}/logs`,
      {
        cache: 'no-store'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    const resultado = await resposta.json();

    const logs = Array.isArray(resultado.logs)
      ? resultado.logs
      : [];

    if (logs.length === 0) {
      elemento.textContent =
        'Nenhum log disponível.';
      return;
    }

    elemento.replaceChildren();

    for (const log of logs.slice(-100)) {
      const linha = document.createElement('div');

      linha.className =
        log.tipo === 'stderr'
          ? 'linha-log log-erro'
          : 'linha-log log-normal';

      const data = new Date(log.timestamp);

      const horario = Number.isNaN(data.getTime())
        ? '--:--:--'
        : data.toLocaleTimeString();

      linha.textContent =
        `[${horario}] ${log.mensagem}`;

      elemento.appendChild(linha);
    }

    elemento.scrollTop = elemento.scrollHeight;
  } catch (erro) {
    elemento.textContent =
      '⚠️ Não foi possível carregar os logs.';

    console.error(
      'Erro ao carregar logs:',
      erro
    );
  }
}

const modal =
  document.getElementById('modalAdicionarBot');

const abrirModal =
  document.getElementById('abrirAdicionarBot');

const fecharModal =
  document.getElementById('fecharAdicionarBot');

const formulario =
  document.getElementById('formAdicionarBot');

const mensagemFormulario =
  document.getElementById('mensagemAdicionarBot');

const tipoBot =
  document.getElementById('tipoBot');

const camposGit =
  document.getElementById('camposGit');

const camposDiretorio =
  document.getElementById('camposDiretorio');

function atualizarMetodoAdicionar() {
  const porDiretorio =
    tipoBot.value === 'diretorio';

  const subtitulo =
    document.getElementById(
      'subtituloAdicionarBot'
    );

  if (subtitulo) {
    subtitulo.textContent = porDiretorio
      ? 'Cadastrar uma pasta existente sem mover ou apagar os arquivos.'
      : 'Instalar através de um repositório Git.';
  }

  camposGit.classList.toggle(
    'oculto',
    porDiretorio
  );

  camposDiretorio.classList.toggle(
    'oculto',
    !porDiretorio
  );

  document.getElementById(
    'repositorioBot'
  ).required = !porDiretorio;

  document.getElementById(
    'branchBot'
  ).required = !porDiretorio;

  document.getElementById(
    'diretorioBot'
  ).required = porDiretorio;
}

tipoBot.addEventListener(
  'change',
  atualizarMetodoAdicionar
);

atualizarMetodoAdicionar();

function definirModal(aberto) {
  modal.classList.toggle('oculto', !aberto);
  modal.setAttribute(
    'aria-hidden',
    String(!aberto)
  );

  if (aberto) {
    document.getElementById('nomeBot').focus();
  }
}

abrirModal.addEventListener('click', () => {
  mensagemFormulario.textContent = '';
  mensagemFormulario.className = '';
  definirModal(true);
});

fecharModal.addEventListener('click', () => {
  definirModal(false);
});

modal.addEventListener('click', evento => {
  if (evento.target === modal) {
    definirModal(false);
  }
});

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();

  const botao =
    document.getElementById('confirmarAdicionarBot');

  const tipo =
    tipoBot.value;

  const nome =
    document.getElementById('nomeBot').value.trim();

  const repositorio =
    document.getElementById('repositorioBot').value.trim();

  const branch =
    document.getElementById('branchBot').value.trim();

  const diretorio =
    document.getElementById('diretorioBot').value.trim();

  botao.disabled = true;

  botao.textContent =
    tipo === 'git'
      ? '⏳ Instalando...'
      : '⏳ Adicionando...';

  mensagemFormulario.className = '';

  mensagemFormulario.textContent =
    tipo === 'git'
      ? 'Clonando e instalando dependências...'
      : 'Validando a pasta do bot...';

  try {
    const corpo = {
      tipo,
      nome
    };

    if (tipo === 'git') {
      corpo.repositorio = repositorio;
      corpo.branch = branch;
    } else {
      corpo.diretorio = diretorio;
    }

    const resposta = await fetch('/api/bots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(corpo)
    });

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    selecionarBot(resultado.bot.id);

    mensagemFormulario.className = 'sucesso';
    mensagemFormulario.textContent =
      '✅ Bot adicionado com sucesso.';

    formulario.reset();

    document.getElementById(
      'branchBot'
    ).value = 'main';

    atualizarMetodoAdicionar();

    await carregarBots();
    await atualizarLogs();

    setTimeout(() => {
      definirModal(false);
    }, 700);
  } catch (erro) {
    mensagemFormulario.className = 'erro';

    mensagemFormulario.textContent =
      `❌ ${erro.message}`;

    console.error(
      'Erro ao adicionar bot:',
      erro
    );
  } finally {
    botao.disabled = false;
    botao.textContent = '📥 Adicionar Bot';
  }
});

function mostrarMensagemPerfil(
  texto,
  tipo = ''
) {
  const elemento = document.getElementById(
    'mensagemPerfil'
  );

  if (!elemento) return;

  elemento.className =
    `mensagem-perfil ${tipo}`.trim();

  elemento.textContent = texto;
}

function definirModalPerfil(aberto) {
  const modal = document.getElementById(
    'modalEditarPerfil'
  );

  if (!modal) return;

  modal.classList.toggle('oculto', !aberto);
  modal.setAttribute(
    'aria-hidden',
    String(!aberto)
  );

  if (aberto && minhaConta) {
    document.getElementById(
      'editarNome'
    ).value = minhaConta.nome || '';

    document.getElementById(
      'editarUsername'
    ).value = minhaConta.username || '';

    document.getElementById(
      'editarBio'
    ).value = minhaConta.bio || '';

    document.getElementById(
      'editarPais'
    ).value = minhaConta.pais || '';

    document.getElementById(
      'editarNome'
    ).focus();
  }
}

async function salvarEdicaoPerfil(evento) {
  evento.preventDefault();

  if (
    !minhaConta ||
    minhaConta.tipo === 'proprietario'
  ) {
    return;
  }

  const botao = document.getElementById(
    'salvarPerfil'
  );

  const mensagem = document.getElementById(
    'mensagemEditarPerfil'
  );

  botao.disabled = true;
  botao.textContent = '⏳ Salvando...';

  if (mensagem) {
    mensagem.className = '';
    mensagem.textContent = '';
  }

  try {
    const resposta = await fetch(
      '/api/minha-conta',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: document
            .getElementById('editarNome')
            .value
            .trim(),

          username: document
            .getElementById('editarUsername')
            .value
            .trim(),

          bio: document
            .getElementById('editarBio')
            .value
            .trim(),

          pais: document
            .getElementById('editarPais')
            .value
            .trim()
        })
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    await carregarMinhaConta();

    definirModalPerfil(false);

    mostrarMensagemPerfil(
      '✅ Perfil atualizado com sucesso.',
      'sucesso'
    );
  } catch (erro) {
    if (mensagem) {
      mensagem.className = 'erro';
      mensagem.textContent =
        `❌ ${erro.message}`;
    }
  } finally {
    botao.disabled = false;
    botao.textContent = '💾 Salvar alterações';
  }
}

async function enviarAvatar(arquivo) {
  if (
    !arquivo ||
    !minhaConta ||
    minhaConta.tipo === 'proprietario'
  ) {
    return;
  }

  const limite = 2 * 1024 * 1024;

  if (arquivo.size > limite) {
    mostrarMensagemPerfil(
      '❌ A imagem pode ter no máximo 2 MB.',
      'erro'
    );
    return;
  }

  if (
    ![
      'image/png',
      'image/jpeg',
      'image/webp'
    ].includes(arquivo.type)
  ) {
    mostrarMensagemPerfil(
      '❌ Use uma imagem PNG, JPEG ou WebP.',
      'erro'
    );
    return;
  }

  const botao = document.getElementById(
    'alterarAvatar'
  );

  botao.disabled = true;
  botao.textContent = '⏳ Enviando...';

  try {
    const resposta = await fetch(
      '/api/minha-conta/avatar',
      {
        method: 'PUT',
        headers: {
          'Content-Type':
            arquivo.type ||
            'application/octet-stream'
        },
        body: arquivo
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    await carregarMinhaConta();

    mostrarMensagemPerfil(
      '✅ Foto de perfil atualizada.',
      'sucesso'
    );
  } catch (erro) {
    mostrarMensagemPerfil(
      `❌ ${erro.message}`,
      'erro'
    );
  } finally {
    botao.disabled = false;
    botao.textContent = '📷 Alterar foto';

    const input = document.getElementById(
      'perfilAvatarArquivo'
    );

    if (input) {
      input.value = '';
    }
  }
}

async function removerFotoPerfil() {
  if (
    !minhaConta?.avatar ||
    minhaConta.tipo === 'proprietario'
  ) {
    return;
  }

  const confirmar = window.confirm(
    'Deseja remover a sua foto de perfil?'
  );

  if (!confirmar) return;

  const botao = document.getElementById(
    'removerAvatar'
  );

  botao.disabled = true;
  botao.textContent = '⏳ Removendo...';

  try {
    const resposta = await fetch(
      '/api/minha-conta/avatar',
      {
        method: 'DELETE'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        `HTTP ${resposta.status}`
      );
    }

    await carregarMinhaConta();

    mostrarMensagemPerfil(
      '✅ Foto de perfil removida.',
      'sucesso'
    );
  } catch (erro) {
    mostrarMensagemPerfil(
      `❌ ${erro.message}`,
      'erro'
    );
  } finally {
    botao.disabled = false;
    botao.textContent = '🗑️ Remover';
  }
}

const botaoEditarPerfil =
  document.getElementById('editarPerfil');

const botaoFecharEditarPerfil =
  document.getElementById('fecharEditarPerfil');

const formularioEditarPerfil =
  document.getElementById('formEditarPerfil');

const botaoAlterarAvatar =
  document.getElementById('alterarAvatar');

const inputAvatar =
  document.getElementById('perfilAvatarArquivo');

const botaoRemoverAvatar =
  document.getElementById('removerAvatar');

if (botaoEditarPerfil) {
  botaoEditarPerfil.addEventListener(
    'click',
    () => definirModalPerfil(true)
  );
}

if (botaoFecharEditarPerfil) {
  botaoFecharEditarPerfil.addEventListener(
    'click',
    () => definirModalPerfil(false)
  );
}

if (formularioEditarPerfil) {
  formularioEditarPerfil.addEventListener(
    'submit',
    salvarEdicaoPerfil
  );
}

if (botaoAlterarAvatar && inputAvatar) {
  botaoAlterarAvatar.addEventListener(
    'click',
    () => inputAvatar.click()
  );

  inputAvatar.addEventListener(
    'change',
    () => {
      const arquivo = inputAvatar.files?.[0];

      if (arquivo) {
        enviarAvatar(arquivo);
      }
    }
  );
}

if (botaoRemoverAvatar) {
  botaoRemoverAvatar.addEventListener(
    'click',
    removerFotoPerfil
  );
}

const botaoAbrirPerfil =
  document.getElementById('abrirPerfil');

if (botaoAbrirPerfil) {
  botaoAbrirPerfil.addEventListener(
    'click',
    abrirPaginaPerfil
  );
}

/* =========================================================
   RAVEX-HOST — NAVEGAÇÃO + HISTÓRICO
   ========================================================= */

const botaoVoltarPainel =
  document.getElementById('voltarPainel');

const botaoAvancarPainel =
  document.getElementById('avancarPainel');

const historicoPainel = ['inicio'];
let indiceHistoricoPainel = 0;

function atualizarBotoesHistorico() {
  if (botaoVoltarPainel) {
    botaoVoltarPainel.disabled =
      indiceHistoricoPainel <= 0;
  }

  if (botaoAvancarPainel) {
    botaoAvancarPainel.disabled =
      indiceHistoricoPainel >=
      historicoPainel.length - 1;
  }
}

function atualizarPaginaAtiva(pagina) {
  document
    .querySelectorAll('.nav-ravex')
    .forEach(botao => {
      botao.classList.toggle(
        'ativo',
        botao.dataset.pagina === pagina
      );
    });

  document
    .querySelectorAll('[data-menu-pagina]')
    .forEach(botao => {
      botao.classList.toggle(
        'ativo',
        botao.dataset.menuPagina === pagina
      );
    });
}


function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatarUltimaAtividade(valor) {
  if (!valor) {
    return 'Agora';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return 'Agora';
  }

  return data.toLocaleString();
}

async function carregarUsuariosOnline() {
  const lista =
    document.getElementById(
      'listaUsuariosOnline'
    );

  const resumo =
    document.getElementById(
      'resumoUsuariosOnline'
    );

  const total =
    document.getElementById(
      'totalUsuariosOnlinePagina'
    );

  const totalBots =
    document.getElementById(
      'totalBotsOnlinePagina'
    );

  const estadoProprietario =
    document.getElementById(
      'estadoProprietarioOnline'
    );

  if (minhaConta?.tipo !== 'proprietario') {
    if (lista) {
      lista.innerHTML =
        '<p>⛔ Acesso restrito ao proprietário.</p>';
    }

    return;
  }

  if (resumo) {
    resumo.textContent =
      'A atualizar dados...';
  }

  try {
    const resposta = await fetch(
      '/api/proprietario/usuarios-online',
      {
        cache: 'no-store'
      }
    );

    if (verificarSessaoExpirada(resposta)) {
      return;
    }

    if (resposta.status === 403) {
      throw new Error(
        'Acesso administrativo negado.'
      );
    }

    if (!resposta.ok) {
      throw new Error(
        `HTTP ${resposta.status}`
      );
    }

    const resultado =
      await resposta.json();

    const usuarios =
      Array.isArray(resultado.usuarios)
        ? resultado.usuarios
        : [];

    const numeroUsuarios =
      Number(
        resultado.totalUsuariosOnline
      ) || 0;

    const numeroBots =
      usuarios.reduce(
        (soma, usuario) =>
          soma +
          (Number(usuario.botsOnline) || 0),
        0
      );

    if (total) {
      total.textContent =
        String(numeroUsuarios);
    }

    if (totalBots) {
      totalBots.textContent =
        String(numeroBots);
    }

    if (estadoProprietario) {
      estadoProprietario.textContent =
        resultado.proprietarioOnline
          ? 'ONLINE'
          : 'OFFLINE';
    }

    const badge =
      document.getElementById(
        'badgeUsuariosOnline'
      );

    if (badge) {
      badge.textContent =
        String(numeroUsuarios);
    }

    if (resumo) {
      resumo.textContent =
        `${numeroUsuarios} utilizador(es) online`;
    }

    if (!lista) {
      return;
    }

    if (usuarios.length === 0) {
      lista.innerHTML =
        '<p>Nenhum utilizador online neste momento.</p>';

      return;
    }

    lista.innerHTML = usuarios
      .map(usuario => {
        const nome =
          escaparHtml(
            usuario.nome ||
            usuario.username ||
            'Utilizador'
          );

        const username =
          escaparHtml(
            usuario.username || '—'
          );

        const plano =
          escaparHtml(
            usuario.licenca?.plano ||
            usuario.plano ||
            '—'
          );

        const estado =
          escaparHtml(
            usuario.estado || 'online'
          );

        const botsOnline =
          Number(usuario.botsOnline) || 0;

        const atividade =
          escaparHtml(
            formatarUltimaAtividade(
              usuario.ultimaAtividade
            )
          );

        return `
          <article class="usuario-online-card">
            <div class="usuario-online-topo">
              <div>
                <strong>${nome}</strong>
                <span>@${username}</span>
              </div>

              <span class="usuario-online-status">
                ● ONLINE
              </span>
            </div>

            <div class="usuario-online-dados">
              <span>
                Plano
                <strong>${plano}</strong>
              </span>

              <span>
                Bots online
                <strong>${botsOnline}</strong>
              </span>

              <span>
                Estado
                <strong>${estado}</strong>
              </span>
            </div>

            <small>
              Última atividade:
              ${atividade}
            </small>
          </article>
        `;
      })
      .join('');
  } catch (erro) {
    console.error(
      'Erro ao carregar usuários online:',
      erro
    );

    if (resumo) {
      resumo.textContent =
        'Não foi possível atualizar os dados.';
    }

    if (lista) {
      lista.innerHTML =
        '<p>⚠️ Dados temporariamente indisponíveis.</p>';
    }
  }
}

function mostrarPaginaPainel(pagina) {
    const paginas =
      document.querySelectorAll(
        '[data-pagina-conteudo]'
      );

    paginas.forEach(elemento => {
      elemento.classList.add('oculto');
      elemento.classList.remove('ativa');
    });

    const mostrar = (...nomes) => {
      nomes.forEach(nome => {
        const elemento =
          document.querySelector(
            `[data-pagina-conteudo="${nome}"]`
          );

        if (!elemento) {
          return;
        }

        elemento.classList.remove('oculto');
        elemento.classList.add('ativa');
      });
    };

    switch (pagina) {
      case 'inicio':
        mostrar('inicio', 'dashboard');
        break;

      case 'perfil':
        mostrar('perfil');
        abrirPaginaPerfil();
        break;

      case 'bots':
        mostrar('bots', 'logs');
        break;

      case 'sistema':
        mostrar('sistema');
        break;

            case 'usuarios-online':
        if (
          minhaConta?.tipo !== 'proprietario'
        ) {
          mostrar('inicio', 'dashboard');
          pagina = 'inicio';
          break;
        }

        mostrar('usuarios-online');
        carregarUsuariosOnline();
        break;

default:
        mostrar('inicio', 'dashboard');
        pagina = 'inicio';
        break;
    }

    atualizarPaginaAtiva(pagina);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function navegarPainel(
  pagina,
  { registrar = true } = {}
) {
  if (!pagina) {
    return;
  }

  if (registrar) {
    const paginaAtual =
      historicoPainel[indiceHistoricoPainel];

    if (paginaAtual !== pagina) {
      historicoPainel.splice(
        indiceHistoricoPainel + 1
      );

      historicoPainel.push(pagina);
      indiceHistoricoPainel =
        historicoPainel.length - 1;
    }
  }

  mostrarPaginaPainel(pagina);
  atualizarBotoesHistorico();
}

document
  .querySelectorAll('.nav-ravex')
  .forEach(botao => {
    botao.addEventListener('click', () => {
      navegarPainel(botao.dataset.pagina);
    });
  });

if (botaoAbrirPerfil) {
  /*
   * Substitui o comportamento simples do botão
   * pelo histórico do painel sem remover o
   * listener antigo, que continua seguro.
   */
  botaoAbrirPerfil.addEventListener(
    'click',
    () => {
      navegarPainel('perfil');
    }
  );
}

botaoVoltarPainel?.addEventListener(
  'click',
  () => {
    if (indiceHistoricoPainel <= 0) {
      return;
    }

    indiceHistoricoPainel--;

    navegarPainel(
      historicoPainel[indiceHistoricoPainel],
      { registrar: false }
    );
  }
);

botaoAvancarPainel?.addEventListener(
  'click',
  () => {
    if (
      indiceHistoricoPainel >=
      historicoPainel.length - 1
    ) {
      return;
    }

    indiceHistoricoPainel++;

    navegarPainel(
      historicoPainel[indiceHistoricoPainel],
      { registrar: false }
    );
  }
);

atualizarPaginaAtiva('inicio');
atualizarBotoesHistorico();


/* =========================================================
   RAVEX-HOST — MENU LATERAL
   ========================================================= */

const botaoAbrirMenuPainel =
  document.getElementById('abrirMenuPainel');

const botaoFecharMenuPainel =
  document.getElementById('fecharMenuPainel');

const menuLateralRavex =
  document.getElementById('menuLateralRavex');

const overlayMenuRavex =
  document.getElementById('overlayMenuRavex');

function abrirMenuRavex() {
  if (!menuLateralRavex || !overlayMenuRavex) {
    return;
  }

  overlayMenuRavex.hidden = false;

  requestAnimationFrame(() => {
    menuLateralRavex.classList.add('aberto');
  });

  menuLateralRavex.setAttribute(
    'aria-hidden',
    'false'
  );

  botaoAbrirMenuPainel?.setAttribute(
    'aria-expanded',
    'true'
  );

  document.body.classList.add(
    'menu-ravex-aberto'
  );

  botaoFecharMenuPainel?.focus();
}

function fecharMenuRavex({
  devolverFoco = true
} = {}) {
  if (!menuLateralRavex || !overlayMenuRavex) {
    return;
  }

  menuLateralRavex.classList.remove('aberto');

  menuLateralRavex.setAttribute(
    'aria-hidden',
    'true'
  );

  botaoAbrirMenuPainel?.setAttribute(
    'aria-expanded',
    'false'
  );

  document.body.classList.remove(
    'menu-ravex-aberto'
  );

  window.setTimeout(() => {
    if (
      !menuLateralRavex.classList.contains(
        'aberto'
      )
    ) {
      overlayMenuRavex.hidden = true;
    }
  }, 250);

  if (devolverFoco) {
    botaoAbrirMenuPainel?.focus();
  }
}

botaoAbrirMenuPainel?.addEventListener(
  'click',
  abrirMenuRavex
);

botaoFecharMenuPainel?.addEventListener(
  'click',
  () => fecharMenuRavex()
);

overlayMenuRavex?.addEventListener(
  'click',
  () => fecharMenuRavex()
);

document.addEventListener('keydown', evento => {
  if (
    evento.key === 'Escape' &&
    menuLateralRavex?.classList.contains(
      'aberto'
    )
  ) {
    fecharMenuRavex();
  }
});


const botaoSair =
  document.getElementById('sairPainel');

botaoSair.addEventListener('click', async () => {
  const confirmarSaida = window.confirm(
    'Tens a certeza de que pretendes sair da tua conta?'
  );

  if (!confirmarSaida) {
    return;
  }

  botaoSair.disabled = true;
  botaoSair.textContent = '⏳ Saindo...';

  try {
    const resposta = await fetch('/api/logout', {
      method: 'POST',
      cache: 'no-store'
    });

    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }

    window.location.replace('/login');
  } catch (erro) {
    console.error('Erro ao sair:', erro);
    alert('Não foi possível sair do painel.');

    botaoSair.disabled = false;
    botaoSair.textContent = '🚪 Sair';
  }
});

async function inicializarPainel() {
  await carregarMinhaConta();

  atualizarStatusSistema();

  await carregarBots();
  await atualizarLogs();
}

inicializarPainel();

setInterval(atualizarStatusSistema, 5000);
setInterval(carregarBots, 5000);
setInterval(atualizarLogs, 3000);


const botaoAtualizarUsuariosOnline =
  document.getElementById(
    'atualizarUsuariosOnline'
  );

botaoAtualizarUsuariosOnline
  ?.addEventListener(
    'click',
    carregarUsuariosOnline
  );


// ======================================================
// RAVEX-HOST - PRESENÇA DO PAINEL
// ======================================================

async function enviarPresencaRavex() {
  try {
    const resposta = await fetch(
      '/api/presenca',
      {
        method: 'GET',
        cache: 'no-store'
      }
    );

    if (resposta.status === 401) {
      if (
        typeof verificarSessaoExpirada ===
        'function'
      ) {
        verificarSessaoExpirada(resposta);
      }
    }
  } catch (erro) {
    console.debug(
      'Heartbeat temporariamente indisponível.'
    );
  }
}

enviarPresencaRavex();

setInterval(
  enviarPresencaRavex,
  30 * 1000
);


// ======================================================
// RAVEX-HOST - PRESENÇA DO PAINEL
// ======================================================

async function enviarPresencaRavex() {
  try {
    const resposta = await fetch(
      '/api/presenca',
      {
        method: 'GET',
        cache: 'no-store'
      }
    );

    if (resposta.status === 401) {
      if (
        typeof verificarSessaoExpirada ===
        'function'
      ) {
        verificarSessaoExpirada(resposta);
      }
    }
  } catch (erro) {
    console.debug(
      'Heartbeat temporariamente indisponível.'
    );
  }
}

enviarPresencaRavex();

setInterval(
  enviarPresencaRavex,
  30 * 1000
);


// ======================================================
// RAVEX-HOST - LIGAÇÃO FINAL DO MENU
// ======================================================

function configurarMenuFinalRavex() {
  const proprietario =
    minhaConta?.tipo === 'proprietario';

  const configuracoes = [
    [
      'menuRelatarProblema',
      'relatar-problema',
      true
    ],
    [
      'menuPesquisar',
      'pesquisar',
      proprietario
    ],
    [
      'menuUsuariosOnline',
      'usuarios-online',
      proprietario
    ],
    [
      'menuClientes',
      'clientes-admin',
      proprietario
    ],
    [
      'menuLicencasAdmin',
      'licencas-admin',
      proprietario
    ],
    [
      'menuTicketsAdmin',
      'tickets-admin',
      proprietario
    ]
  ];

  for (
    const [id, pagina, mostrar]
    of configuracoes
  ) {
    const elemento =
      document.getElementById(id);

    if (!elemento) continue;

    elemento.dataset.menuPagina =
      pagina;

    elemento.hidden = !mostrar;
  }

  const grupoAdmin =
    document.getElementById(
      'menuAdministracao'
    );

  if (grupoAdmin) {
    grupoAdmin.hidden =
      !proprietario;
  }

  /*
   * O item Bots do utilizador continua sendo
   * a gestão dos próprios bots.
   *
   * Para o proprietário acrescentamos acesso
   * à visão global sem substituir essa página.
   */
  let botAdmin =
    document.getElementById(
      'menuBotsHospedadosAdmin'
    );

  if (
    proprietario &&
    !botAdmin &&
    grupoAdmin
  ) {
    botAdmin =
      document.createElement('button');

    botAdmin.id =
      'menuBotsHospedadosAdmin';

    botAdmin.type =
      'button';

    botAdmin.className =
      'menu-item-ravex';

    botAdmin.dataset.menuPagina =
      'bots-admin';

    botAdmin.innerHTML = `
      <span class="menu-item-icone">
        🤖
      </span>

      <span class="menu-item-texto">
        Bots hospedados
      </span>

      <span class="menu-item-seta">
        ›
      </span>
    `;

    grupoAdmin.appendChild(botAdmin);
  }

  if (botAdmin) {
    botAdmin.hidden =
      !proprietario;
  }

  document
    .querySelectorAll(
      '[data-menu-pagina]'
    )
    .forEach((item) => {
      if (
        item.dataset.ravexLigado ===
        '1'
      ) {
        return;
      }

      item.dataset.ravexLigado =
        '1';

      item.addEventListener(
        'click',
        () => {
          const pagina =
            item.dataset.menuPagina;

          if (!pagina) return;

          if (
            typeof navegarPainel ===
            'function'
          ) {
            navegarPainel(pagina);
          } else if (
            typeof mostrarPaginaPainel ===
            'function'
          ) {
            mostrarPaginaPainel(pagina);
          }

          if (
            typeof fecharMenuRavex ===
            'function'
          ) {
            fecharMenuRavex();
          }
        }
      );
    });
}

document.addEventListener(
  'ravex:conta-atualizada',
  configurarMenuFinalRavex
);

setTimeout(
  configurarMenuFinalRavex,
  500
);


/* =========================================================
   RAVEX-HOST — DESTINOS REAIS DO MENU
   ========================================================= */

function ravexEscaparHtml(valor = '') {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ravexObterAreaPaginas() {
  return (
    document.querySelector('main') ||
    document.querySelector('.conteudo-principal') ||
    document.body
  );
}

function ravexCriarDestinoMenu(nome, titulo, descricao) {
  let pagina = document.querySelector(
    `[data-pagina-conteudo="${nome}"]`
  );

  if (pagina) return pagina;

  pagina = document.createElement('section');
  pagina.className = 'oculto ravex-pagina-menu';
  pagina.dataset.paginaConteudo = nome;

  pagina.innerHTML = `
    <div class="ravex-destino-cabecalho">
      <div>
        <small>RAVEX-HOST</small>
        <h2>${ravexEscaparHtml(titulo)}</h2>
        <p>${ravexEscaparHtml(descricao)}</p>
      </div>
    </div>

    <div
      class="ravex-destino-conteudo"
      data-ravex-destino="${ravexEscaparHtml(nome)}"
    ></div>
  `;

  ravexObterAreaPaginas().appendChild(pagina);

  return pagina;
}

function ravexPrepararDestinosMenu() {
  const destinos = [
    [
      'apis',
      'APIs',
      'Gere as APIs da tua conta RAVEX-HOST.'
    ],
    [
      'loja',
      'Loja RAVEX',
      'Planos, serviços e recursos da RAVEX-HOST.'
    ],
    [
      'licenca',
      'Licença',
      'Consulta o estado e os dados da tua licença.'
    ],
    [
      'suporte',
      'Suporte e Ajuda',
      'Obtém ajuda e acompanha os teus pedidos de suporte.'
    ],
    [
      'novidades',
      'Novidades',
      'Acompanha os avisos e as atualizações da RAVEX-HOST.'
    ],
    [
      'notificacoes',
      'Notificações',
      'Consulta os avisos importantes da tua conta.'
    ],
    [
      'seguranca',
      'Segurança',
      'Consulta e gere as opções de segurança da tua conta.'
    ],
    [
      'configuracoes',
      'Configurações',
      'Personaliza as definições da tua conta RAVEX-HOST.'
    ],
    [
      'relatar-problema',
      'Relatar problema',
      'Envia um problema para a equipa RAVEX-HOST.'
    ],
    [
      'pesquisar',
      'Pesquisar',
      'Pesquisa clientes, bots e tickets da plataforma.'
    ],
    [
      'clientes-admin',
      'Clientes',
      'Administração dos clientes cadastrados.'
    ],
    [
      'bots-admin',
      'Bots hospedados',
      'Administração dos bots hospedados na plataforma.'
    ],
    [
      'licencas-admin',
      'Licenças e códigos',
      'Administração das licenças e códigos de acesso.'
    ],
    [
      'tickets-admin',
      'Tickets',
      'Consulta e administração dos pedidos de suporte.'
    ],
    [
      'atividades-admin',
      'Atividades',
      'Histórico administrativo da plataforma.'
    ]
  ];

  destinos.forEach(([nome, titulo, descricao]) => {
    ravexCriarDestinoMenu(nome, titulo, descricao);
  });
}


/*
 * Esta versão passa a ser a fonte única para mostrar páginas.
 */
mostrarPaginaPainel = function (pagina) {
  ravexPrepararDestinosMenu();

  const somenteProprietario = new Set([
    'usuarios-online',
    'pesquisar',
    'clientes-admin',
    'bots-admin',
    'licencas-admin',
    'tickets-admin',
    'atividades-admin'
  ]);

  if (
    somenteProprietario.has(pagina) &&
    minhaConta?.tipo !== 'proprietario'
  ) {
    alert(
      'Esta área está disponível apenas para o proprietário.'
    );

    pagina = 'inicio';
  }

  document
    .querySelectorAll('[data-pagina-conteudo]')
    .forEach(elemento => {
      elemento.classList.add('oculto');
      elemento.classList.remove('ativa');
    });

  const mostrar = (...nomes) => {
    nomes.forEach(nome => {
      const elemento = document.querySelector(
        `[data-pagina-conteudo="${nome}"]`
      );

      if (!elemento) return;

      elemento.classList.remove('oculto');
      elemento.classList.add('ativa');
    });
  };

  switch (pagina) {
    case 'inicio':
      mostrar('inicio', 'dashboard');
      break;

    case 'perfil':
      mostrar('perfil');

      if (typeof abrirPaginaPerfil === 'function') {
        abrirPaginaPerfil();
      }
      break;

    case 'bots':
      mostrar('bots', 'logs');
      break;

    case 'sistema':
      mostrar('sistema');
      break;

    case 'usuarios-online':
      mostrar('usuarios-online');

      if (typeof carregarUsuariosOnline === 'function') {
        carregarUsuariosOnline();
      }
      break;

    case 'apis':
    case 'loja':
    case 'licenca':
    case 'suporte':
    case 'novidades':
    case 'notificacoes':
    case 'seguranca':
    case 'configuracoes':
    case 'relatar-problema':
    case 'pesquisar':
    case 'clientes-admin':
    case 'bots-admin':
    case 'licencas-admin':
    case 'tickets-admin':
    case 'atividades-admin':
      mostrar(pagina);
      break;

    default:
      pagina = 'inicio';
      mostrar('inicio', 'dashboard');
      break;
  }

  atualizarPaginaAtiva(pagina);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};


/*
 * Completa os destinos dos itens que originalmente
 * não possuíam data-menu-pagina no HTML.
 */
const ravexDestinosIds = {
  menuNotificacoes: 'notificacoes',
  menuSeguranca: 'seguranca',
  menuConfiguracoes: 'configuracoes',
  menuClientes: 'clientes-admin',
  menuLicencasAdmin: 'licencas-admin',
  menuTicketsAdmin: 'tickets-admin',
  menuAtividadesAdmin: 'atividades-admin'
};

Object.entries(ravexDestinosIds).forEach(
  ([id, destino]) => {
    const botao = document.getElementById(id);

    if (!botao) return;

    botao.dataset.menuPagina = destino;

    /*
     * Evita registar o mesmo evento duas vezes.
     */
    if (botao.dataset.ravexLigado !== '1') {
      botao.dataset.ravexLigado = '1';

      botao.addEventListener('click', () => {
        navegarPainel(destino);

        fecharMenuRavex({
          devolverFoco: false
        });
      });
    }
  }
);

ravexPrepararDestinosMenu();

/* =========================================================
   RAVEX-HOST — MARKETPLACE FUNCIONAL
   ========================================================= */

function ravexMoeda(valor, moeda = 'AOA') {
  const numero = Number(valor || 0);

  try {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: moeda || 'AOA'
    }).format(numero);
  } catch {
    return `${numero} ${moeda || 'AOA'}`;
  }
}

async function ravexFetchJSON(url, opcoes = {}) {
  const configuracao = {
    cache: 'no-store',
    ...opcoes
  };

  configuracao.headers = {
    ...(opcoes.body
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(opcoes.headers || {})
  };

  const resposta = await fetch(
    url,
    configuracao
  );

  let dados = {};

  try {
    dados = await resposta.json();
  } catch {
    dados = {};
  }

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem ||
      `Erro HTTP ${resposta.status}`
    );
  }

  return dados;
}

function ravexElementoPagina(nome) {
  return document.querySelector(
    `[data-pagina-conteudo="${nome}"]`
  );
}

function ravexMensagem(
  elemento,
  mensagem,
  erro = false
) {
  if (!elemento) return;

  elemento.textContent = mensagem || '';

  elemento.classList.toggle(
    'ravex-mensagem-erro',
    Boolean(erro)
  );
}

async function ravexCarregarProdutos(tipo = '') {
  const sufixo = tipo
    ? `?tipo=${encodeURIComponent(tipo)}`
    : '';

  const dados = await ravexFetchJSON(
    `/api/marketplace${sufixo}`
  );

  return Array.isArray(dados.produtos)
    ? dados.produtos
    : [];
}

function ravexCardProduto(produto) {
  const gratuito =
    produto.gratuito === true ||
    Number(produto.preco) === 0;

  const preco = gratuito
    ? 'Grátis'
    : ravexMoeda(
        produto.preco,
        produto.moeda
      );

  return `
    <article class="ravex-market-card">
      <div class="ravex-market-topo">
        <strong>
          ${ravexEscaparHtml(produto.nome)}
        </strong>

        <span class="ravex-market-preco">
          ${ravexEscaparHtml(preco)}
        </span>
      </div>

      <p>
        ${ravexEscaparHtml(
          produto.descricao
        )}
      </p>

      <div class="ravex-market-acoes">
        ${
          produto.tipo === 'script' &&
          produto.conteudoPublico
            ? `
              <button
                type="button"
                class="ravex-btn-secundario"
                data-ravex-ver-script="${ravexEscaparHtml(produto.id)}"
              >
                Ver script
              </button>
            `
            : ''
        }

        ${
          produto.tipo === 'bot-aluguel'
            ? `
              <button
                type="button"
                class="ravex-btn-principal"
                data-ravex-alugar="${ravexEscaparHtml(produto.id)}"
              >
                Alugar bot
              </button>
            `
            : ''
        }

        ${
          produto.url
            ? `
              <a
                class="ravex-btn-secundario"
                href="${ravexEscaparHtml(produto.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir
              </a>
            `
            : ''
        }
      </div>
    </article>
  `;
}

async function ravexRenderizarAPIs() {
  const pagina =
    ravexElementoPagina('apis');

  if (!pagina) return;

  pagina.innerHTML = `
    <section class="ravex-market-secao">
      <div class="ravex-destino-cabecalho">
        <div>
          <span class="ravex-market-etiqueta">
            RAVEX API
          </span>

          <h2>APIs</h2>

          <p>
            APIs disponíveis no RAVEX-HOST.
          </p>
        </div>

        ${
          minhaConta?.tipo === 'proprietario'
            ? `
              <button
                type="button"
                id="ravexAdicionarApi"
                class="ravex-btn-principal"
              >
                + Adicionar API
              </button>
            `
            : ''
        }
      </div>

      <div
        id="ravexListaApis"
        class="ravex-market-grid"
      >
        <p>A carregar APIs...</p>
      </div>
    </section>
  `;

  try {
    const produtos =
      await ravexCarregarProdutos('api');

    const lista =
      document.getElementById(
        'ravexListaApis'
      );

    if (!lista) return;

    lista.innerHTML = produtos.length
      ? produtos
          .map(ravexCardProduto)
          .join('')
      : `
        <div class="ravex-market-vazio">
          Ainda não existem APIs publicadas.
        </div>
      `;
  } catch (erro) {
    const lista =
      document.getElementById(
        'ravexListaApis'
      );

    if (lista) {
      lista.innerHTML = `
        <div class="ravex-market-vazio">
          ${ravexEscaparHtml(erro.message)}
        </div>
      `;
    }
  }
}

/* RAVEX MARKETPLACE — PARTE 2: LOJA */

async function ravexRenderizarLoja() {
  const pagina = ravexElementoPagina('loja');

  if (!pagina) return;

  const proprietario =
    minhaConta?.tipo === 'proprietario';

  pagina.innerHTML = `
    <section class="ravex-market-secao">
      <div class="ravex-destino-cabecalho">
        <div>
          <span class="ravex-market-etiqueta">
            Marketplace
          </span>

          <h2>Loja RAVEX</h2>

          <p>
            Bots, scripts e serviços disponíveis.
          </p>
        </div>

        ${
          proprietario
            ? `
              <button
                type="button"
                id="ravexAdicionarProduto"
                class="ravex-btn-principal"
              >
                + Adicionar produto
              </button>
            `
            : ''
        }
      </div>

      <div class="ravex-market-filtros">
        <button
          type="button"
          data-ravex-filtro=""
        >
          Tudo
        </button>

        <button
          type="button"
          data-ravex-filtro="bot-venda"
        >
          Bots à venda
        </button>

        <button
          type="button"
          data-ravex-filtro="bot-free"
        >
          Bots Free
        </button>

        <button
          type="button"
          data-ravex-filtro="script"
        >
          Scripts
        </button>

        <button
          type="button"
          data-ravex-filtro="bot-aluguel"
        >
          Bots para aluguel
        </button>
      </div>

      <div class="ravex-market-utilizador-acoes">
        ${
          proprietario
            ? `
              <button
                type="button"
                id="ravexGerarCodigoAluguel"
                class="ravex-btn-secundario"
              >
                Gerar código
              </button>

              <button
                type="button"
                id="ravexVerSubmissoes"
                class="ravex-btn-secundario"
              >
                Bots para aprovação
              </button>
            `
            : `
              <button
                type="button"
                id="ravexAdicionarMeuBot"
                class="ravex-btn-secundario"
              >
                Adicionar meu bot
              </button>

              <button
                type="button"
                id="ravexMeusAlugueis"
                class="ravex-btn-secundario"
              >
                Meus alugueis
              </button>
            `
        }
      </div>

      <div
        id="ravexListaLoja"
        class="ravex-market-grid"
      >
        <p>A carregar produtos...</p>
      </div>
    </section>
  `;

  await ravexAtualizarListaLoja('');

  pagina
    .querySelectorAll('[data-ravex-filtro]')
    .forEach(botao => {
      botao.addEventListener(
        'click',
        async () => {
          await ravexAtualizarListaLoja(
            botao.dataset.ravexFiltro || ''
          );
        }
      );
    });

  document
    .getElementById('ravexAdicionarProduto')
    ?.addEventListener('click', () => {
      ravexAbrirFormularioProduto();
    });

  document
    .getElementById('ravexAdicionarMeuBot')
    ?.addEventListener('click', () => {
      ravexAbrirAdicionarMeuBot();
    });

  document
    .getElementById('ravexMeusAlugueis')
    ?.addEventListener('click', () => {
      ravexAbrirMeusAlugueis();
    });

  document
    .getElementById('ravexGerarCodigoAluguel')
    ?.addEventListener('click', () => {
      ravexGerarCodigo();
    });

  document
    .getElementById('ravexVerSubmissoes')
    ?.addEventListener('click', () => {
      ravexAbrirSubmissoesAdmin();
    });
}

async function ravexAtualizarListaLoja(
  tipo = ''
) {
  const lista =
    document.getElementById('ravexListaLoja');

  if (!lista) return;

  lista.innerHTML =
    '<p>A carregar produtos...</p>';

  try {
    const produtos =
      await ravexCarregarProdutos(tipo);

    lista.innerHTML = produtos.length
      ? produtos
          .map(ravexCardProduto)
          .join('')
      : `
        <div class="ravex-market-vazio">
          Nenhum produto nesta categoria.
        </div>
      `;

    if (
      typeof ravexLigarAcoesProdutos ===
      'function'
    ) {
      ravexLigarAcoesProdutos();
    }
  } catch (erro) {
    lista.innerHTML = `
      <div class="ravex-market-vazio">
        ${ravexEscaparHtml(erro.message)}
      </div>
    `;
  }
}

/* RAVEX MARKETPLACE — PARTE 3: AÇÕES */

function ravexModal(conteudo) {
  document
    .getElementById('ravexModalGlobal')
    ?.remove();

  const fundo = document.createElement('div');

  fundo.id = 'ravexModalGlobal';
  fundo.className = 'ravex-modal-fundo';

  fundo.innerHTML = `
    <div class="ravex-modal-caixa">
      <button
        type="button"
        class="ravex-modal-fechar"
        aria-label="Fechar"
      >
        ×
      </button>

      <div class="ravex-modal-conteudo">
        ${conteudo}
      </div>
    </div>
  `;

  document.body.appendChild(fundo);

  fundo
    .querySelector('.ravex-modal-fechar')
    ?.addEventListener(
      'click',
      () => fundo.remove()
    );

  fundo.addEventListener(
    'click',
    evento => {
      if (evento.target === fundo) {
        fundo.remove();
      }
    }
  );

  return fundo;
}

function ravexLigarAcoesProdutos() {
  document
    .querySelectorAll('[data-ravex-ver-script]')
    .forEach(botao => {
      botao.addEventListener(
        'click',
        async () => {
          try {
            const produtos =
              await ravexCarregarProdutos(
                'script'
              );

            const produto = produtos.find(
              item =>
                item.id ===
                botao.dataset.ravexVerScript
            );

            if (!produto) {
              throw new Error(
                'Script não encontrado.'
              );
            }

            ravexModal(`
              <h2>
                ${ravexEscaparHtml(
                  produto.nome
                )}
              </h2>

              <p>
                ${ravexEscaparHtml(
                  produto.descricao
                )}
              </p>

              <pre class="ravex-script-publico"><code>${ravexEscaparHtml(
                produto.conteudoPublico ||
                'Nenhum conteúdo público disponível.'
              )}</code></pre>
            `);
          } catch (erro) {
            ravexModal(`
              <h2>Erro</h2>
              <p>
                ${ravexEscaparHtml(
                  erro.message
                )}
              </p>
            `);
          }
        }
      );
    });

  document
    .querySelectorAll('[data-ravex-alugar]')
    .forEach(botao => {
      botao.addEventListener(
        'click',
        () => {
          ravexAbrirFormularioAluguel(
            botao.dataset.ravexAlugar
          );
        }
      );
    });
}

function ravexAbrirFormularioProduto(
  tipoInicial = ''
) {
  const modal = ravexModal(`
    <h2>Adicionar produto</h2>

    <form id="ravexFormProduto">
      <label>
        Tipo
        <select name="tipo" required>
          <option value="api">API</option>
          <option value="bot-venda">
            Bot à venda
          </option>
          <option value="bot-free">
            Bot Free
          </option>
          <option value="script">
            Script
          </option>
          <option value="bot-aluguel">
            Bot para aluguel
          </option>
        </select>
      </label>

      <label>
        Nome
        <input
          name="nome"
          maxlength="100"
          required
        >
      </label>

      <label>
        Descrição
        <textarea
          name="descricao"
          maxlength="2000"
          required
        ></textarea>
      </label>

      <label>
        Preço
        <input
          name="preco"
          type="number"
          min="0"
          value="0"
        >
      </label>

      <label>
        Moeda
        <input
          name="moeda"
          value="AOA"
          maxlength="10"
        >
      </label>

      <label>
        Versão
        <input
          name="versao"
          maxlength="50"
        >
      </label>

      <label>
        URL pública
        <input
          name="url"
          type="url"
          maxlength="1000"
        >
      </label>

      <label>
        Período de aluguel
        <input
          name="periodoAluguel"
          maxlength="100"
          placeholder="Ex.: 30 dias"
        >
      </label>

      <label>
        Script / conteúdo público
        <textarea
          name="conteudoPublico"
          maxlength="10000"
        ></textarea>
      </label>

      <p
        id="ravexProdutoMensagem"
        class="ravex-form-mensagem"
      ></p>

      <button
        type="submit"
        class="ravex-btn-principal"
      >
        Publicar
      </button>
    </form>
  `);

  const form =
    modal.querySelector('#ravexFormProduto');

  if (tipoInicial) {
    form.elements.tipo.value = tipoInicial;
  }

  form.addEventListener(
    'submit',
    async evento => {
      evento.preventDefault();

      const mensagem =
        modal.querySelector(
          '#ravexProdutoMensagem'
        );

      const dados =
        Object.fromEntries(
          new FormData(form).entries()
        );

      dados.preco =
        Number(dados.preco || 0);

      dados.gratuito =
        dados.tipo === 'bot-free';

      try {
        ravexMensagem(
          mensagem,
          'A publicar...'
        );

        await ravexFetchJSON(
          '/api/proprietario/marketplace',
          {
            method: 'POST',
            body: JSON.stringify(dados)
          }
        );

        ravexMensagem(
          mensagem,
          'Publicado com sucesso.'
        );

        setTimeout(async () => {
          modal.remove();

          if (tipoInicial === 'api') {
            await ravexRenderizarAPIs();
          } else {
            await ravexRenderizarLoja();
          }
        }, 500);
      } catch (erro) {
        ravexMensagem(
          mensagem,
          erro.message,
          true
        );
      }
    }
  );
}

function ravexAbrirFormularioAluguel(
  produtoId
) {
  const modal = ravexModal(`
    <h2>Alugar bot</h2>

    <form id="ravexFormAluguel">
      <label>
        Grupo WhatsApp
        <input
          name="grupoWhatsApp"
          maxlength="300"
          placeholder="Nome ou referência do grupo"
        >
      </label>

      <label>
        Observação
        <textarea
          name="observacao"
          maxlength="1000"
          placeholder="Informações sobre o pedido"
        ></textarea>
      </label>

      <p
        id="ravexAluguelMensagem"
        class="ravex-form-mensagem"
      ></p>

      <button
        type="submit"
        class="ravex-btn-principal"
      >
        Enviar pedido
      </button>
    </form>
  `);

  const form =
    modal.querySelector(
      '#ravexFormAluguel'
    );

  form.addEventListener(
    'submit',
    async evento => {
      evento.preventDefault();

      const mensagem =
        modal.querySelector(
          '#ravexAluguelMensagem'
        );

      const dados =
        Object.fromEntries(
          new FormData(form).entries()
        );

      try {
        ravexMensagem(
          mensagem,
          'A enviar pedido...'
        );

        const resposta =
          await ravexFetchJSON(
            '/api/alugueis',
            {
              method: 'POST',
              body: JSON.stringify({
                produtoId,
                ...dados
              })
            }
          );

        ravexMensagem(
          mensagem,
          resposta.mensagem ||
          'Pedido enviado com sucesso.'
        );
      } catch (erro) {
        ravexMensagem(
          mensagem,
          erro.message,
          true
        );
      }
    }
  );
}

/* RAVEX MARKETPLACE — PARTE 4A: MEU BOT */

function ravexAbrirAdicionarMeuBot() {
  const modal = ravexModal(`
    <h2>Adicionar meu bot para aluguel</h2>

    <p>
      Para publicar um bot, precisas primeiro
      de um código de confirmação RAVEX.
    </p>

    <form id="ravexFormMeuBot">
      <label>
        Código de confirmação
        <input
          name="codigo"
          autocomplete="off"
          required
          placeholder="RAVEX-ALUGUEL-..."
        >
      </label>

      <label>
        Nome do bot
        <input
          name="nome"
          maxlength="100"
          required
        >
      </label>

      <label>
        Descrição
        <textarea
          name="descricao"
          maxlength="2000"
          required
        ></textarea>
      </label>

      <label>
        Preço do aluguel
        <input
          name="preco"
          type="number"
          min="0"
          step="1"
          required
        >
      </label>

      <label>
        Moeda
        <input
          name="moeda"
          value="AOA"
          maxlength="10"
        >
      </label>

      <label>
        Período
        <input
          name="periodoAluguel"
          maxlength="100"
          placeholder="Ex.: 30 dias"
        >
      </label>

      <label>
        URL pública ou repositório
        <input
          name="url"
          type="url"
          maxlength="1000"
        >
      </label>

      <p
        id="ravexMeuBotMensagem"
        class="ravex-form-mensagem"
      ></p>

      <button
        type="submit"
        class="ravex-btn-principal"
      >
        Confirmar e enviar
      </button>
    </form>
  `);

  const form =
    modal.querySelector('#ravexFormMeuBot');

  form.addEventListener(
    'submit',
    async evento => {
      evento.preventDefault();

      const mensagem =
        modal.querySelector(
          '#ravexMeuBotMensagem'
        );

      const dados =
        Object.fromEntries(
          new FormData(form).entries()
        );

      try {
        ravexMensagem(
          mensagem,
          'A confirmar código...'
        );

        const confirmacao =
          await ravexFetchJSON(
            '/api/codigos-aluguel/confirmar',
            {
              method: 'POST',
              body: JSON.stringify({
                codigo: dados.codigo
              })
            }
          );

        if (!confirmacao.confirmacaoId) {
          throw new Error(
            'Confirmação do código inválida.'
          );
        }

        ravexMensagem(
          mensagem,
          'Código aceite. A enviar bot...'
        );

        const resposta =
          await ravexFetchJSON(
            '/api/marketplace/submissoes',
            {
              method: 'POST',
              body: JSON.stringify({
                confirmacaoId:
                  confirmacao.confirmacaoId,

                nome: dados.nome,

                descricao:
                  dados.descricao,

                preco:
                  Number(dados.preco || 0),

                moeda:
                  dados.moeda || 'AOA',

                periodoAluguel:
                  dados.periodoAluguel,

                url:
                  dados.url
              })
            }
          );

        ravexMensagem(
          mensagem,
          resposta.mensagem ||
          'Bot enviado para aprovação.'
        );

        form
          .querySelectorAll(
            'input, textarea, select, button'
          )
          .forEach(elemento => {
            elemento.disabled = true;
          });

      } catch (erro) {
        ravexMensagem(
          mensagem,
          erro.message,
          true
        );
      }
    }
  );
}

/* RAVEX MARKETPLACE — PARTE 4B: ALUGUEIS E CÓDIGOS */

async function ravexAbrirMeusAlugueis() {
  try {
    const dados =
      await ravexFetchJSON(
        '/api/meus-alugueis'
      );

    const alugueis =
      Array.isArray(dados.alugueis)
        ? dados.alugueis
        : [];

    ravexModal(`
      <h2>Meus alugueis</h2>

      ${
        alugueis.length
          ? alugueis.map(item => `
              <div class="ravex-lista-item">
                <strong>
                  Pedido
                  ${ravexEscaparHtml(item.id)}
                </strong>

                <span>
                  Estado:
                  ${ravexEscaparHtml(
                    item.status || 'pendente'
                  )}
                </span>

                ${
                  item.grupoWhatsApp
                    ? `
                      <span>
                        Grupo:
                        ${ravexEscaparHtml(
                          item.grupoWhatsApp
                        )}
                      </span>
                    `
                    : ''
                }
              </div>
            `).join('')
          : `
            <div class="ravex-market-vazio">
              Ainda não tens pedidos de aluguel.
            </div>
          `
      }
    `);

  } catch (erro) {
    ravexModal(`
      <h2>Meus alugueis</h2>

      <p class="ravex-mensagem-erro">
        ${ravexEscaparHtml(erro.message)}
      </p>
    `);
  }
}

async function ravexGerarCodigo() {
  const valor = window.prompt(
    'Validade do código em minutos:',
    '60'
  );

  if (valor === null) {
    return;
  }

  const validadeMinutos =
    Number(valor);

  if (
    !Number.isInteger(validadeMinutos) ||
    validadeMinutos < 5 ||
    validadeMinutos > 10080
  ) {
    ravexModal(`
      <h2>Validade inválida</h2>

      <p>
        Usa um valor entre
        5 e 10080 minutos.
      </p>
    `);

    return;
  }

  try {
    const dados =
      await ravexFetchJSON(
        '/api/proprietario/codigos-aluguel',
        {
          method: 'POST',
          body: JSON.stringify({
            validadeMinutos
          })
        }
      );

    if (!dados.codigo) {
      throw new Error(
        'O servidor não devolveu o código.'
      );
    }

    let expiracao = '';

    if (dados.expiraEm) {
      try {
        expiracao =
          new Date(
            dados.expiraEm
          ).toLocaleString('pt-PT');
      } catch {
        expiracao =
          String(dados.expiraEm);
      }
    }

    ravexModal(`
      <h2>Código de confirmação</h2>

      <p>
        Este código só deve ser entregue
        ao utilizador autorizado.
      </p>

      <div class="ravex-codigo-gerado">
        ${ravexEscaparHtml(dados.codigo)}
      </div>

      ${
        expiracao
          ? `
            <p>
              Expira em:
              ${ravexEscaparHtml(expiracao)}
            </p>
          `
          : ''
      }

      <p>
        Depois de utilizado,
        o código não poderá ser reutilizado.
      </p>
    `);

  } catch (erro) {
    ravexModal(`
      <h2>Erro ao gerar código</h2>

      <p class="ravex-mensagem-erro">
        ${ravexEscaparHtml(erro.message)}
      </p>
    `);
  }
}

/* RAVEX MARKETPLACE — PARTE 4C: APROVAÇÃO */

async function ravexAbrirSubmissoesAdmin() {
  try {
    const dados = await ravexFetchJSON(
      '/api/proprietario/marketplace/submissoes?status=pendente'
    );

    const submissoes =
      Array.isArray(dados.submissoes)
        ? dados.submissoes
        : [];

    const modal = ravexModal(`
      <h2>Bots para aprovação</h2>

      <div id="ravexSubmissoesLista">
        ${
          submissoes.length
            ? submissoes.map(item => `
                <div
                  class="ravex-lista-item"
                  data-submissao="${ravexEscaparHtml(item.id)}"
                >
                  <strong>
                    ${ravexEscaparHtml(item.nome)}
                  </strong>

                  <p>
                    ${ravexEscaparHtml(item.descricao)}
                  </p>

                  <span>
                    Preço:
                    ${ravexEscaparHtml(
                      ravexMoeda(
                        item.preco,
                        item.moeda || 'AOA'
                      )
                    )}
                  </span>

                  ${
                    item.periodoAluguel
                      ? `
                        <span>
                          Período:
                          ${ravexEscaparHtml(
                            item.periodoAluguel
                          )}
                        </span>
                      `
                      : ''
                  }

                  <div class="ravex-market-acoes">
                    <button
                      type="button"
                      class="ravex-btn-principal"
                      data-ravex-aprovar="${ravexEscaparHtml(item.id)}"
                    >
                      Aprovar
                    </button>

                    <button
                      type="button"
                      class="ravex-btn-secundario"
                      data-ravex-rejeitar="${ravexEscaparHtml(item.id)}"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              `).join('')
            : `
              <div class="ravex-market-vazio">
                Não existem bots pendentes.
              </div>
            `
        }
      </div>
    `);

    modal
      .querySelectorAll('[data-ravex-aprovar]')
      .forEach(botao => {
        botao.addEventListener(
          'click',
          async () => {
            botao.disabled = true;

            try {
              await ravexDecidirSubmissao(
                botao.dataset.ravexAprovar,
                'aprovado',
                ''
              );

              modal.remove();

              await ravexAbrirSubmissoesAdmin();
            } catch {
              botao.disabled = false;
            }
          }
        );
      });

    modal
      .querySelectorAll('[data-ravex-rejeitar]')
      .forEach(botao => {
        botao.addEventListener(
          'click',
          async () => {
            const motivo = window.prompt(
              'Motivo da rejeição:',
              ''
            );

            if (motivo === null) {
              return;
            }

            botao.disabled = true;

            try {
              await ravexDecidirSubmissao(
                botao.dataset.ravexRejeitar,
                'rejeitado',
                motivo
              );

              modal.remove();

              await ravexAbrirSubmissoesAdmin();
            } catch {
              botao.disabled = false;
            }
          }
        );
      });

  } catch (erro) {
    ravexModal(`
      <h2>Bots para aprovação</h2>

      <p class="ravex-mensagem-erro">
        ${ravexEscaparHtml(erro.message)}
      </p>
    `);
  }
}

async function ravexDecidirSubmissao(
  id,
  status,
  motivo = ''
) {
  try {
    return await ravexFetchJSON(
      '/api/proprietario/marketplace/submissoes/' +
      encodeURIComponent(id),
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          motivo
        })
      }
    );

  } catch (erro) {
    ravexModal(`
      <h2>Não foi possível concluir</h2>

      <p class="ravex-mensagem-erro">
        ${ravexEscaparHtml(erro.message)}
      </p>
    `);

    throw erro;
  }
}

/* =========================================================
   RAVEX MARKETPLACE — PARTE 5A: NAVEGAÇÃO FINAL
   ========================================================= */

const ravexMostrarPaginaOriginal =
  window.mostrarPaginaPainel;

if (
  typeof ravexMostrarPaginaOriginal ===
  'function'
) {
  window.mostrarPaginaPainel =
    function ravexMostrarPaginaComMarketplace(
      pagina
    ) {
      const resultado =
        ravexMostrarPaginaOriginal(pagina);

      if (pagina === 'apis') {
        ravexRenderizarAPIs();
      }

      if (pagina === 'loja') {
        ravexRenderizarLoja();
      }

      return resultado;
    };
}

/*
 * Garante também a integração quando navegarPainel()
 * for a função utilizada pelos botões do menu.
 */
const ravexNavegarPainelOriginal =
  window.navegarPainel;

if (
  typeof ravexNavegarPainelOriginal ===
  'function'
) {
  window.navegarPainel =
    function ravexNavegarComMarketplace(
      pagina
    ) {
      const resultado =
        ravexNavegarPainelOriginal(pagina);

      if (pagina === 'apis') {
        ravexRenderizarAPIs();
      }

      if (pagina === 'loja') {
        ravexRenderizarLoja();
      }

      return resultado;
    };
}
