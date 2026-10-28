const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { adicionarLog } = require('./logsBot');

const DIRETORIO_BOT = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'RAVEX-BOT'
);

const ARQUIVO_INICIAL = path.join(DIRETORIO_BOT, 'iniciar.js');

const DIRETORIO_PROCESSOS = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'processos'
);

const ARQUIVO_PID = path.join(
  DIRETORIO_PROCESSOS,
  'ravex-bot.pid'
);

let processoBot = null;
let iniciadoEm = null;
let ultimoCodigoSaida = null;

function garantirDiretorioProcessos() {
  fs.mkdirSync(DIRETORIO_PROCESSOS, {
    recursive: true
  });
}

function salvarPid(pid) {
  garantirDiretorioProcessos();

  fs.writeFileSync(
    ARQUIVO_PID,
    String(pid),
    'utf8'
  );
}

function lerPid() {
  try {
    const conteudo = fs
      .readFileSync(ARQUIVO_PID, 'utf8')
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

function removerPid(pidEsperado = null) {
  try {
    if (
      pidEsperado !== null &&
      lerPid() !== pidEsperado
    ) {
      return;
    }

    fs.unlinkSync(ARQUIVO_PID);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.error(
        '❌ Erro ao remover PID do RAVEX-BOT:',
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

function obterPidAtivo() {
  if (
    processoBot &&
    processoBot.exitCode === null &&
    !processoBot.killed
  ) {
    return processoBot.pid;
  }

  const pidSalvo = lerPid();

  if (!pidSalvo) {
    return null;
  }

  if (processoExiste(pidSalvo)) {
    return pidSalvo;
  }

  removerPid(pidSalvo);
  return null;
}

function obterStatusBot() {
  const pid = obterPidAtivo();
  const online = pid !== null;

  return {
    nome: 'RAVEX-BOT',
    online,
    status: online ? 'online' : 'offline',
    pid,
    iniciadoEm: online ? iniciadoEm : null,
    ultimoCodigoSaida,
    diretorio: DIRETORIO_BOT
  };
}

function iniciarBot() {
  const statusAtual = obterStatusBot();

  if (statusAtual.online) {
    return {
      sucesso: false,
      mensagem: 'RAVEX-BOT já está online.',
      status: statusAtual
    };
  }

  if (!fs.existsSync(ARQUIVO_INICIAL)) {
    return {
      sucesso: false,
      mensagem:
        'Arquivo iniciar.js do RAVEX-BOT não encontrado.',
      status: obterStatusBot()
    };
  }

  ultimoCodigoSaida = null;

  const novoProcesso = spawn(
    process.execPath,
    [ARQUIVO_INICIAL],
    {
      cwd: DIRETORIO_BOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  processoBot = novoProcesso;
  iniciadoEm = new Date().toISOString();

  salvarPid(novoProcesso.pid);

  novoProcesso.stdout.on('data', (dados) => {
    const mensagem = dados.toString();

    process.stdout.write(mensagem);
    adicionarLog('stdout', mensagem);
  });

  novoProcesso.stderr.on('data', (dados) => {
    const mensagem = dados.toString();

    process.stderr.write(mensagem);
    adicionarLog('stderr', mensagem);
  });

  novoProcesso.once('exit', (codigo) => {
    ultimoCodigoSaida = codigo;

    removerPid(novoProcesso.pid);

    if (processoBot === novoProcesso) {
      processoBot = null;
      iniciadoEm = null;
    }
  });

  novoProcesso.once('error', (erro) => {
    console.error(
      '❌ Erro no processo do RAVEX-BOT:',
      erro.message
    );

    removerPid(novoProcesso.pid);

    if (processoBot === novoProcesso) {
      processoBot = null;
      iniciadoEm = null;
    }
  });

  return {
    sucesso: true,
    mensagem: 'RAVEX-BOT iniciado.',
    status: obterStatusBot()
  };
}

function pararBot() {
  const statusAtual = obterStatusBot();

  if (!statusAtual.online) {
    return {
      sucesso: false,
      mensagem: 'RAVEX-BOT já está offline.',
      status: statusAtual
    };
  }

  try {
    process.kill(statusAtual.pid, 'SIGTERM');

    return {
      sucesso: true,
      mensagem:
        'Encerramento do RAVEX-BOT solicitado.',
      pid: statusAtual.pid
    };
  } catch (erro) {
    removerPid(statusAtual.pid);

    return {
      sucesso: false,
      mensagem:
        'Não foi possível solicitar o encerramento do RAVEX-BOT.',
      status: obterStatusBot()
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

      if (Date.now() - inicio >= limiteMs) {
        resolve(false);
        return;
      }

      setTimeout(verificar, 250);
    };

    verificar();
  });
}

async function reiniciarBot() {
  const statusAtual = obterStatusBot();

  if (!statusAtual.online) {
    return iniciarBot();
  }

  const pidAnterior = statusAtual.pid;

  try {
    process.kill(pidAnterior, 'SIGTERM');
  } catch {
    removerPid(pidAnterior);

    return {
      sucesso: false,
      mensagem:
        'Não foi possível encerrar o RAVEX-BOT para reiniciá-lo.',
      status: obterStatusBot()
    };
  }

  const encerrou = await esperarEncerramento(
    pidAnterior
  );

  if (!encerrou) {
    return {
      sucesso: false,
      mensagem:
        'O RAVEX-BOT não encerrou dentro do tempo esperado.',
      status: obterStatusBot()
    };
  }

  removerPid(pidAnterior);

  return iniciarBot();
}

module.exports = {
  obterStatusBot,
  iniciarBot,
  pararBot,
  reiniciarBot
};
