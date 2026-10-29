const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const {
  DIRETORIO_DADOS,
  adicionarBot
} = require('./registroBots');

const DIRETORIO_APPS = path.join(
  DIRETORIO_DADOS,
  'apps'
);

function executar(comando, argumentos, opcoes = {}) {
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

function criarSlug(nome) {
  const slug = String(nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  if (!slug) {
    throw new Error('NOME_INVALIDO');
  }

  return slug;
}

function lerPackageJson(diretorio) {
  const arquivo = path.join(
    diretorio,
    'package.json'
  );

  if (!fs.existsSync(arquivo)) {
    throw new Error('PACKAGE_JSON_NAO_ENCONTRADO');
  }

  try {
    return JSON.parse(
      fs.readFileSync(arquivo, 'utf8')
    );
  } catch {
    throw new Error('PACKAGE_JSON_INVALIDO');
  }
}

function detectarArquivoInicial(packageJson) {
  const principal = String(
    packageJson.main || ''
  ).trim();

  if (principal) {
    return principal;
  }

  return 'iniciar.js';
}

async function instalarDependencias(diretorio) {
  const packageJson = path.join(
    diretorio,
    'package.json'
  );

  if (!fs.existsSync(packageJson)) {
    return;
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

function adicionarPorDiretorio(dados = {}) {
  const nome = String(
    dados.nome || ''
  ).trim();

  const entradaDiretorio = String(
    dados.diretorio || ''
  ).trim();

  if (!entradaDiretorio) {
    throw new Error('DIRETORIO_INVALIDO');
  }

  const diretorio = path.resolve(
    entradaDiretorio
  );

  if (!fs.existsSync(diretorio)) {
    throw new Error('DIRETORIO_NAO_ENCONTRADO');
  }

  const estatisticas = fs.statSync(diretorio);

  if (!estatisticas.isDirectory()) {
    throw new Error('DIRETORIO_INVALIDO');
  }

  const packageJson =
    lerPackageJson(diretorio);

  const arquivoInicial =
    detectarArquivoInicial(packageJson);

  const caminhoInicial = path.resolve(
    diretorio,
    arquivoInicial
  );

  const raiz =
    `${path.resolve(diretorio)}${path.sep}`;

  if (
    caminhoInicial !== path.resolve(diretorio) &&
    !caminhoInicial.startsWith(raiz)
  ) {
    throw new Error(
      'ARQUIVO_INICIAL_INVALIDO'
    );
  }

  if (!fs.existsSync(caminhoInicial)) {
    throw new Error(
      'ARQUIVO_INICIAL_NAO_ENCONTRADO'
    );
  }

  return adicionarBot({
    nome,
    diretorio,
    arquivoInicial,
    repositorio: null,
    branch: 'main'
  });
}

async function adicionarPorRepositorio(dados = {}) {
  const nome = String(
    dados.nome || ''
  ).trim();

  const repositorio = String(
    dados.repositorio || ''
  ).trim();

  const branch = String(
    dados.branch || 'main'
  ).trim();

  if (
    !/^https:\/\/[^\s]+$/i.test(repositorio) &&
    !/^git@[^\s:]+:[^\s]+$/i.test(repositorio)
  ) {
    throw new Error('REPOSITORIO_INVALIDO');
  }

  fs.mkdirSync(
    DIRETORIO_APPS,
    {
      recursive: true
    }
  );

  const slug = criarSlug(nome);

  const diretorio = path.join(
    DIRETORIO_APPS,
    slug
  );

  if (fs.existsSync(diretorio)) {
    throw new Error('DIRETORIO_JA_EXISTE');
  }

  try {
    await executar(
      'git',
      [
        'clone',
        '--depth',
        '1',
        '--branch',
        branch,
        '--',
        repositorio,
        diretorio
      ]
    );

    const packageJson =
      lerPackageJson(diretorio);

    const arquivoInicial =
      detectarArquivoInicial(packageJson);

    const caminhoInicial = path.resolve(
      diretorio,
      arquivoInicial
    );

    const raiz = `${path.resolve(diretorio)}${path.sep}`;

    if (
      caminhoInicial !== path.resolve(diretorio) &&
      !caminhoInicial.startsWith(raiz)
    ) {
      throw new Error(
        'ARQUIVO_INICIAL_INVALIDO'
      );
    }

    if (!fs.existsSync(caminhoInicial)) {
      throw new Error(
        'ARQUIVO_INICIAL_NAO_ENCONTRADO'
      );
    }

    await instalarDependencias(diretorio);

    return adicionarBot({
      nome,
      diretorio,
      arquivoInicial,
      repositorio,
      branch
    });
  } catch (erro) {
    fs.rmSync(
      diretorio,
      {
        recursive: true,
        force: true
      }
    );

    throw erro;
  }
}

module.exports = {
  DIRETORIO_APPS,
  adicionarPorDiretorio,
  adicionarPorRepositorio
};
