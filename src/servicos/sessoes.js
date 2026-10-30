const crypto = require('crypto');

const DURACAO_SESSAO_MS = 24 * 60 * 60 * 1000;
const sessoes = new Map();

function criarSessao({
  contaId = null,
  tipo = 'usuario'
} = {}) {
  const token = crypto
    .randomBytes(32)
    .toString('hex');

  const criadaEm = Date.now();
  const expiraEm =
    criadaEm + DURACAO_SESSAO_MS;

  const sessao = {
    contaId:
      contaId === null
        ? null
        : String(contaId),

    tipo: String(tipo || 'usuario'),

    criadaEm,
    expiraEm
  };

  sessoes.set(token, sessao);

  return {
    token,
    ...sessao
  };
}

function obterSessao(token) {
  if (!token) {
    return null;
  }

  const sessao = sessoes.get(token);

  if (!sessao) {
    return null;
  }

  if (sessao.expiraEm <= Date.now()) {
    sessoes.delete(token);
    return null;
  }

  return {
    ...sessao
  };
}

function destruirSessao(token) {
  if (!token) {
    return false;
  }

  return sessoes.delete(token);
}

function limparSessoesExpiradas() {
  const agora = Date.now();

  for (const [token, sessao] of sessoes) {
    if (sessao.expiraEm <= agora) {
      sessoes.delete(token);
    }
  }
}

const intervaloLimpeza = setInterval(
  limparSessoesExpiradas,
  60 * 60 * 1000
);

intervaloLimpeza.unref();

module.exports = {
  DURACAO_SESSAO_MS,
  criarSessao,
  obterSessao,
  destruirSessao
};
