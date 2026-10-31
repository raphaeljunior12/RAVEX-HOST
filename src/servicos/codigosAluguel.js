const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ARQUIVO = path.resolve(
  __dirname,
  '..',
  '..',
  'dados',
  'codigos',
  'aluguel.json'
);

function garantir() {
  fs.mkdirSync(path.dirname(ARQUIVO), {
    recursive: true
  });

  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(
      ARQUIVO,
      '[]\n',
      'utf8'
    );
  }
}

function listar() {
  garantir();

  try {
    const dados = JSON.parse(
      fs.readFileSync(ARQUIVO, 'utf8')
    );

    return Array.isArray(dados)
      ? dados
      : [];
  } catch {
    return [];
  }
}

function salvar(dados) {
  garantir();

  const tmp = `${ARQUIVO}.tmp`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(dados, null, 2) + '\n',
    'utf8'
  );

  fs.renameSync(tmp, ARQUIVO);
}

function hash(codigo) {
  return crypto
    .createHash('sha256')
    .update(
      String(codigo || '')
        .trim()
        .toUpperCase()
    )
    .digest('hex');
}

function gerarCodigoAluguel({
  validadeMinutos = 60
} = {}) {
  const minutos =
    Number(validadeMinutos);

  if (
    !Number.isInteger(minutos) ||
    minutos < 5 ||
    minutos > 10080
  ) {
    throw new Error(
      'VALIDADE_INVALIDA'
    );
  }

  const codigo =
    `RAVEX-ALUGUEL-${
      crypto
        .randomBytes(5)
        .toString('hex')
        .toUpperCase()
    }`;

  const agora = Date.now();

  const registro = {
    id: crypto.randomUUID(),
    hash: hash(codigo),
    usado: false,
    usadoPor: null,
    criadoEm:
      new Date(agora).toISOString(),
    expiraEm:
      new Date(
        agora + minutos * 60000
      ).toISOString(),
    usadoEm: null
  };

  const dados = listar();
  dados.push(registro);
  salvar(dados);

  return {
    codigo,
    expiraEm: registro.expiraEm
  };
}

function consumirCodigoAluguel({
  codigo,
  contaId
}) {
  const dados = listar();
  const codigoHash = hash(codigo);

  const indice = dados.findIndex(
    item => item.hash === codigoHash
  );

  if (indice === -1) {
    throw new Error('CODIGO_INVALIDO');
  }

  const registro = dados[indice];

  if (registro.usado) {
    throw new Error('CODIGO_JA_USADO');
  }

  if (
    Date.parse(registro.expiraEm) <=
    Date.now()
  ) {
    throw new Error('CODIGO_EXPIRADO');
  }

  registro.usado = true;
  registro.usadoPor =
    String(contaId);
  registro.usadoEm =
    new Date().toISOString();

  dados[indice] = registro;
  salvar(dados);

  return {
    sucesso: true,
    id: registro.id
  };
}


function validarConfirmacaoAluguel({
  confirmacaoId,
  contaId
}) {
  const registro = listar().find(
    item =>
      item.id === String(confirmacaoId)
  );

  if (!registro) {
    return false;
  }

  if (!registro.usado) {
    return false;
  }

  if (
    String(registro.usadoPor) !==
    String(contaId)
  ) {
    return false;
  }

  return true;
}

module.exports = {
  gerarCodigoAluguel,
  consumirCodigoAluguel,
  validarConfirmacaoAluguel
};
