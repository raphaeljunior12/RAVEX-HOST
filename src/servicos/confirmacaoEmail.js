const crypto = require('crypto');

const DURACAO_CODIGO_EMAIL_MS =
  5 * 60 * 1000;

const MAX_TENTATIVAS_EMAIL = 5;

const confirmacoes = new Map();

function normalizarEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizarEmail(email)
  );
}

function criarHash(valor) {
  return crypto
    .createHash('sha256')
    .update(String(valor))
    .digest('hex');
}

function gerarCodigoConfirmacao(email) {
  const emailNormalizado =
    normalizarEmail(email);

  if (!emailValido(emailNormalizado)) {
    throw new Error('EMAIL_INVALIDO');
  }

  const codigo = String(
    crypto.randomInt(0, 1000000)
  ).padStart(6, '0');

  confirmacoes.set(emailNormalizado, {
    hash: criarHash(codigo),
    criadoEm: Date.now(),
    expiraEm:
      Date.now() +
      DURACAO_CODIGO_EMAIL_MS,
    tentativas: 0
  });

  return {
    codigo,
    expiraEm:
      Date.now() +
      DURACAO_CODIGO_EMAIL_MS
  };
}

function verificarCodigoConfirmacao(
  email,
  codigo
) {
  const emailNormalizado =
    normalizarEmail(email);

  const registro =
    confirmacoes.get(emailNormalizado);

  if (!registro) {
    return false;
  }

  if (Date.now() >= registro.expiraEm) {
    confirmacoes.delete(emailNormalizado);
    return false;
  }

  registro.tentativas += 1;

  if (
    registro.tentativas >
    MAX_TENTATIVAS_EMAIL
  ) {
    confirmacoes.delete(emailNormalizado);
    return false;
  }

  const recebido =
    String(codigo || '').trim();

  if (!/^\d{6}$/.test(recebido)) {
    return false;
  }

  const hashRecebido = Buffer.from(
    criarHash(recebido),
    'hex'
  );

  const hashCorreto = Buffer.from(
    registro.hash,
    'hex'
  );

  const valido =
    hashRecebido.length ===
      hashCorreto.length &&
    crypto.timingSafeEqual(
      hashRecebido,
      hashCorreto
    );

  if (valido) {
    confirmacoes.delete(emailNormalizado);
  }

  return valido;
}

function invalidarConfirmacaoEmail(email) {
  return confirmacoes.delete(
    normalizarEmail(email)
  );
}

module.exports = {
  gerarCodigoConfirmacao,
  verificarCodigoConfirmacao,
  invalidarConfirmacaoEmail,
  DURACAO_CODIGO_EMAIL_MS,
  MAX_TENTATIVAS_EMAIL
};
