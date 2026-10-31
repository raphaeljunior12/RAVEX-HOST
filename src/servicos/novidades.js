const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO = path.join(
  __dirname,
  '../../dados/novidades.json'
);

function garantirArquivo() {
  const pasta = path.dirname(ARQUIVO);

  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, {
      recursive: true
    });
  }

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(
      ARQUIVO,
      JSON.stringify(
        {
          novidades: []
        },
        null,
        2
      )
    );
  }
}

function lerDados() {
  garantirArquivo();

  try {
    const dados = JSON.parse(
      fs.readFileSync(
        ARQUIVO,
        'utf8'
      )
    );

    if (!Array.isArray(dados.novidades)) {
      dados.novidades = [];
    }

    return dados;
  } catch {
    return {
      novidades: []
    };
  }
}

function salvarDados(dados) {
  garantirArquivo();

  const temporario =
    `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    temporario,
    JSON.stringify(
      dados,
      null,
      2
    )
  );

  fs.renameSync(
    temporario,
    ARQUIVO
  );
}

function texto(valor, limite) {
  return String(valor || '')
    .trim()
    .slice(0, limite);
}

function listarNovidades({
  incluirOcultas = false
} = {}) {
  const dados = lerDados();

  return dados.novidades
    .filter(item =>
      incluirOcultas ||
      item.publicada === true
    )
    .sort((a, b) =>
      new Date(b.criadaEm) -
      new Date(a.criadaEm)
    );
}

function criarNovidade({
  titulo,
  conteudo,
  tipo = 'novidade',
  importante = false,
  publicada = true
}) {
  const tituloLimpo =
    texto(titulo, 120);

  const conteudoLimpo =
    texto(conteudo, 5000);

  if (tituloLimpo.length < 3) {
    throw new Error(
      'TITULO_NOVIDADE_INVALIDO'
    );
  }

  if (conteudoLimpo.length < 3) {
    throw new Error(
      'CONTEUDO_NOVIDADE_INVALIDO'
    );
  }

  const tiposPermitidos = [
    'novidade',
    'atualizacao',
    'manutencao',
    'aviso',
    'seguranca'
  ];

  const tipoFinal =
    tiposPermitidos.includes(tipo)
      ? tipo
      : 'novidade';

  const agora =
    new Date().toISOString();

  const novidade = {
    id:
      'RVX-NOV-' +
      crypto.randomBytes(6)
        .toString('hex')
        .toUpperCase(),

    titulo: tituloLimpo,
    conteudo: conteudoLimpo,
    tipo: tipoFinal,

    importante:
      importante === true,

    publicada:
      publicada !== false,

    criadaEm: agora,
    atualizadaEm: agora
  };

  const dados = lerDados();

  dados.novidades.push(
    novidade
  );

  salvarDados(dados);

  return novidade;
}

function atualizarNovidade(
  id,
  alteracoes = {}
) {
  const dados = lerDados();

  const novidade =
    dados.novidades.find(
      item => item.id === id
    );

  if (!novidade) {
    throw new Error(
      'NOVIDADE_NAO_ENCONTRADA'
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      alteracoes,
      'titulo'
    )
  ) {
    const titulo =
      texto(alteracoes.titulo, 120);

    if (titulo.length < 3) {
      throw new Error(
        'TITULO_NOVIDADE_INVALIDO'
      );
    }

    novidade.titulo = titulo;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      alteracoes,
      'conteudo'
    )
  ) {
    const conteudo =
      texto(
        alteracoes.conteudo,
        5000
      );

    if (conteudo.length < 3) {
      throw new Error(
        'CONTEUDO_NOVIDADE_INVALIDO'
      );
    }

    novidade.conteudo =
      conteudo;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      alteracoes,
      'importante'
    )
  ) {
    novidade.importante =
      alteracoes.importante === true;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      alteracoes,
      'publicada'
    )
  ) {
    novidade.publicada =
      alteracoes.publicada === true;
  }

  novidade.atualizadaEm =
    new Date().toISOString();

  salvarDados(dados);

  return novidade;
}

function removerNovidade(id) {
  const dados = lerDados();

  const indice =
    dados.novidades.findIndex(
      item => item.id === id
    );

  if (indice === -1) {
    throw new Error(
      'NOVIDADE_NAO_ENCONTRADA'
    );
  }

  const [removida] =
    dados.novidades.splice(
      indice,
      1
    );

  salvarDados(dados);

  return removida;
}

module.exports = {
  listarNovidades,
  criarNovidade,
  atualizarNovidade,
  removerNovidade
};
