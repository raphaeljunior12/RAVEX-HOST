const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const {
  obterBot
} = require('./registroBots');

const {
  adicionarLogBot
} = require('./logsBot');

function executar(
  comando,
  argumentos,
  opcoes = {}
) {
  return new Promise((resolve, reject) => {
    const processo = spawn(
      comando,
      argumentos,
      {
        cwd: opcoes.cwd,
        env: process.env,
        shell: false
      }
    );

    let stdout = '';
    let stderr = '';

    processo.stdout.on('data', dados => {
      stdout += dados.toString();
    });

    processo.stderr.on('data', dados => {
      stderr += dados.toString();
    });

    processo.on('error', reject);

    processo.on('close', codigo => {
      if (codigo === 0) {
        resolve({
          stdout,
          stderr
        });
        return;
      }

      const erro = new Error(
        stderr.trim() ||
        stdout.trim() ||
        `Processo terminou com código ${codigo}.`
      );

      erro.codigoSaida = codigo;
      reject(erro);
    });
  });
}

async function instalarDependencias(diretorio) {
  const packageJson = path.join(
    diretorio,
    'package.json'
  );

  if (!fs.existsSync(packageJson)) {
    throw new Error(
      'PACKAGE_JSON_NAO_ENCONTRADO'
    );
  }

  const lock = path.join(
    diretorio,
    'package-lock.json'
  );

  const argumentos = fs.existsSync(lock)
    ? ['ci']
    : ['install'];

  if (process.platform === 'android') {
    argumentos.push('--no-bin-links');
  }

  argumentos.push(
    '--no-audit',
    '--no-fund'
  );

  await executar(
    'npm',
    argumentos,
    {
      cwd: diretorio
    }
  );
}

async function atualizarBotGit(idBot) {
  const bot = obterBot(idBot);

  if (!bot) {
    throw new Error('BOT_NAO_ENCONTRADO');
  }

  if (!bot.repositorio) {
    throw new Error('BOT_SEM_REPOSITORIO');
  }

  const diretorio = path.resolve(
    bot.diretorio
  );

  if (!fs.existsSync(diretorio)) {
    throw new Error(
      'DIRETORIO_NAO_ENCONTRADO'
    );
  }

  const pastaGit = path.join(
    diretorio,
    '.git'
  );

  if (!fs.existsSync(pastaGit)) {
    throw new Error(
      'REPOSITORIO_GIT_NAO_ENCONTRADO'
    );
  }

  adicionarLogBot(
    bot.id,
    'sistema',
    `Atualização Git de ${bot.nome} iniciada.`
  );

  const resultadoGit = await executar(
    'git',
    [
      'pull',
      '--ff-only',
      'origin',
      bot.branch
    ],
    {
      cwd: diretorio
    }
  );

  const saidaGit = [
    resultadoGit.stdout,
    resultadoGit.stderr
  ]
    .join('\n')
    .trim();

  if (saidaGit) {
    adicionarLogBot(
      bot.id,
      'sistema',
      saidaGit
    );
  }

  await instalarDependencias(diretorio);

  adicionarLogBot(
    bot.id,
    'sistema',
    `${bot.nome} atualizado com sucesso.`
  );

  return {
    sucesso: true,
    mensagem:
      `${bot.nome} atualizado com sucesso.`,
    bot
  };
}

module.exports = {
  atualizarBotGit
};
