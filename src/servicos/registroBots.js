const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIRETORIO_DADOS = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'bots'
);

const ARQUIVO_REGISTRO = path.join(
  DIRETORIO_DADOS,
  'registro.json'
);

function garantirEstrutura() {
  fs.mkdirSync(DIRETORIO_DADOS, {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO_REGISTRO)) {
    fs.writeFileSync(
      ARQUIVO_REGISTRO,
      '[]\n',
      'utf8'
    );
  }
}

function lerRegistro() {
  garantirEstrutura();

  try {
    const conteudo = fs.readFileSync(
      ARQUIVO_REGISTRO,
      'utf8'
    );

    const dados = JSON.parse(conteudo);

    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error(
      '❌ Erro ao ler registro de bots:',
      erro.message
    );

    return [];
  }
}

function salvarRegistro(bots) {
  garantirEstrutura();

  const temporario = `${ARQUIVO_REGISTRO}.tmp`;

  fs.writeFileSync(
    temporario,
    `${JSON.stringify(bots, null, 2)}\n`,
    'utf8'
  );

  fs.renameSync(
    temporario,
    ARQUIVO_REGISTRO
  );
}

function normalizarNome(nome) {
  return String(nome || '').trim();
}

function validarNome(nome) {
  return (
    nome.length >= 1 &&
    nome.length <= 60
  );
}

function validarArquivoInicial(arquivo) {
  const valor = String(arquivo || '').trim();

  if (!valor || valor.length > 120) {
    return false;
  }

  if (path.isAbsolute(valor)) {
    return false;
  }

  const normalizado = path.normalize(valor);

  return (
    normalizado !== '..' &&
    !normalizado.startsWith(`..${path.sep}`)
  );
}

function validarBranch(branch) {
  const valor = String(branch || '').trim();

  return (
    valor.length >= 1 &&
    valor.length <= 120 &&
    !valor.includes('..') &&
    !valor.includes(' ') &&
    !valor.startsWith('-')
  );
}

function validarRepositorio(repositorio) {
  if (!repositorio) {
    return true;
  }

  const valor = String(repositorio).trim();

  if (valor.length > 500) {
    return false;
  }

  return (
    /^https:\/\/[^\s]+$/i.test(valor) ||
    /^git@[^\s:]+:[^\s]+$/i.test(valor)
  );
}

function criarId() {
  return crypto
    .randomBytes(8)
    .toString('hex');
}

function listarBots() {
  return lerRegistro();
}

function obterBot(id) {
  const identificador = String(id || '');

  return (
    lerRegistro().find(
      bot => bot.id === identificador
    ) || null
  );
}

function adicionarBot(dados = {}) {
  const bots = lerRegistro();

  const nome = normalizarNome(dados.nome);
  const diretorio = path.resolve(
    String(dados.diretorio || '')
  );
  const arquivoInicial = String(
    dados.arquivoInicial || 'iniciar.js'
  ).trim();
  const repositorio = String(
    dados.repositorio || ''
  ).trim();
  const branch = String(
    dados.branch || 'main'
  ).trim();

  if (!validarNome(nome)) {
    throw new Error('NOME_INVALIDO');
  }

  if (!dados.diretorio) {
    throw new Error('DIRETORIO_INVALIDO');
  }

  if (!validarArquivoInicial(arquivoInicial)) {
    throw new Error('ARQUIVO_INICIAL_INVALIDO');
  }

  if (!validarRepositorio(repositorio)) {
    throw new Error('REPOSITORIO_INVALIDO');
  }

  if (!validarBranch(branch)) {
    throw new Error('BRANCH_INVALIDA');
  }

  const duplicado = bots.some(
    bot =>
      bot.nome.toLowerCase() === nome.toLowerCase() ||
      path.resolve(bot.diretorio) === diretorio
  );

  if (duplicado) {
    throw new Error('BOT_DUPLICADO');
  }

  const agora = new Date().toISOString();

  const bot = {
    id: criarId(),
    nome,
    diretorio,
    arquivoInicial,
    repositorio: repositorio || null,
    branch,
    criadoEm: agora,
    atualizadoEm: agora
  };

  bots.push(bot);
  salvarRegistro(bots);

  return bot;
}

function atualizarBot(id, alteracoes = {}) {
  const bots = lerRegistro();
  const indice = bots.findIndex(
    bot => bot.id === String(id || '')
  );

  if (indice === -1) {
    throw new Error('BOT_NAO_ENCONTRADO');
  }

  const atual = bots[indice];

  const nome =
    alteracoes.nome === undefined
      ? atual.nome
      : normalizarNome(alteracoes.nome);

  const arquivoInicial =
    alteracoes.arquivoInicial === undefined
      ? atual.arquivoInicial
      : String(alteracoes.arquivoInicial).trim();

  const repositorio =
    alteracoes.repositorio === undefined
      ? atual.repositorio
      : String(alteracoes.repositorio || '').trim();

  const branch =
    alteracoes.branch === undefined
      ? atual.branch
      : String(alteracoes.branch).trim();

  if (!validarNome(nome)) {
    throw new Error('NOME_INVALIDO');
  }

  if (!validarArquivoInicial(arquivoInicial)) {
    throw new Error('ARQUIVO_INICIAL_INVALIDO');
  }

  if (!validarRepositorio(repositorio)) {
    throw new Error('REPOSITORIO_INVALIDO');
  }

  if (!validarBranch(branch)) {
    throw new Error('BRANCH_INVALIDA');
  }

  const nomeDuplicado = bots.some(
    (bot, i) =>
      i !== indice &&
      bot.nome.toLowerCase() === nome.toLowerCase()
  );

  if (nomeDuplicado) {
    throw new Error('BOT_DUPLICADO');
  }

  bots[indice] = {
    ...atual,
    nome,
    arquivoInicial,
    repositorio: repositorio || null,
    branch,
    atualizadoEm: new Date().toISOString()
  };

  salvarRegistro(bots);

  return bots[indice];
}

function removerBot(id) {
  const bots = lerRegistro();
  const indice = bots.findIndex(
    bot => bot.id === String(id || '')
  );

  if (indice === -1) {
    throw new Error('BOT_NAO_ENCONTRADO');
  }

  const [removido] = bots.splice(indice, 1);

  salvarRegistro(bots);

  return removido;
}

module.exports = {
  DIRETORIO_DADOS,
  listarBots,
  obterBot,
  adicionarBot,
  atualizarBot,
  removerBot
};
