const crypto = require('crypto');

const {
  validarCodigoLicenca
} = require('./codigosLicenca');

const DURACAO_CADASTRO_MS =
  10 * 60 * 1000;

const pendentes = new Map();

function normalizarEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function limparExpirados() {
  const agora = Date.now();

  for (const [id, cadastro] of pendentes) {
    if (agora >= cadastro.expiraEm) {
      pendentes.delete(id);
    }
  }
}

function criarCadastroPendente({
  nome,
  username,
  email,
  senha,
  confirmarSenha,
  codigo
}) {
  limparExpirados();

  const senhaRecebida =
    String(senha || '');

  const confirmacao =
    String(confirmarSenha || '');

  const codigoRecebido =
    String(codigo || '').trim();

  const emailNormalizado =
    normalizarEmail(email);

  if (senhaRecebida !== confirmacao) {
    throw new Error(
      'SENHAS_DIFERENTES'
    );
  }

  if (!codigoRecebido) {
    throw new Error(
      'CODIGO_OBRIGATORIO'
    );
  }

  /*
   * Apenas valida.
   * NÃO consome o código de licença.
   */
  if (
    !validarCodigoLicenca(
      codigoRecebido
    )
  ) {
    throw new Error(
      'CODIGO_INVALIDO_OU_ESGOTADO'
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      emailNormalizado
    )
  ) {
    throw new Error('EMAIL_INVALIDO');
  }

  const id =
    crypto.randomBytes(24)
      .toString('hex');

  /*
   * Este cadastro é temporário e existe
   * somente na memória do processo.
   */
  pendentes.set(id, {
    id,

    nome,
    username,
    email: emailNormalizado,

    senha: senhaRecebida,
    confirmarSenha: confirmacao,

    codigo: codigoRecebido,

    criadoEm: Date.now(),

    expiraEm:
      Date.now() +
      DURACAO_CADASTRO_MS
  });

  return {
    id,
    email: emailNormalizado,
    expiraEm:
      Date.now() +
      DURACAO_CADASTRO_MS
  };
}

function obterCadastroPendente(id) {
  limparExpirados();

  const chave =
    String(id || '').trim();

  if (!chave) {
    return null;
  }

  return pendentes.get(chave) || null;
}

function removerCadastroPendente(id) {
  return pendentes.delete(
    String(id || '').trim()
  );
}

module.exports = {
  criarCadastroPendente,
  obterCadastroPendente,
  removerCadastroPendente,
  DURACAO_CADASTRO_MS
};
