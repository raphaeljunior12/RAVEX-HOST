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

const ARQUIVO_LOGS = path.join(
  DIRETORIO_LOGS,
  'ravex-bot.log'
);

const logs = [];

function garantirDiretorioLogs() {
  fs.mkdirSync(DIRETORIO_LOGS, {
    recursive: true
  });
}

function limitarLogs() {
  if (logs.length > LIMITE_LOGS) {
    logs.splice(0, logs.length - LIMITE_LOGS);
  }
}

function carregarLogs() {
  garantirDiretorioLogs();

  try {
    if (!fs.existsSync(ARQUIVO_LOGS)) {
      return;
    }

    const conteudo = fs.readFileSync(
      ARQUIVO_LOGS,
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
        // Ignora linhas inválidas sem derrubar o HOST.
      }
    }

    limitarLogs();
  } catch (erro) {
    console.error(
      '❌ Erro ao carregar logs do RAVEX-BOT:',
      erro.message
    );
  }
}

function persistirLog(log) {
  try {
    garantirDiretorioLogs();

    fs.appendFileSync(
      ARQUIVO_LOGS,
      `${JSON.stringify(log)}\n`,
      'utf8'
    );

    const conteudo = fs.readFileSync(
      ARQUIVO_LOGS,
      'utf8'
    );

    const quantidadeLinhas = conteudo
      .split('\n')
      .filter(Boolean)
      .length;

    if (quantidadeLinhas > LIMITE_LOGS) {
      const conteudoCompactado = logs
        .map(item => JSON.stringify(item))
        .join('\n');

      fs.writeFileSync(
        ARQUIVO_LOGS,
        conteudoCompactado
          ? `${conteudoCompactado}\n`
          : '',
        'utf8'
      );
    }
  } catch (erro) {
    console.error(
      '❌ Erro ao salvar log do RAVEX-BOT:',
      erro.message
    );
  }
}

function adicionarLog(tipo, mensagem) {
  const texto = String(mensagem || '').trim();

  if (!texto) {
    return;
  }

  const log = {
    tipo: String(tipo || 'stdout'),
    mensagem: texto,
    timestamp: new Date().toISOString()
  };

  logs.push(log);
  limitarLogs();
  persistirLog(log);
}

function obterLogs() {
  return [...logs];
}

function limparLogs() {
  logs.length = 0;

  try {
    garantirDiretorioLogs();

    fs.writeFileSync(
      ARQUIVO_LOGS,
      '',
      'utf8'
    );

    return {
      sucesso: true,
      mensagem: 'Logs do RAVEX-BOT limpos.'
    };
  } catch (erro) {
    return {
      sucesso: false,
      mensagem:
        'Logs limpos da memória, mas o arquivo não pôde ser limpo.'
    };
  }
}

carregarLogs();

module.exports = {
  adicionarLog,
  obterLogs,
  limparLogs
};
