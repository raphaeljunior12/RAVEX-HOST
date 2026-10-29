const fs = require('fs');
const path = require('path');

const LIMITE_LOGS = 300;

const DIRETORIO_LOGS = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'logs'
);

const ID_LEGADO = 'ravex-bot';

const logsPorBot = new Map();

function garantirDiretorioLogs() {
  fs.mkdirSync(DIRETORIO_LOGS, {
    recursive: true
  });
}

function validarIdBot(idBot) {
  const id = String(idBot || '').trim();

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw new Error('ID_BOT_INVALIDO');
  }

  return id;
}

function obterArquivoLog(idBot) {
  const id = validarIdBot(idBot);

  return path.join(
    DIRETORIO_LOGS,
    `${id}.log`
  );
}

function obterMemoria(idBot) {
  const id = validarIdBot(idBot);

  if (!logsPorBot.has(id)) {
    logsPorBot.set(id, []);
  }

  return logsPorBot.get(id);
}

function limitarLogs(logs) {
  if (logs.length > LIMITE_LOGS) {
    logs.splice(
      0,
      logs.length - LIMITE_LOGS
    );
  }
}

function carregarLogsBot(idBot) {
  const id = validarIdBot(idBot);

  if (logsPorBot.has(id)) {
    return logsPorBot.get(id);
  }

  const logs = [];
  logsPorBot.set(id, logs);

  garantirDiretorioLogs();

  const arquivo = obterArquivoLog(id);

  try {
    if (!fs.existsSync(arquivo)) {
      return logs;
    }

    const conteudo = fs.readFileSync(
      arquivo,
      'utf8'
    );

    const linhas = conteudo
      .split('\n')
      .filter(Boolean)
      .slice(-LIMITE_LOGS);

    for (const linha of linhas) {
      try {
        const log = JSON.parse(linha);

        if (
          log &&
          typeof log.tipo === 'string' &&
          typeof log.mensagem === 'string' &&
          typeof log.timestamp === 'string'
        ) {
          logs.push(log);
        }
      } catch {
        // Linha inválida não derruba o RAVEX-HOST.
      }
    }

    limitarLogs(logs);

    return logs;
  } catch (erro) {
    console.error(
      `❌ Erro ao carregar logs do bot ${id}:`,
      erro.message
    );

    return logs;
  }
}

function persistirLog(idBot, log) {
  const id = validarIdBot(idBot);
  const arquivo = obterArquivoLog(id);

  try {
    garantirDiretorioLogs();

    fs.appendFileSync(
      arquivo,
      `${JSON.stringify(log)}\n`,
      'utf8'
    );

    const conteudo = fs.readFileSync(
      arquivo,
      'utf8'
    );

    const linhas = conteudo
      .split('\n')
      .filter(Boolean);

    if (linhas.length > LIMITE_LOGS) {
      const logs = obterMemoria(id)
        .slice(-LIMITE_LOGS);

      const compactado = logs
        .map(item => JSON.stringify(item))
        .join('\n');

      fs.writeFileSync(
        arquivo,
        compactado
          ? `${compactado}\n`
          : '',
        'utf8'
      );
    }
  } catch (erro) {
    console.error(
      `❌ Erro ao salvar log do bot ${id}:`,
      erro.message
    );
  }
}

function adicionarLogBot(idBot, tipo, mensagem) {
  const id = validarIdBot(idBot);
  const texto = String(mensagem || '').trim();

  if (!texto) {
    return;
  }

  const logs = carregarLogsBot(id);

  const log = {
    tipo: String(tipo || 'stdout'),
    mensagem: texto,
    timestamp: new Date().toISOString()
  };

  logs.push(log);
  limitarLogs(logs);

  persistirLog(id, log);
}

function obterLogsBot(idBot) {
  const id = validarIdBot(idBot);

  return [
    ...carregarLogsBot(id)
  ];
}

function limparLogsBot(idBot) {
  const id = validarIdBot(idBot);
  const logs = obterMemoria(id);

  logs.length = 0;

  try {
    garantirDiretorioLogs();

    fs.writeFileSync(
      obterArquivoLog(id),
      '',
      'utf8'
    );

    return {
      sucesso: true,
      mensagem: `Logs do bot ${id} limpos.`
    };
  } catch (erro) {
    return {
      sucesso: false,
      mensagem:
        'Logs limpos da memória, mas o arquivo não pôde ser limpo.'
    };
  }
}

/*
 * Compatibilidade temporária com o RAVEX-HOST V1.
 * Essas funções serão removidas depois que todas as rotas
 * estiverem usando IDs de bots.
 */
function adicionarLog(tipo, mensagem) {
  return adicionarLogBot(
    ID_LEGADO,
    tipo,
    mensagem
  );
}

function obterLogs() {
  return obterLogsBot(ID_LEGADO);
}

function limparLogs() {
  return limparLogsBot(ID_LEGADO);
}

module.exports = {
  adicionarLogBot,
  obterLogsBot,
  limparLogsBot,

  adicionarLog,
  obterLogs,
  limparLogs
};
