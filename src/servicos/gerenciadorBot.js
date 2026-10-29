const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const {
  obterBot,
  removerBot
} = require('./registroBots');

const {
  adicionarLogBot
} = require('./logsBot');

const DIRETORIO_PROCESSOS = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'processos'
);

const estados = new Map();

function validarIdBot(idBot) {
  const id = String(idBot || '').trim();

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw new Error('ID_BOT_INVALIDO');
  }

  return id;
}

function garantirDiretorioProcessos() {
  fs.mkdirSync(
    DIRETORIO_PROCESSOS,
    { recursive: true }
  );
}

function obterArquivoPid(idBot) {
  const id = validarIdBot(idBot);

  return path.join(
    DIRETORIO_PROCESSOS,
    `${id}.pid`
  );
}

function obterEstado(idBot) {
  const id = validarIdBot(idBot);

  if (!estados.has(id)) {
    estados.set(id, {
      processo: null,
      iniciadoEm: null,
      ultimoCodigoSaida: null
    });
  }

  return estados.get(id);
}

function salvarPid(idBot, pid) {
  garantirDiretorioProcessos();

  fs.writeFileSync(
    obterArquivoPid(idBot),
    String(pid),
    'utf8'
  );
}

function lerPid(idBot) {
  try {
    const conteudo = fs
      .readFileSync(
        obterArquivoPid(idBot),
        'utf8'
      )
      .trim();

    const pid = Number(conteudo);

    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }

    return pid;
  } catch {
    return null;
  }
}

function removerPid(idBot, pidEsperado = null) {
  const arquivo = obterArquivoPid(idBot);

  try {
    if (
      pidEsperado !== null &&
      lerPid(idBot) !== pidEsperado
    ) {
      return;
    }

    fs.unlinkSync(arquivo);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.error(
        `❌ Erro ao remover PID do bot ${idBot}:`,
        erro.message
      );
    }
  }
}

