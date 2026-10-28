const crypto = require('crypto');

function obterCredenciais() {
  return {
    usuario: String(process.env.RAVEX_HOST_USUARIO || ''),
    senha: String(process.env.RAVEX_HOST_SENHA || '')
  };
}

function compararSeguro(valorRecebido, valorEsperado) {
  const recebido = Buffer.from(String(valorRecebido || ''), 'utf8');
  const esperado = Buffer.from(String(valorEsperado || ''), 'utf8');

  if (recebido.length !== esperado.length) {
    return false;
  }

  return crypto.timingSafeEqual(recebido, esperado);
}

function autenticar(usuario, senha) {
  const credenciais = obterCredenciais();

  if (!credenciais.usuario || !credenciais.senha) {
    return false;
  }

  return (
    compararSeguro(usuario, credenciais.usuario) &&
    compararSeguro(senha, credenciais.senha)
  );
}

module.exports = {
  autenticar
};
