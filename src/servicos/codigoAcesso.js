const crypto = require('crypto');

const DURACAO_CODIGO_MS = 5 * 60 * 1000;
const MAX_TENTATIVAS = 5;

const codigos = new Map();

function normalizarEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function obterEmailProprietario() {
  return normalizarEmail(
    process.env.RAVEX_HOST_OWNER_EMAIL
  );
}

function normalizarNumero(numero) {
  return String(numero || '')
    .replace(/\D/g, '');
}

function obterNumeroProprietario() {
  return normalizarNumero(
    process.env.RAVEX_HOST_OWNER_PHONE
  );
}

function numeroAutorizado(numero) {
  const recebido = normalizarNumero(numero);
  const proprietario =
    obterNumeroProprietario();

  return Boolean(
    proprietario &&
    recebido &&
    recebido === proprietario
  );
}

function emailAutorizado(email) {
  const recebido = normalizarEmail(email);
  const proprietario = obterEmailProprietario();

  return Boolean(
    proprietario &&
    recebido &&
    recebido === proprietario
  );
}

function gerarCodigo(email) {
  const emailNormalizado = normalizarEmail(email);

  if (!emailAutorizado(emailNormalizado)) {
    return null;
  }

  const codigo = String(
    crypto.randomInt(0, 1000000)
  ).padStart(6, '0');

  const hash = crypto
    .createHash('sha256')
    .update(codigo)
    .digest('hex');

  codigos.set(emailNormalizado, {
    hash,
    criadoEm: Date.now(),
    expiraEm: Date.now() + DURACAO_CODIGO_MS,
    tentativas: 0
  });

  return codigo;
}

function verificarCodigo(email, codigo) {
  const emailNormalizado = normalizarEmail(email);

  if (!emailAutorizado(emailNormalizado)) {
    return false;
  }

  const registro = codigos.get(emailNormalizado);

  if (!registro) {
    return false;
  }

  if (Date.now() >= registro.expiraEm) {
    codigos.delete(emailNormalizado);
    return false;
  }

  registro.tentativas += 1;

  if (registro.tentativas > MAX_TENTATIVAS) {
    codigos.delete(emailNormalizado);
    return false;
  }

  const codigoRecebido = String(codigo || '').trim();

  if (!/^\d{6}$/.test(codigoRecebido)) {
    return false;
  }

  const hashRecebido = crypto
    .createHash('sha256')
    .update(codigoRecebido)
    .digest();

  const hashCorreto = Buffer.from(
    registro.hash,
    'hex'
  );

  const valido =
    hashRecebido.length === hashCorreto.length &&
    crypto.timingSafeEqual(
      hashRecebido,
      hashCorreto
    );

  if (valido) {
    codigos.delete(emailNormalizado);
  }

  return valido;
}

function invalidarCodigo(email) {
  return codigos.delete(
    normalizarEmail(email)
  );
}

module.exports = {
  emailAutorizado,
  numeroAutorizado,
  gerarCodigo,
  verificarCodigo,
  invalidarCodigo,
  DURACAO_CODIGO_MS,
  MAX_TENTATIVAS
};