function processoExiste(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function obterPidAtivo(idBot) {
  const id = validarIdBot(idBot);
  const estado = obterEstado(id);

  if (
    estado.processo &&
    estado.processo.exitCode === null &&
    !estado.processo.killed
  ) {
    return estado.processo.pid;
  }

  const pidSalvo = lerPid(id);

  if (!pidSalvo) {
    return null;
  }

  if (processoExiste(pidSalvo)) {
    return pidSalvo;
  }

  removerPid(id, pidSalvo);

  return null;
}

function obterStatusBot(idBot) {
  const id = validarIdBot(idBot);
  const bot = obterBot(id);

  if (!bot) {
    throw new Error('BOT_NAO_ENCONTRADO');
  }

  const estado = obterEstado(id);
  const pid = obterPidAtivo(id);
  const online = pid !== null;

  return {
    id: bot.id,
    nome: bot.nome,
    online,
    status: online ? 'online' : 'offline',
    pid,
    iniciadoEm:
      online ? estado.iniciadoEm : null,
    ultimoCodigoSaida:
      estado.ultimoCodigoSaida,
    diretorio: bot.diretorio,
    arquivoInicial: bot.arquivoInicial
  };
}

function listarStatusBots() {
  const {
    listarBots
  } = require('./registroBots');

  return listarBots().map((bot) => {
    try {
      return obterStatusBot(bot.id);
    } catch (erro) {
      return {
        id: bot.id,
        nome: bot.nome,
        online: false,
        status: 'erro',
        pid: null,
        erro: erro.message
      };
    }
  });
}

function iniciarBot(idBot) {
  const id = validarIdBot(idBot);
  const bot = obterBot(id);

  if (!bot) {
    return {
      sucesso: false,
      mensagem: 'Bot não encontrado.'
    };
  }

  const statusAtual = obterStatusBot(id);

  if (statusAtual.online) {
    return {
      sucesso: false,
      mensagem: `${bot.nome} já está online.`,
      status: statusAtual
    };
  }

  const arquivoInicial = path.resolve(
    bot.diretorio,
    bot.arquivoInicial
  );

  const diretorioResolvido = path.resolve(
    bot.diretorio
  );

  const relativo = path.relative(
    diretorioResolvido,
    arquivoInicial
  );

  if (
    relativo.startsWith('..') ||
    path.isAbsolute(relativo)
  ) {
    return {
      sucesso: false,
      mensagem:
        'Arquivo inicial está fora do diretório do bot.',
      status: statusAtual
    };
  }

  if (!fs.existsSync(diretorioResolvido)) {
    return {
      sucesso: false,
      mensagem:
        `Diretório de ${bot.nome} não encontrado.`,
      status: statusAtual
    };
  }

  if (!fs.existsSync(arquivoInicial)) {
    return {
      sucesso: false,
      mensagem:
        `Arquivo inicial de ${bot.nome} não encontrado.`,
      status: statusAtual
    };
  }

  const estado = obterEstado(id);

  estado.ultimoCodigoSaida = null;

  let novoProcesso;

  try {
    novoProcesso = spawn(
      process.execPath,
      [arquivoInicial],
      {
        cwd: diretorioResolvido,
        env: process.env,
        stdio: [
          'ignore',
          'pipe',
          'pipe'
        ]
      }
    );
  } catch (erro) {
    return {
      sucesso: false,
      mensagem:
        `Não foi possível iniciar ${bot.nome}.`,
      erro: erro.message,
      status: obterStatusBot(id)
    };
  }

  estado.processo = novoProcesso;
  estado.iniciadoEm =
    new Date().toISOString();

  salvarPid(id, novoProcesso.pid);

  adicionarLogBot(
    id,
    'sistema',
    `${bot.nome} iniciado com PID ${novoProcesso.pid}.`
  );

  novoProcesso.stdout.on(
    'data',
    (dados) => {
      const mensagem = dados.toString();

      process.stdout.write(mensagem);

      adicionarLogBot(
        id,
        'stdout',
        mensagem
      );
    }
  );

  novoProcesso.stderr.on(
    'data',
    (dados) => {
      const mensagem = dados.toString();

      process.stderr.write(mensagem);

      adicionarLogBot(
        id,
        'stderr',
        mensagem
      );
    }
  );

  novoProcesso.once(
    'exit',
    (codigo, sinal) => {
      estado.ultimoCodigoSaida = codigo;

      removerPid(
        id,
        novoProcesso.pid
      );

      adicionarLogBot(
        id,
        'sistema',
        `${bot.nome} encerrado` +
          ` (código: ${codigo ?? 'null'},` +
          ` sinal: ${sinal || 'nenhum'}).`
      );

      if (
        estado.processo === novoProcesso
      ) {
        estado.processo = null;
        estado.iniciadoEm = null;
      }
    }
  );

  novoProcesso.once(
    'error',
    (erro) => {
      console.error(
        `❌ Erro no processo de ${bot.nome}:`,
        erro.message
      );

      removerPid(
        id,
        novoProcesso.pid
      );

      adicionarLogBot(
        id,
        'stderr',
        `Erro de processo: ${erro.message}`
      );

      if (
        estado.processo === novoProcesso
      ) {
        estado.processo = null;
        estado.iniciadoEm = null;
      }
    }
  );

  return {
    sucesso: true,
    mensagem: `${bot.nome} iniciado.`,
    status: obterStatusBot(id)
  };
}

function pararBot(idBot) {
  const id = validarIdBot(idBot);
  const bot = obterBot(id);

  if (!bot) {
    return {
      sucesso: false,
      mensagem: 'Bot não encontrado.'
    };
  }

  const statusAtual = obterStatusBot(id);

  if (!statusAtual.online) {
    return {
      sucesso: false,
      mensagem: `${bot.nome} já está offline.`,
      status: statusAtual
    };
  }

  try {
    process.kill(
      statusAtual.pid,
      'SIGTERM'
    );

    adicionarLogBot(
      id,
      'sistema',
      `Encerramento de ${bot.nome} solicitado.`
    );

    return {
      sucesso: true,
      mensagem:
        `Encerramento de ${bot.nome} solicitado.`,
      pid: statusAtual.pid
    };
  } catch (erro) {
    removerPid(
      id,
      statusAtual.pid
    );

    return {
      sucesso: false,
      mensagem:
        `Não foi possível encerrar ${bot.nome}.`,
      status: obterStatusBot(id)
    };
  }
}

function esperarEncerramento(
  pid,
  limiteMs = 10000
) {
  return new Promise((resolve) => {
    const inicio = Date.now();

    const verificar = () => {
      if (!processoExiste(pid)) {
        resolve(true);
        return;
      }

      if (
        Date.now() - inicio >= limiteMs
      ) {
        resolve(false);
        return;
      }

      setTimeout(
        verificar,
        250
      );
    };

    verificar();
  });
}

async function reiniciarBot(idBot) {
  const id = validarIdBot(idBot);
  const bot = obterBot(id);

  if (!bot) {
    return {
      sucesso: false,
      mensagem: 'Bot não encontrado.'
    };
  }

  const statusAtual = obterStatusBot(id);

  if (!statusAtual.online) {
    return iniciarBot(id);
  }

  const pidAnterior = statusAtual.pid;

  try {
    process.kill(
      pidAnterior,
      'SIGTERM'
    );
  } catch {
    removerPid(
      id,
      pidAnterior
    );

    return {
      sucesso: false,
      mensagem:
        `Não foi possível encerrar ${bot.nome} para reiniciá-lo.`,
      status: obterStatusBot(id)
    };
  }

  adicionarLogBot(
    id,
    'sistema',
    `Reinício de ${bot.nome} solicitado.`
  );

  const encerrou =
    await esperarEncerramento(
      pidAnterior
    );

  if (!encerrou) {
    return {
      sucesso: false,
      mensagem:
        `${bot.nome} não encerrou dentro do tempo esperado.`,
      status: obterStatusBot(id)
    };
  }

  removerPid(
    id,
    pidAnterior
  );

  return iniciarBot(id);
}


async function removerBotGerenciado(idBot) {
  const id = validarIdBot(idBot);
  const bot = obterBot(id);

  if (!bot) {
    return {
      sucesso: false,
      mensagem: 'Bot não encontrado.'
    };
  }

  const status = obterStatusBot(id);

  if (status.online) {
    const resultadoParada = pararBot(id);

    if (!resultadoParada.sucesso) {
      return {
        sucesso: false,
        mensagem:
          `Não foi possível parar ${bot.nome} antes da remoção.`
      };
    }

    const encerrou = await esperarEncerramento(
      status.pid
    );

    if (!encerrou) {
      return {
        sucesso: false,
        mensagem:
          `${bot.nome} não encerrou dentro do tempo esperado.`
      };
    }
  }

  removerPid(id);

  const removido = removerBot(id);

  estados.delete(id);

  return {
    sucesso: true,
    mensagem:
      `${removido.nome} foi removido do RAVEX-HOST.`,
    bot: removido,
    arquivosApagados: false
  };
}

module.exports = {
  obterStatusBot,
  listarStatusBots,
  iniciarBot,
  pararBot,
  reiniciarBot,
  removerBotGerenciado
};
