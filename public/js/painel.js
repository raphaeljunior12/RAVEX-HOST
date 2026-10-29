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

const botaoSair =
  document.getElementById('sairPainel');

botaoSair.addEventListener('click', async () => {
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

atualizarStatusSistema();
carregarBots().then(atualizarLogs);

setInterval(atualizarStatusSistema, 5000);
setInterval(carregarBots, 5000);
setInterval(atualizarLogs, 3000);
